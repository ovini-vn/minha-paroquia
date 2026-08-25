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

export function createParish(data: { name: string; slug: string; city?: string; state?: string }) {
  return prisma.parish.create({ data });
}

export function updateParishProfile(
  id: string,
  data: {
    city: string | null;
    state: string | null;
    address: string | null;
    phone: string | null;
    description: string | null;
    logoUrl: string | null;
    whatsapp: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
  },
) {
  return prisma.parish.update({ where: { id }, data });
}
