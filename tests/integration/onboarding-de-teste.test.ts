import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { registerUser } from "@/server/modules/users/service";
import { reiniciarOnboardingDeContaDeTeste } from "@/server/auth/session";
import { CONTAS_QUE_REFAZEM_O_ONBOARDING } from "@/lib/funcionalidades";

/**
 * As boas-vindas acontecem uma vez na vida de cada conta — e é por isso que
 * são difíceis de rever. As contas listadas voltam ao começo a cada entrada.
 */
describe("contas de teste refazem o onboarding ao entrar", () => {
  const criados: string[] = [];

  afterAll(async () => {
    if (criados.length) await prisma.user.deleteMany({ where: { id: { in: criados } } });
  });

  const conta = async (email: string) => {
    const u = await registerUser({ fullName: "Conta de Teste", email, password: "SenhaForte123" });
    criados.push(u.id);
    await prisma.user.update({ where: { id: u.id }, data: { onboardedAt: new Date() } });
    return u.id;
  };

  it("a conta listada volta ao começo; as outras ficam como estão", async () => {
    // A lista é nominal e curta; se um dia esvaziar, o teste não tem o que provar.
    const listada = CONTAS_QUE_REFAZEM_O_ONBOARDING[0];
    expect(listada, "a lista de contas de teste está vazia").toBeTruthy();

    const daLista = await conta(listada!);
    const comum = await conta(`comum-${Date.now()}@test.comunidade.app`);

    await reiniciarOnboardingDeContaDeTeste(daLista);
    await reiniciarOnboardingDeContaDeTeste(comum);

    expect((await prisma.user.findUnique({ where: { id: daLista } }))?.onboardedAt).toBeNull();
    expect((await prisma.user.findUnique({ where: { id: comum } }))?.onboardedAt).not.toBeNull();
  });
});
