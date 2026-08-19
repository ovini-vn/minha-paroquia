import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { registerUser, updateOwnThemePreference } from "@/server/modules/users/service";

describe("aparência: preferência de tema padrão vs. litúrgico", () => {
  const email = `aparencia-${Date.now()}@test.comunidade.app`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  it("novo usuário começa com tema padrão", async () => {
    const user = await registerUser({ fullName: "Teste Aparência", email, password: "SenhaForte123" });
    expect(user.themePreference).toBe("default");
  });

  it("atualiza para litúrgico e de volta para padrão", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    const liturgical = await updateOwnThemePreference(user.id, "liturgical");
    expect(liturgical.themePreference).toBe("liturgical");

    const backToDefault = await updateOwnThemePreference(user.id, "default");
    expect(backToDefault.themePreference).toBe("default");
  });
});
