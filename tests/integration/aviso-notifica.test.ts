import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { createAviso, updateAviso } from "@/server/modules/avisos/service";
import { listMyNotifications, setPreference } from "@/server/modules/notifications/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O conteúdo mais sensível ao tempo que a paróquia produz não avisava
 * ninguém: dependia de alguém abrir o app por acaso e ver.
 */
describe("aviso da secretaria notifica a comunidade", () => {
  let parishId: string;
  let outraParishId: string;
  let secretariaId: string;
  let fielId: string;
  let outroFielId: string;
  let vizinhoId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const [p, outra] = await Promise.all([
      registerParish({ name: `Par Aviso ${stamp}` }),
      registerParish({ name: `Par Vizinha Aviso ${stamp}` }),
    ]);
    parishId = p.id;
    outraParishId = outra.id;
    parishIds.push(p.id, outra.id);

    const [sec, fiel, outro, vizinho] = await Promise.all([
      registerUser({
        fullName: "Secretária",
        email: `sec-a-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Fiel Um",
        email: `fiel1-a-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Fiel Dois",
        email: `fiel2-a-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Fiel da Vizinha",
        email: `viz-a-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
    ]);
    secretariaId = sec.id;
    fielId = fiel.id;
    outroFielId = outro.id;
    vizinhoId = vizinho.id;
    userIds.push(sec.id, fiel.id, outro.id, vizinho.id);

    for (const [userId, role] of [
      [secretariaId, "SECRETARIA"],
      [fielId, "FIEL"],
      [outroFielId, "FIEL"],
    ] as const) {
      const convite = await createInvitation({ parishId, createdBy: secretariaId, type: "link", role });
      await acceptInvitation({ code: convite.code, userId });
    }
    const conviteVizinho = await createInvitation({
      parishId: outraParishId,
      createdBy: vizinhoId,
      type: "link",
      role: "FIEL",
    });
    await acceptInvitation({ code: conviteVizinho.code, userId: vizinhoId });
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("todo mundo da paróquia é avisado, com o conteúdo junto", async () => {
    await createAviso({
      parishId,
      createdBy: secretariaId,
      title: "Mudança de horário neste domingo",
      body: "Atenção: neste domingo a missa das 19h será realizada às 18h.",
    });

    for (const userId of [fielId, outroFielId]) {
      const avisos = await listMyNotifications(parishId, userId);
      const n = avisos.find((x) => x.title === "Mudança de horário neste domingo");

      expect(n).toBeDefined();
      // O conteúdo vai junto: um "confira no app" obrigaria a pessoa a
      // abrir só para descobrir se era importante.
      expect(n?.body).toContain("19h será realizada às 18h");
      // urgente, não espiritual — quem silenciou a Palavra do Padre não
      // pode perder a mudança de horário da missa.
      expect(n?.category).toBe("urgente");
    }
  });

  it("quem publicou não recebe aviso de si mesmo", async () => {
    const daSecretaria = await listMyNotifications(parishId, secretariaId);
    expect(daSecretaria.some((n) => n.title === "Mudança de horário neste domingo")).toBe(false);
  });

  it("não atravessa para a paróquia vizinha", async () => {
    const daVizinha = await listMyNotifications(outraParishId, vizinhoId);
    expect(daVizinha).toHaveLength(0);
  });

  it("corrigir o texto depois NÃO avisa de novo", async () => {
    const antes = (await listMyNotifications(parishId, fielId)).length;

    const aviso = (await listMyNotifications(parishId, fielId))[0];
    expect(aviso).toBeDefined();
    await updateAviso(parishId, aviso!.id, {
      title: "Mudança de horário neste domingo",
      body: "Corrigindo: a missa das 19h será às 18h30.",
    });

    expect((await listMyNotifications(parishId, fielId)).length).toBe(antes);
  });

  it("respeita quem desligou a categoria", async () => {
    await setPreference(outroFielId, "urgente", false);
    const antes = (await listMyNotifications(parishId, outroFielId)).length;

    await createAviso({
      parishId,
      createdBy: secretariaId,
      title: "Segundo aviso",
      body: "Este não deve chegar para quem desligou urgentes.",
    });

    expect((await listMyNotifications(parishId, outroFielId)).length).toBe(antes);
    // Mas continua chegando para quem não desligou.
    const doFiel = await listMyNotifications(parishId, fielId);
    expect(doFiel.some((n) => n.title === "Segundo aviso")).toBe(true);
  });

  it("aviso comprido é resumido, não truncado no meio de nada", async () => {
    const longo = "palavra ".repeat(60).trim();
    await createAviso({ parishId, createdBy: secretariaId, title: "Aviso longo", body: longo });

    const n = (await listMyNotifications(parishId, fielId)).find((x) => x.title === "Aviso longo");
    expect(n?.body.length).toBeLessThanOrEqual(140);
    expect(n?.body.endsWith("…")).toBe(true);
  });
});
