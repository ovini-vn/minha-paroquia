import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import { createParish, findParishBySlug } from "./repository";

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

export async function registerParish(input: { name: string }) {
  const slug = slugify(input.name);
  if (!slug) {
    throw new ValidationError("Nome da paróquia inválido.");
  }

  const existing = await findParishBySlug(slug);
  if (existing) {
    throw new ValidationError("Já existe uma paróquia com um nome muito parecido.");
  }

  return createParish({ name: input.name, slug });
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
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { user: { fullName: "asc" } },
    }),
  );
}
