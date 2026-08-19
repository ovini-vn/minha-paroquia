import { PrismaClient } from "@prisma/client";

// Singleton para evitar exaurir conexões durante hot-reload em dev
// (Next.js recarrega módulos a cada mudança de arquivo).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
