import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import { createParish, findParishBySlug, findParishById, updateParishProfile } from "./repository";
import type { UpdateParishProfileInput } from "./schema";

// Faixa Unicode "Combining Diacritical Marks" (0x0300-0x036f), construída por
// código para evitar problemas de encoding de caracteres combinantes no
// arquivo-fonte.
const COMBINING_MARKS_RE = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  "g",
);

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(COMBINING_MARKS_RE, "") // remove acentos (a -> a, c -> c, ...)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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
      include: { user: { select: { id: true, fullName: true } }, role: { select: { name: true } } },
      orderBy: { user: { fullName: "asc" } },
    }),
  );
}
