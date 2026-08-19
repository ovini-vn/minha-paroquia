import { prisma } from "@/server/db/prisma";

/**
 * users é uma tabela global (não tenant-scoped) — um usuário existe
 * independente de qualquer paróquia, então não passa por withTenantContext.
 */
export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function createUser(data: { email: string; passwordHash: string; fullName: string }) {
  return prisma.user.create({ data });
}
