import { withTenantContext } from "@/server/db/tenant-context";
import { notifyUser } from "@/server/modules/notifications/service";
import { SACRAMENT_TYPE_LABELS } from "@/lib/caminhada-labels";
import { formatDateOnly } from "@/lib/date";
import type { RegisterMassParticipationInput, RegisterSacramentInput, RegisterConfessionInput } from "./schema";
import { nomeDoSacerdote } from "@/lib/sacerdote";

// ---- Missas e reflexão ------------------------------------------------

export function registerMassParticipation(
  input: RegisterMassParticipationInput & { parishId: string; userId: string },
) {
  return withTenantContext(input.parishId, (tx) =>
    tx.massParticipation.create({
      data: {
        parishId: input.parishId,
        userId: input.userId,
        participatedAt: input.participatedAt,
        reflectionText: input.reflectionText || null,
      },
    }),
  );
}

/** Só o próprio usuário lê a própria reflexão — nunca chamado com outro userId a partir de uma tela administrativa. */
export function listMyMassParticipations(parishId: string, userId: string, limit = 20) {
  return withTenantContext(parishId, (tx) =>
    tx.massParticipation.findMany({
      where: { parishId, userId },
      orderBy: { participatedAt: "desc" },
      take: limit,
    }),
  );
}

const MIN_AGGREGATE_SAMPLE = 5;

/**
 * Único caminho pelo qual a paróquia enxerga algo sobre reflexões — nunca
 * texto, nunca por pessoa. Abaixo do limiar mínimo, não retorna nada
 * utilizável (evita expor indivíduo por dedução numa comunidade pequena).
 * PRD seção 24.
 */
export type ReflectionAggregate =
  | { available: true; total: number; withReflection: number; rate: number }
  | { available: false; total: number };

export async function getReflectionAggregate(parishId: string, days = 30): Promise<ReflectionAggregate> {
  return withTenantContext(parishId, async (tx) => {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [total, withReflection] = await Promise.all([
      tx.massParticipation.count({ where: { parishId, participatedAt: { gte: since } } }),
      tx.massParticipation.count({
        where: { parishId, participatedAt: { gte: since }, reflectionText: { not: null } },
      }),
    ]);

    if (total < MIN_AGGREGATE_SAMPLE) {
      return { available: false, total };
    }
    return { available: true, total, withReflection, rate: Math.round((withReflection / total) * 100) };
  });
}

// ---- Sacramentos --------------------------------------------------------

export function registerSacrament(input: RegisterSacramentInput & { parishId: string; userId: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.sacrament.create({
      data: {
        parishId: input.parishId,
        userId: input.userId,
        type: input.type,
        date: input.date,
        location: input.location || null,
        priestProfileId: input.priestProfileId || null,
        note: input.note || null,
      },
    }),
  );
}

export function listMySacraments(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.sacrament.findMany({
      where: { parishId, userId },
      orderBy: { date: "desc" },
      include: { priestProfile: { include: { user: { select: { fullName: true } } } } },
    }),
  );
}

/** Todos os sacramentos da paróquia — tela de validação (pároco/secretaria). */
export function listSacramentsForValidation(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.sacrament.findMany({
      where: { parishId },
      orderBy: [{ status: "asc" }, { date: "desc" }],
      include: {
        user: { select: { fullName: true } },
        familyMember: { select: { fullName: true } },
      },
    }),
  );
}

/**
 * Confirma (ou reverte) que um sacramento autodeclarado bate com o registro
 * oficial da paróquia — nunca automático, sempre uma ação humana explícita
 * de quem tem PERMISSIONS.SACRAMENTS_VALIDATE. Ver comentário no schema.
 */
export async function setSacramentValidation(
  parishId: string,
  id: string,
  validated: boolean,
  validatedBy: string,
) {
  return withTenantContext(parishId, async (tx) => {
    const sacrament = await tx.sacrament.findFirst({ where: { id, parishId } });
    if (!sacrament) return { count: 0 };

    await tx.sacrament.update({
      where: { id: sacrament.id },
      data: validated
        ? { status: "validated", validatedBy, validatedAt: new Date() }
        : { status: "self_reported", validatedBy: null, validatedAt: null },
    });

    /*
     * A quem avisar.
     *
     * Se o sacramento é de quem tem conta, avisa a própria pessoa. Se é de
     * um catequizando sem conta, avisa quem responde por ele — a criança não
     * tem para onde receber, e a família é quem acompanha.
     */
    const aviso = sacrament.userId
      ? sacrament.userId
      : sacrament.familyMemberId
        ? (
            await tx.familyMember.findUnique({
              where: { id: sacrament.familyMemberId },
              select: { responsibleUserId: true },
            })
          )?.responsibleUserId ?? null
        : null;

    if (validated && aviso) {
      await notifyUser(tx, {
        parishId,
        userId: aviso,
        category: "espiritual",
        linkPath: "/caminhada",
        title: "Sacramento validado",
        body: `Seu registro de ${SACRAMENT_TYPE_LABELS[sacrament.type]} (${formatDateOnly(sacrament.date)}) foi confirmado pela paróquia.`,
      });
    }

    return { count: 1 };
  });
}

// ---- Confissão (só data — ver schema.prisma) -----------------------------

export function registerConfession(input: RegisterConfessionInput & { parishId: string; userId: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.confessionLog.create({
      data: { parishId: input.parishId, userId: input.userId, date: input.date },
    }),
  );
}

export function listMyConfessions(parishId: string, userId: string, limit = 20) {
  return withTenantContext(parishId, (tx) =>
    tx.confessionLog.findMany({
      where: { parishId, userId },
      orderBy: { date: "desc" },
      take: limit,
    }),
  );
}

/**
 * Os dados de uma certidão de sacramento.
 *
 * Certidão do SACRAMENTO RECEBIDO — não de conclusão de curso. O que ela
 * atesta é o ato: quem recebeu, qual sacramento, quando, onde, e em que
 * livro está lançado.
 *
 * Devolve `livro` separado justamente porque ele pode faltar. O app NÃO
 * inventa número de livro: uma certidão que afirma um assento inexistente é
 * pior que uma certidão sem ele, e a paróquia é quem responde pelo
 * documento.
 */
export function obterDadosDaCertidao(parishId: string, sacramentId: string) {
  return withTenantContext(parishId, async (tx) => {
    const sacramento = await tx.sacrament.findFirst({
      where: { id: sacramentId, parishId },
      include: {
        user: { select: { fullName: true, birthDate: true } },
        familyMember: { select: { fullName: true, birthDate: true } },
        priestProfile: { include: { user: { select: { fullName: true } } } },
      },
    });
    if (!sacramento) return null;

    const [paroquia, paroco] = await Promise.all([
      tx.parish.findUnique({
        where: { id: parishId },
        select: { name: true, city: true, state: true, address: true },
      }),
      tx.parishMembership
        .findFirst({
          where: { parishId, status: "active", role: { code: "PAROCO" } },
          select: { userId: true },
        })
        .then((f) =>
          f
            ? tx.priestProfile.findUnique({
                where: { userId_parishId: { userId: f.userId, parishId } },
                include: { user: { select: { fullName: true } } },
              })
            : null,
        ),
    ]);

    return {
      sacramento,
      // Uma das duas pontas existe, garantido por CHECK no banco.
      nome: sacramento.user?.fullName ?? sacramento.familyMember?.fullName ?? null,
      nascimento: sacramento.user?.birthDate ?? sacramento.familyMember?.birthDate ?? null,
      paroquia,
      // Quem celebrou, quando registrado; senão o pároco atual assina.
      celebrante: sacramento.priestProfile ? nomeDoSacerdote(sacramento.priestProfile) : null,
      paroco: paroco ? { nome: nomeDoSacerdote(paroco), titulo: paroco.title } : null,
      livro: sacramento.note?.trim() || null,
    };
  });
}
