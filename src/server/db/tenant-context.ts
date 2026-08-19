import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Alfabeto padrão do nanoid (ver src/server/invitations geração de código).
const INVITE_CODE_RE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Postgres não permite parâmetros bind em `SET LOCAL`, então o valor precisa
 * ser interpolado na string SQL. Validar o formato antes de interpolar
 * elimina qualquer risco de injeção.
 */
function assertMatches(value: string, pattern: RegExp, label: string): void {
  if (!pattern.test(value)) {
    throw new Error(`${label} tem formato inválido: "${value}"`);
  }
}

/**
 * Toda leitura/escrita em tabela tenant-scoped, já sabendo o parish_id
 * (caso comum: usuário autenticado com vínculo ativo resolvido), deve passar
 * por aqui. Ativa a política de RLS que compara contra parish_id — ver
 * prisma/rls-policies.sql.
 */
export async function withTenantContext<T>(
  parishId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  assertMatches(parishId, UUID_RE, "parishId");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_parish_id = '${parishId}'`);
    return fn(tx);
  });
}

/**
 * Resolve "a qual paróquia este usuário pertence" logo após autenticar —
 * quando ainda não sabemos parish_id. A política de RLS permite que um
 * usuário sempre leia suas PRÓPRIAS linhas de parish_memberships (por
 * user_id), nunca as de outro usuário.
 */
export async function withOwnMembershipLookup<T>(
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  assertMatches(userId, UUID_RE, "userId");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${userId}'`);
    return fn(tx);
  });
}

/**
 * Validação pública de convite (/convite/:code), antes de qualquer sessão
 * existir. A política de RLS permite ler exatamente a linha cujo `code`
 * bate com o valor setado aqui — não expõe nenhum outro convite.
 */
export async function withInvitationCodeLookup<T>(
  code: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  assertMatches(code, INVITE_CODE_RE, "code");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.lookup_invitation_code = '${code}'`);
    return fn(tx);
  });
}

/**
 * Bypassa o isolamento por paróquia inteiramente. Reservado para operações
 * de administração da plataforma (users.isPlatformAdmin) — nunca chamar sem
 * antes checar requirePlatformAdmin(). Não usado por nenhuma tela nesta fase.
 */
export async function withPlatformContext<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'true'`);
      return fn(tx);
    },
    // Único chamador real é a limpeza de dados de teste (tests/helpers/cleanup.ts),
    // que acumulou dezenas de deleteMany sequenciais ao longo das fatias — o
    // timeout padrão de 5s do Prisma passou a estourar sob latência de rede.
    { timeout: 20000 },
  );
}

export type { PrismaClient };
