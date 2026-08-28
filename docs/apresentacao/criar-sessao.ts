/**
 * Cria uma sessão de leitura para as capturas de tela, sem senha.
 *
 * As telas do app exigem login. Em vez de digitar a senha de ninguém — nem
 * a de desenvolvimento —, este script faz exatamente o que o app faz ao
 * autenticar: gera um token opaco, guarda o hash em `sessions` e devolve o
 * token, que o Playwright coloca no cookie.
 *
 * Roda SÓ contra o banco local. Se apontar para produção, cria um acesso
 * real — por isso o aviso do host antes de escrever.
 */
import { PrismaClient } from "@prisma/client";
import { generateOpaqueToken, hashToken } from "../../src/server/auth/tokens";

const EMAIL = process.argv[2] ?? "paroco.demo@comunidade.app";
const prisma = new PrismaClient();

async function main() {
  const host = (process.env.DATABASE_URL ?? "").replace(/.*@/, "").split("/")[0];
  console.error(`Banco: ${host}`);

  const user = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true, fullName: true } });
  if (!user) throw new Error(`Usuário ${EMAIL} não existe neste banco.`);

  const token = generateOpaqueToken();
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
  });

  console.error(`Sessão criada para ${user.fullName}.`);
  // Só o token vai para a saída padrão, para o shell capturar.
  console.log(token);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
