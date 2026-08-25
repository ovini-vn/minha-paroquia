/**
 * Troca o papel de uma conta na paróquia, por fora da tela.
 *
 * A tela recusa mudar o PRÓPRIO papel — proteção contra o clique distraído
 * que rebaixaria alguém e o trancaria fora do painel. Aqui a mudança é
 * deliberada e conferida antes, então essa guarda não se aplica.
 *
 * O que NÃO é dispensado é a proteção que evita perda de dado: sair do
 * clero apaga o perfil de sacerdote, e appointments e posts têm
 * onDelete Cascade. Se houver qualquer rastro, o script recusa.
 *
 * Uso:
 *   node scripts/trocar-papel.mjs <e-mail> <CODIGO_DO_PAPEL>
 *   node scripts/trocar-papel.mjs <e-mail> <CODIGO_DO_PAPEL> --confirmar
 */
import { PrismaClient } from "@prisma/client";

const [email, roleCode, flag] = process.argv.slice(2);
if (!email || !roleCode) {
  console.error("Uso: node scripts/trocar-papel.mjs <e-mail> <CODIGO_DO_PAPEL> [--confirmar]");
  process.exit(1);
}
const confirmado = flag === "--confirmar";

const CLERO = ["PAROCO", "SACERDOTE"];
const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, fullName: true } });
  if (!user) { console.error("Nenhuma conta com esse e-mail."); process.exit(1); }

  const papel = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!papel) { console.error(`Papel "${roleCode}" não existe no banco. Rode o seed antes.`); process.exit(1); }

  const vinculo = await prisma.parishMembership.findFirst({
    where: { userId: user.id, status: "active" },
    include: { role: true, parish: { select: { id: true, name: true } } },
  });
  if (!vinculo) { console.error("Esta conta não pertence a nenhuma paróquia."); process.exit(1); }

  console.log(`${user.fullName} em ${vinculo.parish.name}`);
  console.log(`  papel: ${vinculo.role.code} → ${roleCode}`);

  const saiDoClero = CLERO.includes(vinculo.role.code) && !CLERO.includes(roleCode);
  let perfil = null;

  if (saiDoClero) {
    perfil = await prisma.priestProfile.findUnique({
      where: { userId_parishId: { userId: user.id, parishId: vinculo.parish.id } },
      include: { _count: { select: { appointments: true, celebrations: true, sacraments: true, posts: true } } },
    });
    if (perfil) {
      const c = perfil._count;
      console.log(`  perfil de sacerdote: será removido`);
      console.log(`    atendimentos ${c.appointments} · celebrações ${c.celebrations} · sacramentos ${c.sacraments} · posts ${c.posts}`);
      const total = c.appointments + c.celebrations + c.sacraments + c.posts;
      if (total > 0) {
        console.error("\nRECUSADO: apagar o perfil levaria esses registros junto.");
        process.exit(2);
      }
    } else {
      console.log("  perfil de sacerdote: não existe");
    }
  }

  if (!confirmado) { console.log("\nEnsaio. Rode de novo com --confirmar para aplicar."); process.exit(0); }

  await prisma.$transaction(async (tx) => {
    if (perfil) await tx.priestProfile.delete({ where: { id: perfil.id } });
    await tx.parishMembership.update({ where: { id: vinculo.id }, data: { roleId: papel.id } });
  });
  console.log("\nFeito.");
} finally {
  await prisma.$disconnect();
}
