/**
 * Cria a primeira paróquia de produção + o primeiro usuário Pároco, sem
 * depender do fluxo de convite (que exige um `createdBy` que ainda não
 * existe na primeira vez). Gera um link de "definir senha" reaproveitando o
 * mesmo mecanismo de redefinição de senha do app — a senha nunca passa por
 * quem roda o script.
 *
 * Roda com:
 *   npx tsx prisma/bootstrap-founder.ts --name "Paróquia X" --city "Cidade" --state "UF" --email "email@exemplo.com" --fullName "Nome Completo"
 *
 * Import relativo (não "@/...") de propósito, igual seed.ts — tsx não
 * resolve os path aliases do tsconfig fora do Next.js.
 */
import { prisma } from "../src/server/db/prisma";
import { registerParish } from "../src/server/modules/parishes/service";
import { ensurePriestProfile } from "../src/server/modules/priests/ensure-priest-profile";
import { generateOpaqueToken, hashToken } from "../src/server/auth/tokens";

const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h — só pra dar folga na primeira configuração

function readArg(name: string): string {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error(`Argumento obrigatório faltando: ${flag}`);
  }
  return process.argv[index + 1];
}

async function main() {
  const name = readArg("name");
  const city = readArg("city");
  const state = readArg("state");
  const email = readArg("email");
  const fullName = readArg("fullName");

  const parish = await registerParish({ name, city, state });

  const founder = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, fullName, passwordHash: null, isPlatformAdmin: true },
  });

  const parocoRole = await prisma.role.findUniqueOrThrow({ where: { code: "PAROCO" } });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_parish_id = '${parish.id}'`);

    const existingMembership = await tx.parishMembership.findFirst({
      where: { userId: founder.id, parishId: parish.id, status: "active" },
    });
    if (!existingMembership) {
      await tx.parishMembership.create({
        data: { userId: founder.id, parishId: parish.id, roleId: parocoRole.id, status: "active" },
      });
    }
    await ensurePriestProfile(tx, { userId: founder.id, parishId: parish.id, roleCode: "PAROCO" });
  });

  const token = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: founder.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  console.log("\nParóquia criada:", parish.name, `(${parish.slug})`);
  console.log("Usuário Pároco:", founder.email);
  console.log("\nLink para definir a senha (válido por 24h, uso único):");
  console.log(`${process.env.APP_URL ?? "http://localhost:3000"}/recuperar-acesso/redefinir?token=${token}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
