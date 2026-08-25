/**
 * Concede (ou remove) o papel de Administrador da Plataforma.
 *
 * Não existe tela para isto de propósito: quem administra a plataforma
 * inteira não deveria poder se promover sozinho pelo aplicativo. O primeiro
 * administrador entra por aqui, com quem tem acesso ao banco.
 *
 * O papel é ADITIVO — passa por cima das permissões de paróquia sem remover
 * nenhuma. Quem é pároco continua pároco.
 *
 * Uso:
 *   node scripts/definir-admin-plataforma.mjs <e-mail> [remover]
 */
import { PrismaClient } from "@prisma/client";

const [email, acao] = process.argv.slice(2);
if (!email) {
  console.error("Uso: node scripts/definir-admin-plataforma.mjs <e-mail> [remover]");
  process.exit(1);
}
const conceder = acao !== "remover";

const prisma = new PrismaClient();
try {
  const antes = await prisma.user.findUnique({
    where: { email },
    select: { id: true, fullName: true, isPlatformAdmin: true },
  });
  if (!antes) {
    console.error(`Nenhum usuário com o e-mail "${email}".`);
    process.exit(1);
  }

  if (antes.isPlatformAdmin === conceder) {
    console.log(`${antes.fullName} já está como isPlatformAdmin=${conceder}. Nada a fazer.`);
  } else {
    await prisma.user.update({ where: { id: antes.id }, data: { isPlatformAdmin: conceder } });
    console.log(`${antes.fullName} <${email}>`);
    console.log(`  isPlatformAdmin: ${antes.isPlatformAdmin} → ${conceder}`);
  }

  const vinculos = await prisma.parishMembership.findMany({
    where: { userId: antes.id, status: "active" },
    select: { parish: { select: { name: true } }, role: { select: { code: true } } },
  });
  console.log("  vínculos de paróquia (inalterados):");
  for (const v of vinculos) console.log(`    ${v.role.code} em ${v.parish.name}`);
} finally {
  await prisma.$disconnect();
}
