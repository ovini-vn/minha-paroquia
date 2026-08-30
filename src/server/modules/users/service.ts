import type { ColorScheme, FontScale, OAuthProvider, ThemePreference, FontFamily } from "@prisma/client";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { ValidationError } from "@/server/shared/errors";
import {
  createUser,
  createUserFromOAuth,
  findOAuthAccount,
  findUserByEmail,
  linkOAuthAccount,
  updateUserColorScheme,
  updateUserFontScale,
  updateUserFontFamily,
  updateUserProfile,
  updateUserThemePreference,
} from "./repository";
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
  // passwordHash nulo = conta só-OAuth (Google/Facebook) — mesma mensagem
  // genérica de sempre, nunca revela que a conta existe nem como ela loga.
  if (!user || !user.passwordHash) {
    throw new ValidationError("E-mail ou senha inválidos.");
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    throw new ValidationError("E-mail ou senha inválidos.");
  }

  return user;
}

export type OAuthProfile = {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  fullName: string;
};

/**
 * Login social: acha por (provider, providerAccountId); se não achar, tenta
 * linkar a um User já existente pelo mesmo e-mail (só chamado pelo caller
 * com e-mail já confirmado pelo provedor); senão cria um User novo sem
 * senha. Nunca falha por "e-mail já cadastrado" — login social sempre
 * resolve para uma conta, uma forma ou outra.
 */
export async function findOrCreateUserFromOAuth(profile: OAuthProfile) {
  const existingAccount = await findOAuthAccount(profile.provider, profile.providerAccountId);
  if (existingAccount) return existingAccount.user;

  const existingUser = await findUserByEmail(profile.email);
  if (existingUser) {
    await linkOAuthAccount(existingUser.id, {
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
    });
    return existingUser;
  }

  return createUserFromOAuth({
    email: profile.email,
    fullName: profile.fullName,
    provider: profile.provider,
    providerAccountId: profile.providerAccountId,
  });
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

export function updateOwnThemePreference(userId: string, themePreference: ThemePreference) {
  return updateUserThemePreference(userId, themePreference);
}

export function updateOwnColorScheme(userId: string, colorScheme: ColorScheme) {
  return updateUserColorScheme(userId, colorScheme);
}

export function updateOwnFontScale(userId: string, fontScale: FontScale) {
  return updateUserFontScale(userId, fontScale);
}

export function updateOwnFontFamily(userId: string, fontFamily: FontFamily) {
  return updateUserFontFamily(userId, fontFamily);
}
