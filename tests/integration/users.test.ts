import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { authenticateUser, registerUser } from "@/server/modules/users/service";

describe("criação de usuário", () => {
  const email = `usuario-${Date.now()}@test.comunidade.app`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  it("cria o usuário sem guardar a senha em texto puro", async () => {
    const user = await registerUser({ fullName: "Usuária de Teste", email, password: "SenhaForte123" });
    expect(user.passwordHash).not.toBe("SenhaForte123");
    expect(user.passwordHash.startsWith("$argon2")).toBe(true);
  });

  it("rejeita cadastro duplicado para o mesmo e-mail", async () => {
    await expect(
      registerUser({ fullName: "Outra Pessoa", email, password: "OutraSenha123" }),
    ).rejects.toThrow();
  });

  it("autentica com a senha correta e rejeita com a senha errada", async () => {
    await expect(authenticateUser({ email, password: "SenhaForte123" })).resolves.toBeDefined();
    await expect(authenticateUser({ email, password: "senha-errada" })).rejects.toThrow();
  });
});
