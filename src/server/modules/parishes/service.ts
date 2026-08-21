import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import { slugify } from "@/server/shared/slug";
import { ensurePriestProfile, isPriestRole } from "@/server/modules/priests/ensure-priest-profile";
import { createParish, findParishBySlug, findParishById, updateParishProfile } from "./repository";
import type { UpdateParishProfileInput } from "./schema";

/**
 * Nomes de paróquia se repetem muito (padroeiros comuns, ex.: "Nossa
 * Senhora de Fátima" existe em várias cidades) — o slug incorpora a cidade
 * pra evitar colisão, e cai num sufixo numérico no caso raro de duas
 * paróquias com o mesmo nome *e* cidade.
 */
async function uniqueSlugFor(name: string, city?: string): Promise<string> {
  const base = slugify(city ? `${name}-${city}` : name);
  if (!base) {
    throw new ValidationError("Nome ou cidade inválidos.");
  }

  let slug = base;
  let attempt = 2;
  while (await findParishBySlug(slug)) {
    slug = `${base}-${attempt}`;
    attempt += 1;
  }
  return slug;
}

export async function registerParish(input: { name: string; city?: string; state?: string }) {
  const slug = await uniqueSlugFor(input.name, input.city);
  return createParish({ name: input.name, slug, city: input.city, state: input.state });
}

export function getParish(parishId: string) {
  return findParishById(parishId);
}

export function updateOwnParishProfile(parishId: string, input: UpdateParishProfileInput) {
  return updateParishProfile(parishId, {
    city: input.city || null,
    state: input.state || null,
    address: input.address || null,
    phone: input.phone || null,
    description: input.description || null,
    logoUrl: input.logoUrl || null,
  });
}

const PRIEST_ROLE_CODES = ["SACERDOTE", "PAROCO"] as const;

export async function getParishDashboardCounts(parishId: string) {
  return withTenantContext(parishId, async (tx) => {
    const [fielCount, sacerdoteCount, invitesIssued, invitesUsed] = await Promise.all([
      tx.parishMembership.count({ where: { parishId, status: "active" } }),
      tx.parishMembership.count({
        where: { parishId, status: "active", role: { code: { in: [...PRIEST_ROLE_CODES] } } },
      }),
      tx.invitation.count({ where: { parishId } }),
      tx.invitation.count({ where: { parishId, status: "used" } }),
    ]);

    return { fielCount, sacerdoteCount, invitesIssued, invitesUsed };
  });
}

/** Membros ativos com um papel específico — usado para escolher catequista ao criar uma turma. */
export function listMembersByRole(parishId: string, roleCode: string) {
  return withTenantContext(parishId, (tx) =>
    tx.parishMembership.findMany({
      where: { parishId, status: "active", role: { code: roleCode } },
      include: { user: { select: { id: true, fullName: true } } },
    }),
  );
}

/** Todos os membros ativos, qualquer papel — usado para registrar dízimo. */
export function listActiveMembers(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.parishMembership.findMany({
      where: { parishId, status: "active" },
      include: { user: { select: { id: true, fullName: true } }, role: { select: { name: true, code: true } } },
      orderBy: { user: { fullName: "asc" } },
    }),
  );
}

/**
 * Troca o papel de alguém que JÁ pertence à paróquia.
 *
 * Faltava por inteiro: roleId só era definido uma vez, ao aceitar o convite.
 * Quem entrou por um link genérico de fiel nunca podia virar catequista — e
 * delegar permissão avulsa não resolvia, porque o formulário de turma
 * procura catequistas POR PAPEL, então a pessoa nunca aparecia na lista.
 */
export async function changeMemberRole(
  parishId: string,
  targetUserId: string,
  roleCode: string,
  actingUserId: string,
) {
  return withTenantContext(parishId, async (tx) => {
    if (targetUserId === actingUserId) {
      // Sem isso, um pároco distraído se rebaixa a fiel e perde o acesso ao
      // painel — inclusive à tela que desfaria o engano.
      throw new ValidationError("Você não pode alterar o seu próprio papel. Peça a outra pessoa.");
    }

    const role = await tx.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new ValidationError("Papel desconhecido.");

    const membership = await tx.parishMembership.findFirst({
      where: { parishId, userId: targetUserId, status: "active" },
      include: { role: true },
    });
    if (!membership) throw new ValidationError("Esta pessoa não pertence à paróquia.");
    if (membership.roleId === role.id) return membership;

    // A paróquia não pode ficar sem ninguém que administre.
    if (membership.role.code === "PAROCO" && roleCode !== "PAROCO") {
      const parocos = await tx.parishMembership.count({
        where: { parishId, status: "active", role: { code: "PAROCO" } },
      });
      if (parocos <= 1) {
        throw new ValidationError(
          "Esta é a única conta com papel de Pároco. Defina outro Pároco antes de mudar este.",
        );
      }
    }

    // Deixar de ser sacerdote: o perfil não pode simplesmente sumir.
    // appointments.priest_profile_id é onDelete Cascade, então apagar o
    // perfil levaria junto os atendimentos marcados; celebrações e
    // sacramentos perderiam o vínculo. Só removo o perfil vazio.
    if (isPriestRole(membership.role.code) && !isPriestRole(roleCode)) {
      const perfil = await tx.priestProfile.findUnique({
        where: { userId_parishId: { userId: targetUserId, parishId } },
        include: {
          _count: { select: { appointments: true, celebrations: true, sacraments: true } },
        },
      });

      if (perfil) {
        const vinculos =
          perfil._count.appointments + perfil._count.celebrations + perfil._count.sacraments;
        if (vinculos > 0) {
          throw new ValidationError(
            "Este sacerdote tem atendimentos, celebrações ou sacramentos registrados. Reatribua ou conclua esses registros antes de mudar o papel.",
          );
        }
        await tx.priestProfile.delete({ where: { id: perfil.id } });
      }
    }

    const atualizado = await tx.parishMembership.update({
      where: { id: membership.id },
      data: { roleId: role.id },
    });

    // Virar sacerdote cria o perfil, igual ao aceite de convite — senão a
    // pessoa teria o papel sem aparecer em "Sacerdotes" nem poder atender.
    await ensurePriestProfile(tx, { userId: targetUserId, parishId, roleCode });

    return atualizado;
  });
}
