/**
 * Seed de produção: só papéis e permissões (RBAC), sem paróquia/usuários
 * demo — ao contrário de seed.ts, que existe para preencher o ambiente de
 * dev com dados de exemplo (incluindo contas com senha pública).
 * Roda com: npm run db:seed:prod
 */
import { ensureRolesAndPermissionsSeeded } from "../src/server/auth/seed-rbac";
import { prisma } from "../src/server/db/prisma";

ensureRolesAndPermissionsSeeded()
  .then(() => console.log("Papéis e permissões aplicados."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
