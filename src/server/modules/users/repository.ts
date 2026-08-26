import { prisma } from "@/server/db/prisma";
import type { ColorScheme, FontScale, OAuthProvider, ThemePreference } from "@prisma/client";

/**
 * users é uma tabela global (não tenant-scoped) — um usuário existe
 * independente de qualquer paróquia, então não passa por withTenantContext.
 */
export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function createUser(data: { email: string; passwordHash: string; fullName: string }) {
  return prisma.user.create({ data });
}

export function updateUserProfile(
  id: string,
  data: { fullName: string; phone: string | null; birthDate: Date | null; photoUrl: string | null },
) {
  return prisma.user.update({ where: { id }, data });
}

export function updateUserThemePreference(id: string, themePreference: ThemePreference) {
  return prisma.user.update({ where: { id }, data: { themePreference } });
}

export function updateUserColorScheme(id: string, colorScheme: ColorScheme) {
  return prisma.user.update({ where: { id }, data: { colorScheme } });
}

export function findOAuthAccount(provider: OAuthProvider, providerAccountId: string) {
  return prisma.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    include: { user: true },
  });
}

/** Cria o User e já o vincula ao provedor na mesma transação — nunca existe um sem o outro. */
export function createUserFromOAuth(data: {
  email: string;
  fullName: string;
  provider: OAuthProvider;
  providerAccountId: string;
}) {
  return prisma.user.create({
    data: {
      email: data.email,
      fullName: data.fullName,
      oauthAccounts: {
        create: { provider: data.provider, providerAccountId: data.providerAccountId, email: data.email },
      },
    },
  });
}

/** Linka um provedor a um User já existente (achado por e-mail) — próximo login pelo mesmo provedor bate direto. */
export function linkOAuthAccount(
  userId: string,
  data: { provider: OAuthProvider; providerAccountId: string; email: string },
) {
  return prisma.oAuthAccount.create({ data: { userId, ...data } });
}

export function updateUserFontScale(userId: string, fontScale: FontScale) {
  return prisma.user.update({ where: { id: userId }, data: { fontScale } });
}
