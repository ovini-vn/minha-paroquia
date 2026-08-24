import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withTenantContext } from "@/server/db/tenant-context";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { montarResumo, ehDiaDoResumo, enviarResumoSemanal } from "@/server/modules/digest/service";
import { listMyNotifications } from "@/server/modules/notifications/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O resumo semanal é o ÚNICO aviso que alcança quem não serve. Todo o resto
 * depende de a pessoa ter um compromisso — e quem apenas vai à missa aos
 * domingos, que é a maioria, nunca recebia nada.
 */
describe("resumo semanal da paróquia", () => {
  let comMissasId: string;
  let vaziaId: string;
  let parocoId: string;
  let fielId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  // Sábado, 22/08/2026, 11h UTC = 8h em Brasília.
  const sabado = new Date("2026-08-22T11:00:00.000Z");
  // Quarta da mesma semana.
  const quarta = new Date("2026-08-19T11:00:00.000Z");

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const [a, b] = await Promise.all([
      registerParish({ name: `Par Resumo ${stamp}` }),
      registerParish({ name: `Par Vazia ${stamp}` }),
    ]);
    comMissasId = a.id;
    vaziaId = b.id;
    parishIds.push(a.id, b.id);

    const [paroco, fiel] = await Promise.all([
      registerUser({
        fullName: "Pe. Resumo",
        email: `paroco-r-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Fiel Que Só Vai À Missa",
        email: `fiel-r-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
    ]);
    parocoId = paroco.id;
    fielId = fiel.id;
    userIds.push(paroco.id, fiel.id);

    for (const [userId, role] of [
      [parocoId, "SACERDOTE"],
      [fielId, "FIEL"],
    ] as const) {
      const convite = await createInvitation({
        parishId: comMissasId,
        createdBy: parocoId,
        type: "link",
        role,
      });
      await acceptInvitation({ code: convite.code, userId });
    }

    await withTenantContext(comMissasId, async (tx) => {
      // Domingo 23/08 às 19h de Brasília (22h UTC) e quarta 26/08 às 7h.
      await tx.celebration.createMany({
        data: [
          {
            parishId: comMissasId,
            type: "missa",
            title: "Missa dominical",
            startsAt: new Date("2026-08-23T22:00:00.000Z"),
            createdBy: parocoId,
          },
          {
            parishId: comMissasId,
            type: "missa",
            title: "Missa da manhã",
            startsAt: new Date("2026-08-26T10:00:00.000Z"),
            createdBy: parocoId,
          },
          // Fora da janela de 7 dias — não deve entrar na conta.
          {
            parishId: comMissasId,
            type: "missa",
            title: "Missa do mês que vem",
            startsAt: new Date("2026-09-20T22:00:00.000Z"),
            createdBy: parocoId,
          },
        ],
      });
      await tx.event.create({
        data: {
          parishId: comMissasId,
          title: "Bazar beneficente",
          // 27/08 às 10h de Brasília — dentro da janela de sete dias, que
          // fecha no sábado seguinte às 8h.
          startsAt: new Date("2026-08-27T13:00:00.000Z"),
          createdBy: parocoId,
        },
      });
    });
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("é sábado em Brasília que manda, não em UTC", () => {
    expect(ehDiaDoResumo(sabado)).toBe(true);
    expect(ehDiaDoResumo(quarta)).toBe(false);

    // 02h UTC de domingo ainda é sábado à noite em Brasília — se a decisão
    // fosse tomada em UTC, o resumo sairia no dia errado.
    expect(ehDiaDoResumo(new Date("2026-08-23T02:00:00.000Z"))).toBe(true);
  });

  it("conta só o que acontece nos próximos sete dias", async () => {
    const resumo = await montarResumo(comMissasId, sabado);

    expect(resumo).not.toBeNull();
    // A missa de setembro fica de fora.
    expect(resumo?.celebracoes).toBe(2);
    expect(resumo?.eventos).toBe(1);
  });

  it("nomeia os próximos com dia e horário de Brasília", async () => {
    const resumo = await montarResumo(comMissasId, sabado);

    expect(resumo?.linhas[0]).toContain("Missa dominical");
    // 22h UTC de 23/08 = 19h de domingo em Brasília.
    expect(resumo?.linhas[0]).toContain("19:00");
    expect(resumo?.linhas[0]).not.toContain("22:00");
    expect(resumo?.linhas.join(" ")).toContain("Bazar beneficente");
  });

  it("paróquia sem nada na semana NÃO recebe resumo", async () => {
    // Mandar "nada esta semana" ensina a pessoa que a notificação daqui
    // não vale a pena abrir — e a próxima, que importa, chega
    // desacreditada.
    expect(await montarResumo(vaziaId, sabado)).toBeNull();
  });

  it("alcança quem não tem compromisso nenhum", async () => {
    const resultado = await enviarResumoSemanal(sabado);
    expect(resultado.paroquias).toBeGreaterThanOrEqual(1);

    // O fiel não está escalado para nada — e mesmo assim recebeu.
    const doFiel = await listMyNotifications(comMissasId, fielId);
    const resumo = doFiel.find((n) => n.title === "Esta semana na sua paróquia");

    expect(resumo).toBeDefined();
    expect(resumo?.body).toContain("2 celebrações");
    expect(resumo?.body).toContain("Missa dominical");
    expect(resumo?.category).toBe("pastoral");
  });

  it("a paróquia vazia entra na contagem de puladas, não de enviadas", async () => {
    const resultado = await enviarResumoSemanal(sabado);
    expect(resultado.pulou).toBeGreaterThanOrEqual(1);
  });
});
