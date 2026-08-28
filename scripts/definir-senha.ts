/**
 * Define a senha de uma conta, direto no banco.
 *
 * É a operação que a secretaria faria pelo painel se a tela de redefinição
 * já existisse. Enquanto ela não existe, este script cobre o caso — e o
 * caso é real: quem esquece a senha hoje não recupera, porque o e-mail
 * depende de domínio verificado.
 *
 * A senha NÃO entra como argumento de linha de comando: argumento fica no
 * histórico do shell e aparece na lista de processos. Vem por variável de
 * ambiente.
 *
 * Uso:
 *   $env:NOVA_SENHA="..."; npx tsx scripts/definir-senha.ts <e-mail>
 *   $env:NOVA_SENHA="..."; npx tsx scripts/definir-senha.ts <e-mail> --confirmar
 *
 * Sem --confirmar ele apenas procura a conta e mostra o que faria. O host
 * do banco é impresso ANTES de qualquer escrita: trocar a senha no banco
 * errado é fácil e silencioso.
 *
 * Reusa hashPassword do próprio app (src/server/auth/password.ts) para os
 * parâmetros do Argon2 nunca divergirem dos usados no login.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/auth/password";

const [email, ...flags] = process.argv.slice(2);
const confirmar = flags.includes("--confirmar");
const senha = process.env.NOVA_SENHA;

if (!email) {
  console.error("Uso: npx tsx scripts/definir-senha.ts <e-mail> [--confirmar]");
  console.error("A senha vem da variável NOVA_SENHA.");
  process.exit(1);
}
if (!senha) {
  console.error('Defina NOVA_SENHA antes de rodar. Ex.: $env:NOVA_SENHA="..."');
  process.exit(1);
}
if (senha.length < 8) {
  console.error("A senha precisa de pelo menos 8 caracteres.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const host = url.replace(/.*@/, "").split("/")[0];
  const base = (url.split("/").pop() ?? "").split("?")[0];

  // IMPRIME ANTES de qualquer consulta. Quando a consulta falha — banco
  // sem as tabelas, string apontando para o lugar errado —, e justamente
  // a linha do host que responde onde se esta. Deixa-la para depois
  // esconde a resposta exatamente quando ela e necessaria.
  console.log(`Banco:  ${host || "(DATABASE_URL nao definida)"}`);
  console.log(`Base:   ${base || "(sem nome)"}`);
  console.log(`Procurando: ${email}`);

  const totalDeContas = await prisma.user.count();
  console.log(`Contas neste banco: ${totalDeContas}`);

  const user = await prisma.user.findUnique({
    where: { email: email!.toLowerCase().trim() },
    select: { id: true, fullName: true, email: true },
  });

  if (!user) {
    console.error(`\nNenhuma conta com esse e-mail neste banco.`);
    // O erro costuma ser de digitacao no endereco. Procura por pedacos do
    // e-mail E pelo nome: assim a conta aparece mesmo com o e-mail errado.
    const local = (email ?? "").split("@")[0] ?? "";
    const pedacos = [local, local.replace(/[.0-9]/g, ""), local.split(".")[0] ?? ""].filter(
      (p) => p.length >= 4,
    );

    const parecidos = await prisma.user.findMany({
      where: {
        OR: pedacos.flatMap((p) => [
          { email: { contains: p, mode: "insensitive" as const } },
          { fullName: { contains: p, mode: "insensitive" as const } },
        ]),
      },
      select: { email: true, fullName: true },
      take: 8,
    });

    if (parecidos.length > 0) {
      console.error("");
      console.error("Contas parecidas neste banco:");
      for (const c of parecidos) console.error(`  ${c.email}  (${c.fullName})`);
    } else {
      console.error("");
      console.error("Nenhuma conta parecida tambem — provavelmente e o banco errado.");
      console.error("As variaveis de producao precisam estar definidas NESTA janela.");
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Nome:   ${user.fullName}`);

  if (!confirmar) {
    console.log("\nNada foi gravado. Rode de novo com --confirmar para trocar a senha.");
    return;
  }

  const passwordHash = await hashPassword(senha!);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Trocar a senha derruba as sessões abertas. É o comportamento correto de
  // uma redefinição: se a senha mudou porque alguém a perdeu, quem estiver
  // logado com ela precisa entrar de novo.
  const { count } = await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  console.log(`\nSenha trocada. ${count} sessão(ões) aberta(s) foram encerradas.`);
  console.log("Entre de novo em /login com a senha nova.");
}

main()
  .catch((erro) => {
    console.error(erro.message ?? erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
