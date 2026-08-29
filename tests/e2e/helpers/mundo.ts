import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
import type { BrowserContext } from "@playwright/test";

/**
 * Monta uma paróquia inteira para um teste, e desmonta no fim.
 *
 * Fala com o banco pelo Prisma direto, e não pelos serviços do app: os
 * serviços importam "server-only", que só resolve dentro do Next. Além
 * disso, teste de ponta a ponta deve tratar o app como caixa-preta — o que
 * ele exercita é a interface, não a função interna.
 */
const prisma = new PrismaClient();

/**
 * Roda um bloco com o RLS desligado, DENTRO de uma transação.
 *
 * `SET LOCAL` e não `SET`: sem o LOCAL o ajuste gruda na conexão e volta com
 * ela para o pool, desligando o RLS para quem a pegar depois. Aconteceu: a
 * suíte de isolamento entre paróquias falhou inteira logo após uma execução
 * destes testes, porque herdou uma conexão envenenada. O app sempre fez
 * certo (ver server/db/tenant-context.ts) — o erro era só aqui.
 */
async function semRls<T>(bloco: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'true'`);
    return bloco(tx);
  });
}

/** Mesma conta do app: token cru no cookie, hash no banco (ver auth/tokens.ts). */
function novoToken() {
  const cru = randomBytes(32).toString("base64url");
  return { cru, hash: createHash("sha256").update(cru).digest("hex") };
}

export type Mundo = {
  parishId: string;
  parishName: string;
  usuarios: Record<string, { id: string; token: string }>;
  limpar: () => Promise<void>;
};

export async function criarMundo(
  prefixo: string,
  pessoas: { chave: string; nome: string; papel: string }[],
): Promise<Mundo> {
  const marca = `${prefixo}-${Date.now()}-${randomBytes(3).toString("hex")}`;

  const usuarios: Mundo["usuarios"] = {};
  const userIds: string[] = [];

  const parish = await semRls(async (tx) => {
  const parish = await tx.parish.create({
    data: { name: `E2E ${marca}`, slug: `e2e-${marca}` },
  });

  for (const p of pessoas) {
    const user = await tx.user.create({
      data: {
        fullName: p.nome,
        email: `${p.chave}-${marca}@e2e.local`,
        // Sem senha: o teste entra injetando o cookie de sessão. Digitar
        // senha em teste não exercita nada que a integração já não cubra.
        passwordHash: null,
        // Sem isto o layout do fiel manda todo mundo para /bem-vindo, e
        // qualquer teste de tela interna falha antes de começar. Quem já é
        // membro de uma paróquia, no mundo real, já passou pelas boas-vindas.
        onboardedAt: new Date(),
      },
    });
    userIds.push(user.id);

    const role = await tx.role.findUniqueOrThrow({ where: { code: p.papel } });
    await tx.parishMembership.create({
      data: { userId: user.id, parishId: parish.id, roleId: role.id, status: "active" },
    });

    const { cru, hash } = novoToken();
    await tx.session.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });
    usuarios[p.chave] = { id: user.id, token: cru };
  }

  return parish;
  });

  return {
    parishId: parish.id,
    parishName: parish.name,
    usuarios,
    async limpar() {
      await semRls(async (tx) => {
        // A paróquia cai por último: quase tudo pende dela em cascata.
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
        await tx.parish.deleteMany({ where: { id: parish.id } });
      });
    },
  };
}

/** Entra como alguém, sem passar pela tela de login. */
export async function entrarComo(contexto: BrowserContext, token: string) {
  await contexto.addCookies([
    {
      name: "comunidade_session",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

export async function desconectarBanco() {
  await prisma.$disconnect();
}
