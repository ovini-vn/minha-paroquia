import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import {
  createGroup as createPastoral,
  listActiveGroups,
  setGroupStatus,
  expressGroupInterest,
  listMyGroupInterests,
} from "@/server/modules/pastorais/service";
import { listMyNotifications } from "@/server/modules/notifications/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O convite entregava alguém numa tela e o app não pedia nada. Estes testes
 * cobrem o que sustenta as boas-vindas: o marcador de "já viu", e a
 * consequência de escolher uma pastoral no terceiro passo.
 */
describe("boas-vindas de quem acabou de entrar", () => {
  let parishId: string;
  let parocoId: string;
  let novatoId: string;
  let pastoralId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Par BemVindo ${stamp}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const [paroco, novato] = await Promise.all([
      registerUser({
        fullName: "Pe. Anfitrião",
        email: `paroco-bv-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Recém Chegado",
        email: `novato-bv-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
    ]);
    parocoId = paroco.id;
    novatoId = novato.id;
    userIds.push(paroco.id, novato.id);

    for (const [userId, role] of [
      [parocoId, "SACERDOTE"],
      [novatoId, "FIEL"],
    ] as const) {
      const convite = await createInvitation({ parishId, createdBy: parocoId, type: "link", role });
      await acceptInvitation({ code: convite.code, userId });
    }

    const pastoral = await createPastoral(parishId, parocoId, {
      name: `Pastoral do Acolhimento ${stamp}`,
      description: "Recebe quem chega.",
    });
    pastoralId = pastoral.id;
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("quem acabou de entrar ainda não passou pelas boas-vindas", async () => {
    const u = await prisma.user.findUniqueOrThrow({
      where: { id: novatoId },
      select: { onboardedAt: true },
    });
    // É este nulo que dispara o redirecionamento no layout.
    expect(u.onboardedAt).toBeNull();
  });

  it("as pastorais ativas são o que o terceiro passo oferece", async () => {
    const ativas = await listActiveGroups(parishId);
    expect(ativas.map((p) => p.id)).toContain(pastoralId);
  });

  it("pastoral encerrada não é oferecida a quem chega", async () => {
    const encerrada = await createPastoral(parishId, parocoId, { name: `Encerrada ${stamp}` });
    await setGroupStatus(parishId, encerrada.id, "inativa");

    const ativas = await listActiveGroups(parishId);
    expect(ativas.map((p) => p.id)).not.toContain(encerrada.id);
  });

  it("escolher a pastoral registra o interesse E avisa o responsável", async () => {
    // É isto que faz alguém de carne e osso procurar quem acabou de chegar
    // — o valor real do terceiro passo não é o registro, é o telefonema.
    await expressGroupInterest(parishId, pastoralId, novatoId);

    const meus = await listMyGroupInterests(parishId, novatoId);
    expect(meus.map((i) => i.groupId)).toContain(pastoralId);

    const doParoco = await listMyNotifications(parishId, parocoId);
    const aviso = doParoco.find((n) => n.title.includes("pastoral"));
    expect(aviso).toBeDefined();
    expect(aviso?.body).toContain("Recém Chegado");
  });

  it("concluir marca a data, e é o que impede perguntar de novo", async () => {
    await prisma.user.update({ where: { id: novatoId }, data: { onboardedAt: new Date() } });

    const u = await prisma.user.findUniqueOrThrow({
      where: { id: novatoId },
      select: { onboardedAt: true },
    });
    expect(u.onboardedAt).not.toBeNull();
  });

  it("pular também marca — o objetivo é não repetir, não obrigar", async () => {
    const outro = await registerUser({
      fullName: "Pulou Tudo",
      email: `pulou-bv-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(outro.id);

    // "Agora não" chama a mesma conclusão, sem escolher pastoral nenhuma.
    await prisma.user.update({ where: { id: outro.id }, data: { onboardedAt: new Date() } });

    const u = await prisma.user.findUniqueOrThrow({
      where: { id: outro.id },
      select: { onboardedAt: true },
    });
    expect(u.onboardedAt).not.toBeNull();
    expect(await listMyGroupInterests(parishId, outro.id)).toHaveLength(0);
  });
});
