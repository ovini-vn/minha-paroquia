import { prisma } from "@/server/db/prisma";

/**
 * parishes é o "topo" do isolamento multi-tenant, não uma tabela
 * tenant-scoped em si — buscar uma paróquia pelo próprio id/slug é uma
 * operação legítima antes de qualquer contexto de tenant existir (ex.: tela
 * pública de convite mostrando o nome da paróquia).
 */
export function findParishBySlug(slug: string) {
  return prisma.parish.findUnique({ where: { slug } });
}

export function findParishById(id: string) {
  return prisma.parish.findUnique({ where: { id } });
}

export function createParish(data: { name: string; slug: string }) {
  return prisma.parish.create({ data });
}
