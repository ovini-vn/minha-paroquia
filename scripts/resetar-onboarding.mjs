/**
 * Devolve uma conta ao estado de quem acabou de chegar.
 *
 * Serve para testar o onboarding de novo sem criar outro e-mail. A conta e a
 * senha continuam valendo — o que sai é o que faz o app considerar a pessoa
 * "já instalada": o vínculo com a paróquia, a marca de onboarding concluído
 * e o que ela declarou dentro daquela paróquia.
 *
 * Recusa contas com histórico de verdade (atendimento marcado, pedido de
 * oração, gente da família cadastrada): apagar o vínculo delas deixaria
 * esses registros órfãos numa paróquia que a pessoa não pertence mais.
 *
 * Uso:
 *   node scripts/resetar-onboarding.mjs <e-mail>
 *   node scripts/resetar-onboarding.mjs <e-mail> --confirmar
 */
import { PrismaClient } from "@prisma/client";

/**
 * O host ANTES da primeira consulta — sem a senha.
 *
 * Este script APAGA vínculo de paróquia, e a diferença entre o banco de
 * desenvolvimento e o de produção é uma variável de ambiente. Descobrir
 * onde se estava depois do estrago é tarde; e quando a consulta falha, a
 * linha que responderia "onde eu estou" nunca chega a sair.
 *
 * Sem DATABASE_URL definida à mão, o Prisma lê o `.env` do projeto — que
 * aponta para o banco de DESENVOLVIMENTO. É o padrão seguro, mas quem lê
 * a linha abaixo confere em vez de supor.
 */
function ondeEstou() {
  const url = process.env.DATABASE_URL ?? "";
  const host = url.match(/@([^/:?]+)/)?.[1];
  return host ?? "(DATABASE_URL não definida — o Prisma vai ler o .env)";
}
console.log(`banco: ${ondeEstou()}
`);

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error("Uso: node scripts/resetar-onboarding.mjs <e-mail> [--confirmar]");
  process.exit(1);
}
const confirmado = flag === "--confirmar";

const prisma = new PrismaClient();
try {
  const u = await prisma.user.findUnique({
    where: { email },
    select: { id: true, fullName: true, onboardedAt: true },
  });
  if (!u) {
    console.error(`Nenhuma conta com esse e-mail.`);
    process.exit(1);
  }

  const [vinculos, voluntario, atendimentos, oracoes, familia, guardioes] = await Promise.all([
    prisma.parishMembership.count({ where: { userId: u.id } }),
    prisma.volunteerProfile.count({ where: { userId: u.id } }),
    prisma.appointment.count({ where: { fielUserId: u.id } }),
    prisma.prayerRequest.count({ where: { requesterUserId: u.id } }),
    prisma.familyMember.count({ where: { responsibleUserId: u.id } }),
    prisma.familyMemberGuardian.count({ where: { userId: u.id } }),
  ]);

  console.log(`${u.fullName} <${email}>`);
  console.log(`  vínculos de paróquia ...: ${vinculos}  (serão apagados)`);
  console.log(`  perfis de voluntário ...: ${voluntario}  (serão apagados)`);
  console.log(`  onboardedAt ............: ${u.onboardedAt?.toISOString().slice(0, 16) ?? "null"} → null`);

  const impedimentos = [];
  if (atendimentos) impedimentos.push(`${atendimentos} atendimento(s)`);
  if (oracoes) impedimentos.push(`${oracoes} pedido(s) de oração`);
  if (familia) impedimentos.push(`${familia} pessoa(s) da família`);
  if (guardioes) impedimentos.push(`${guardioes} vínculo(s) de guardião`);
  if (impedimentos.length > 0) {
    console.error(`\nRECUSADO: esta conta tem histórico — ${impedimentos.join(", ")}.`);
    console.error("Apagar o vínculo deixaria esses registros órfãos. Apague-os antes, à mão.");
    process.exit(2);
  }

  if (!confirmado) {
    console.log("\nEnsaio. Rode de novo com --confirmar para aplicar.");
    process.exit(0);
  }

  await prisma.$transaction([
    prisma.volunteerProfile.deleteMany({ where: { userId: u.id } }),
    prisma.parishMembership.deleteMany({ where: { userId: u.id } }),
    prisma.user.update({ where: { id: u.id }, data: { onboardedAt: null } }),
  ]);
  console.log("\nFeito. No próximo acesso a conta entra pelo início do onboarding.");
} finally {
  await prisma.$disconnect();
}
