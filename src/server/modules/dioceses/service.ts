import { prisma } from "@/server/db/prisma";
import {
  withTenantContext,
  withOwnMembershipLookup,
  withDioceseContext,
} from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import type { DioceseRole } from "@prisma/client";
import { slugify } from "@/server/shared/slug";

/**
 * Diocese: o nível acima da paróquia.
 *
 * COMO O BISPO LÊ VÁRIAS PARÓQUIAS SEM AFROUXAR O ISOLAMENTO
 *
 * O RLS deste app isola por UMA paróquia de cada vez
 * (app.current_parish_id). Havia dois caminhos para dar ao bispo uma visão
 * da diocese inteira:
 *
 *   (A) somar uma cláusula de diocese às ~25 políticas de RLS;
 *   (B) iterar as paróquias da diocese, cada uma no seu próprio
 *       withTenantContext, e agregar aqui.
 *
 * Escolhemos (B). Com (A) — ou com withPlatformContext, que bypassa tudo —
 * um erro na checagem de autorização vira exposição total do banco. Com (B),
 * cada consulta continua sujeita ao RLS: ainda que a autorização falhe, o
 * alcance é apenas o conjunto de paróquias explicitamente passado adiante.
 *
 * O custo é N consultas para N paróquias. Para o painel diocesano (só
 * contagens) isso é aceitável na ordem de dezenas de paróquias. Se uma
 * diocese passar de algumas centenas, o caminho é materializar essas
 * contagens, não afrouxar o RLS.
 *
 * `dioceses` não tem RLS (é topo de hierarquia, como `parishes`), então a
 * leitura de diocese/paróquia em si usa o prisma direto.
 */

export type DioceseParishSummary = {
  parishId: string;
  parishName: string;
  city: string | null;
  state: string | null;
  memberCount: number;
  priestCount: number;
  upcomingEventCount: number;
};

export type DioceseOverview = {
  diocese: { id: string; name: string; state: string | null };
  parishes: DioceseParishSummary[];
  totals: { parishes: number; members: number; priests: number };
};

const PRIEST_ROLE_CODES = ["SACERDOTE", "PAROCO"] as const;

export function listDioceses() {
  return prisma.diocese.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { parishes: true, memberships: true } } },
  });
}

export function getDiocese(id: string) {
  return prisma.diocese.findUnique({ where: { id } });
}

export function listParishesInDiocese(dioceseId: string) {
  return prisma.parish.findMany({ where: { dioceseId }, orderBy: { name: "asc" } });
}

export function listParishesWithoutDiocese() {
  return prisma.parish.findMany({ where: { dioceseId: null }, orderBy: { name: "asc" } });
}

/** Vínculos diocesanos do próprio usuário — usado ao montar a sessão. */
export function listOwnDioceseMemberships(userId: string) {
  return withOwnMembershipLookup(userId, (tx) =>
    tx.dioceseMembership.findMany({
      where: { userId, status: "active" },
      include: { diocese: { select: { id: true, name: true, state: true } } },
    }),
  );
}

export async function createDiocese(input: { name: string; state?: string | null }) {
  const name = input.name.trim();
  if (!name) throw new ValidationError("Informe o nome da diocese.");

  const base = slugify(name);
  if (!base) throw new ValidationError("Nome da diocese inválido.");

  let slug = base;
  let attempt = 2;
  while (await prisma.diocese.findUnique({ where: { slug } })) {
    slug = `${base}-${attempt}`;
    attempt += 1;
  }

  return prisma.diocese.create({
    data: { name, slug, state: input.state?.trim()?.toUpperCase() || null },
  });
}

export async function setParishDiocese(parishId: string, dioceseId: string | null) {
  if (dioceseId) {
    const diocese = await prisma.diocese.findUnique({ where: { id: dioceseId } });
    if (!diocese) throw new ValidationError("Diocese não encontrada.");
  }
  return prisma.parish.update({ where: { id: parishId }, data: { dioceseId } });
}

/**
 * As três funções abaixo tocam `diocese_memberships`, que tem RLS: sem
 * contexto, a leitura volta vazia e a escrita é recusada. Por isso rodam em
 * withDioceseContext — que amarra a operação a ESTA diocese, em vez de
 * bypassar o RLS inteiro.
 */
export async function assignDioceseMember(
  dioceseId: string,
  email: string,
  role: DioceseRole,
) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    throw new ValidationError("Nenhuma conta com esse e-mail. A pessoa precisa se cadastrar antes.");
  }

  return withDioceseContext(dioceseId, (tx) =>
    tx.dioceseMembership.upsert({
      where: { userId_dioceseId: { userId: user.id, dioceseId } },
      update: { role, status: "active" },
      create: { userId: user.id, dioceseId, role, status: "active" },
    }),
  );
}

export function listDioceseMembers(dioceseId: string) {
  return withDioceseContext(dioceseId, (tx) =>
    tx.dioceseMembership.findMany({
      where: { dioceseId, status: "active" },
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
  );
}

export function removeDioceseMember(dioceseId: string, userId: string) {
  return withDioceseContext(dioceseId, (tx) =>
    tx.dioceseMembership.deleteMany({ where: { dioceseId, userId } }),
  );
}

/**
 * Painel da diocese. Cada contagem roda dentro do contexto de tenant da
 * própria paróquia — ver o racional no topo do arquivo sobre por que
 * iteramos em vez de bypassar o RLS.
 *
 * O CHAMADOR precisa ter autorizado o acesso antes (requireDioceseAccess):
 * esta função não checa permissão, só agrega.
 */
export async function getDioceseOverview(dioceseId: string): Promise<DioceseOverview | null> {
  const diocese = await getDiocese(dioceseId);
  if (!diocese) return null;

  const parishes = await listParishesInDiocese(dioceseId);
  const now = new Date();

  const summaries = await Promise.all(
    parishes.map(async (parish): Promise<DioceseParishSummary> => {
      const [memberCount, priestCount, upcomingEventCount] = await withTenantContext(
        parish.id,
        async (tx) =>
          Promise.all([
            tx.parishMembership.count({ where: { parishId: parish.id, status: "active" } }),
            tx.parishMembership.count({
              where: {
                parishId: parish.id,
                status: "active",
                role: { code: { in: [...PRIEST_ROLE_CODES] } },
              },
            }),
            tx.event.count({
              where: { parishId: parish.id, status: "published", startsAt: { gte: now } },
            }),
          ]),
      );

      return {
        parishId: parish.id,
        parishName: parish.name,
        city: parish.city,
        state: parish.state,
        memberCount,
        priestCount,
        upcomingEventCount,
      };
    }),
  );

  return {
    diocese: { id: diocese.id, name: diocese.name, state: diocese.state },
    parishes: summaries,
    totals: {
      parishes: summaries.length,
      members: summaries.reduce((sum, p) => sum + p.memberCount, 0),
      priests: summaries.reduce((sum, p) => sum + p.priestCount, 0),
    },
  };
}
