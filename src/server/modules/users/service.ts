import { hashPassword, verifyPassword } from "@/server/auth/password";
import { ValidationError } from "@/server/shared/errors";
import { createUser, findUserByEmail, updateUserProfile } from "./repository";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "./schema";

export async function registerUser(input: RegisterInput) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new ValidationError("Já existe uma conta com este e-mail.");
  }

  const passwordHash = await hashPassword(input.password);
  return createUser({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
  });
}

/**
 * Mensagem de erro deliberadamente genérica — não revela se o e-mail existe
 * ou se foi a senha que errou.
 */
export async function authenticateUser(input: LoginInput) {
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw new ValidationError("E-mail ou senha inválidos.");
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    throw new ValidationError("E-mail ou senha inválidos.");
  }

  return user;
}

/** Só o próprio usuário edita seus dados — nunca chamado com outro userId a partir de uma tela administrativa. */
export function updateOwnProfile(userId: string, input: UpdateProfileInput) {
  return updateUserProfile(userId, {
    fullName: input.fullName,
    phone: input.phone || null,
    birthDate: input.birthDate || null,
    photoUrl: input.photoUrl || null,
  });
}
