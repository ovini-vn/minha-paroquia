/**
 * Devolve uma conta ao estado de quem acabou de entrar na paróquia, para o
 * print das boas-vindas.
 *
 * Diferente de `scripts/resetar-onboarding.ts`, que derruba os DOIS portões
 * do app (vínculo e onboarding) para testar o fluxo inteiro: aqui o vínculo
 * fica: /bem-vindo precisa da paróquia para dizer o nome dela na primeira
 * linha. Só a marca de onboarding concluído é apagada.
 *
 * Roda SÓ contra o banco de desenvolvimento — este script escreve, e um
 * print não vale mexer numa conta de verdade.
 *
 * Uso: npx tsx docs/apresentacao/preparar-onboarding.ts fiel.demo@comunidade.app
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Informe o e-mail da conta.");

  const host = (process.env.DATABASE_URL ?? "").replace(/.*@/, "").split("/")[0] ?? "";
  if (!host.includes("ep-silent-salad")) {
    throw new Error(`Este script só roda no banco de desenvolvimento. Host atual: ${host}`);
  }

  const { count } = await prisma.user.updateMany({ where: { email }, data: { onboardedAt: null } });
  if (count === 0) throw new Error(`Conta ${email} não existe neste banco.`);
  console.error(`Onboarding de ${email} devolvido ao começo.`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
