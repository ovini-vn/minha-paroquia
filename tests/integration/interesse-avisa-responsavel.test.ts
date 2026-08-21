import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish, changeMemberRole } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { createOpportunity, expressInterest } from "@/server/modules/opportunities/service";
import { listMyNotifications } from "@/server/modules/notifications/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O fiel se oferecia para servir e NINGUÉM era avisado — o interesse ficava
 * numa lista que alguém precisava lembrar de abrir. Quem se dispõe e não
 * recebe resposta não se dispõe uma segunda vez.
 */
describe("quem se oferece para servir avisa o responsável", () => {
  let parishId: string;
  let parocoId: string;
  let coordenadorId: string;
  let fielId: string;
  let opportunityId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Par Servir ${stamp}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const [paroco, coord, fiel] = await Promise.all([
      registerUser({
        fullName: "Pe. Responsável",
        email: `paroco-s-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Coordenadora Pastoral",
        email: `coord-s-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Maria Voluntária",
        email: `fiel-s-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
    ]);
    parocoId = paroco.id;
    coordenadorId = coord.id;
    fielId = fiel.id;
    userIds.push(paroco.id, coord.id, fiel.id);

    for (const [userId, role] of [
      [parocoId, "SACERDOTE"],
      [coordenadorId, "COORDENADOR_PASTORAL"],
      [fielId, "FIEL"],
    ] as const) {
      const convite = await createInvitation({ parishId, createdBy: parocoId, type: "link", role });
      await acceptInvitation({ code: convite.code, userId });
    }
    await changeMemberRole(parishId, parocoId, "PAROCO", fielId);

    const oportunidade = await createOpportunity({
      parishId,
      createdBy: parocoId,
      title: "Montagem do presépio",
      description: "Precisamos de ajuda no sábado.",
    });
    opportunityId = oportunidade.id;
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("avisa quem criou a oportunidade, com o nome de quem se ofereceu", async () => {
    await expressInterest(parishId, opportunityId, fielId);

    const avisos = await listMyNotifications(parishId, parocoId);
    const aviso = avisos.find((n) => n.title.includes("se ofereceu"));

    expect(aviso).toBeDefined();
    expect(aviso?.body).toContain("Maria Voluntária");
    expect(aviso?.body).toContain("Montagem do presépio");
    expect(aviso?.category).toBe("pastoral");
  });

  it("avisa também quem responde pela área, não só quem criou", async () => {
    // Se a pessoa que criou sair da paróquia, o aviso ainda tem que chegar
    // a alguém — senão volta a ser o problema que ele resolve.
    const avisos = await listMyNotifications(parishId, coordenadorId);
    expect(avisos.some((n) => n.title.includes("se ofereceu"))).toBe(true);
  });

  it("não avisa a própria pessoa que se ofereceu", async () => {
    const avisos = await listMyNotifications(parishId, fielId);
    expect(avisos.some((n) => n.title.includes("se ofereceu"))).toBe(false);
  });

  it("reapertar o botão não gera aviso repetido", async () => {
    const antes = (await listMyNotifications(parishId, parocoId)).filter((n) =>
      n.title.includes("se ofereceu"),
    ).length;

    await expressInterest(parishId, opportunityId, fielId);
    await expressInterest(parishId, opportunityId, fielId);

    const depois = (await listMyNotifications(parishId, parocoId)).filter((n) =>
      n.title.includes("se ofereceu"),
    ).length;

    expect(depois).toBe(antes);
  });
});
