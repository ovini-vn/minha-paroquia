import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { reiniciarContaDeTeste } from "@/server/auth/session";
import { CONTAS_QUE_REFAZEM_O_ONBOARDING } from "@/lib/funcionalidades";
import { withOwnMembershipLookup } from "@/server/db/tenant-context";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O caminho de quem chega — escolher a paróquia e passar pelas boas-vindas
 * — acontece uma vez na vida de cada conta, e é por isso que é difícil de
 * rever. As contas listadas o refazem a cada entrada.
 */
describe("contas de teste voltam ao começo ao entrar", () => {
  const stamp = Date.now();
  const userIds: string[] = [];
  const parishIds: string[] = [];
  let parishId: string;

  const conta = async (email: string) => {
    const u = await registerUser({ fullName: "Conta de Teste", email, password: "SenhaForte123" });
    userIds.push(u.id);
    const convite = await createInvitation({ parishId, createdBy: u.id, type: "link", role: "FIEL" });
    await acceptInvitation({ code: convite.code, userId: u.id });
    await prisma.user.update({ where: { id: u.id }, data: { onboardedAt: new Date() } });
    return u.id;
  };

  const vinculoAtivo = (userId: string) =>
    withOwnMembershipLookup(userId, (tx) =>
      tx.parishMembership.findFirst({ where: { userId, status: "active" } }),
    );

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const p = await registerParish({ name: `Par Conta de Teste ${stamp}` });
    parishId = p.id;
    parishIds.push(p.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("a conta listada perde o vínculo e o onboarding; as outras ficam como estão", async () => {
    // A lista é nominal e curta; vazia, o teste não teria o que provar.
    const listada = CONTAS_QUE_REFAZEM_O_ONBOARDING[0];
    expect(listada, "a lista de contas de teste está vazia").toBeTruthy();

    const daLista = await conta(listada!);
    const comum = await conta(`comum-${stamp}@test.comunidade.app`);

    await reiniciarContaDeTeste(daLista);
    await reiniciarContaDeTeste(comum);

    // Os dois portões do app caem juntos: sem paróquia e sem boas-vindas.
    expect((await prisma.user.findUnique({ where: { id: daLista } }))?.onboardedAt).toBeNull();
    expect(await vinculoAtivo(daLista)).toBeNull();

    expect((await prisma.user.findUnique({ where: { id: comum } }))?.onboardedAt).not.toBeNull();
    expect(await vinculoAtivo(comum)).not.toBeNull();
  });

  it("entrar de novo sem paróquia nenhuma não quebra", async () => {
    // Segunda entrada seguida: a conta já está sem vínculo, e o reinício
    // precisa ser idempotente em vez de estourar procurando o que não há.
    const listada = CONTAS_QUE_REFAZEM_O_ONBOARDING[0]!;
    const userId = userIds.find((_, i) => i === 0)!;
    expect(listada).toBeTruthy();

    await expect(reiniciarContaDeTeste(userId)).resolves.toBeUndefined();
    expect(await vinculoAtivo(userId)).toBeNull();
  });
});
