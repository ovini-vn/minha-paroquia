import { prisma } from "@/server/db/prisma";
import { generateOpaqueToken, hashToken } from "@/server/auth/tokens";
import { hashPassword } from "@/server/auth/password";
import { ValidationError } from "@/server/shared/errors";
import { findUserByEmail } from "./repository";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Retorna null quando o e-mail não existe — de propósito, para não revelar
 * ao chamador se uma conta existe ou não. Quem chama (a action) trata os
 * dois casos da mesma forma na tela.
 */
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const token = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  return `/recuperar-acesso/redefinir?token=${token}`;
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new ValidationError("A senha precisa ter pelo menos 8 caracteres.");
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ValidationError("Este link de recuperação não é mais válido.");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Troca de senha invalida sessões existentes — se o token vazou, o
    // acesso antigo não continua válido.
    prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
