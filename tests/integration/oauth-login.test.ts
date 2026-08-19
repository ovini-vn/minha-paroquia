import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { registerUser, authenticateUser, findOrCreateUserFromOAuth } from "@/server/modules/users/service";

describe("login social: achar/criar/linkar usuário por perfil OAuth", () => {
  const emails: string[] = [];

  afterAll(async () => {
    await prisma.oAuthAccount.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it("cria um usuário novo sem senha na primeira vez que loga com um provedor", async () => {
    const email = `oauth-novo-${Date.now()}@test.comunidade.app`;
    emails.push(email);

    const user = await findOrCreateUserFromOAuth({
      provider: "google",
      providerAccountId: `google-${Date.now()}`,
      email,
      fullName: "Login Social Novo",
    });

    expect(user.email).toBe(email);
    expect(user.passwordHash).toBeNull();
  });

  it("logar de novo com o mesmo (provider, providerAccountId) retorna o mesmo usuário, sem duplicar", async () => {
    const email = `oauth-repete-${Date.now()}@test.comunidade.app`;
    emails.push(email);
    const providerAccountId = `google-${Date.now()}`;

    const first = await findOrCreateUserFromOAuth({
      provider: "google",
      providerAccountId,
      email,
      fullName: "Login Social Repetido",
    });
    const second = await findOrCreateUserFromOAuth({
      provider: "google",
      providerAccountId,
      email,
      fullName: "Login Social Repetido",
    });

    expect(second.id).toBe(first.id);
    const count = await prisma.user.count({ where: { email } });
    expect(count).toBe(1);
  });

  it("linka a uma conta já existente (criada por senha) quando o e-mail bate", async () => {
    const email = `oauth-linka-${Date.now()}@test.comunidade.app`;
    emails.push(email);

    const passwordUser = await registerUser({ fullName: "Conta Por Senha", email, password: "SenhaForte123" });

    const linked = await findOrCreateUserFromOAuth({
      provider: "facebook",
      providerAccountId: `facebook-${Date.now()}`,
      email,
      fullName: "Conta Por Senha",
    });

    expect(linked.id).toBe(passwordUser.id);
    const count = await prisma.user.count({ where: { email } });
    expect(count).toBe(1);
  });

  it("não deixa autenticar por senha uma conta só-OAuth (passwordHash nulo)", async () => {
    const email = `oauth-somente-${Date.now()}@test.comunidade.app`;
    emails.push(email);

    await findOrCreateUserFromOAuth({
      provider: "google",
      providerAccountId: `google-${Date.now()}`,
      email,
      fullName: "Só OAuth",
    });

    await expect(authenticateUser({ email, password: "QualquerSenha123" })).rejects.toThrow();
  });
});
