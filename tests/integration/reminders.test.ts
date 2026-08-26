import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withTenantContext } from "@/server/db/tenant-context";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { collectCommitments, sendCommitmentReminders } from "@/server/modules/reminders/service";
import { listMyNotifications } from "@/server/modules/notifications/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O ponto delicado aqui é o FUSO. "Compromissos de amanhã" calculado em UTC
 * jogaria uma missa das 19h (22h UTC) para o dia seguinte — a pessoa seria
 * avisada com um dia de atraso, ou não seria avisada. Por isso os testes
 * usam horários noturnos de propósito.
 */
describe("lembretes de compromissos assumidos", () => {
  let parishId: string;
  let outraParishId: string;
  let fielId: string;
  let parocoId: string;
  let priestProfileId: string;
  let celebrationId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  // Referência fixa: 20/08/2026, 11h UTC = 8h em Brasília.
  const agora = new Date("2026-08-20T11:00:00.000Z");
  // 19h de Brasília do dia 21 = 22h UTC do dia 21.
  const missaAmanha = new Date("2026-08-21T22:00:00.000Z");
  // 19h de Brasília do dia 20 (hoje, mais tarde).
  const missaHoje = new Date("2026-08-20T22:00:00.000Z");
  // 19h de Brasília do dia 22 — fora da janela.
  const missaDepois = new Date("2026-08-22T22:00:00.000Z");

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();

    const [p, outra] = await Promise.all([
      registerParish({ name: `Par Lembrete ${stamp}`, city: "Londrina", state: "PR" }),
      registerParish({ name: `Par Outra ${stamp}`, city: "Maringá", state: "PR" }),
    ]);
    parishId = p.id;
    outraParishId = outra.id;
    parishIds.push(p.id, outra.id);

    const paroco = await registerUser({
      fullName: "Pe. Lembrete",
      email: `paroco-lembrete-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const fiel = await registerUser({
      fullName: "Fiel Escalado",
      email: `fiel-lembrete-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    parocoId = paroco.id;
    fielId = fiel.id;
    userIds.push(paroco.id, fiel.id);

    const conviteParoco = await createInvitation({
      parishId,
      createdBy: paroco.id,
      type: "link",
      role: "SACERDOTE",
    });
    await acceptInvitation({ code: conviteParoco.code, userId: parocoId });

    const convite = await createInvitation({
      parishId,
      createdBy: parocoId,
      type: "link",
      role: "FIEL",
    });
    await acceptInvitation({ code: convite.code, userId: fielId });

    await withTenantContext(parishId, async (tx) => {
      const priest = await tx.priestProfile.findFirstOrThrow({ where: { parishId } });
      priestProfileId = priest.id;

      const celebracao = await tx.celebration.create({
        data: {
          parishId,
          type: "missa",
          title: "Missa dominical",
          startsAt: missaAmanha,
          location: "Igreja Matriz",
          createdBy: parocoId,
        },
      });
      celebrationId = celebracao.id;

      await tx.liturgicalSchedule.create({
        data: { parishId, celebrationId: celebracao.id, roleType: "leitor", userId: fielId },
      });
    });
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("acha a escala litúrgica de amanhã", async () => {
    const compromissos = await collectCommitments(agora);
    const meus = compromissos.filter((c) => c.userId === fielId);

    expect(meus).toHaveLength(1);
    expect(meus[0]?.when).toBe("amanha");
    expect(meus[0]?.title).toContain("amanhã");
    expect(meus[0]?.body).toContain("Leitor");
    expect(meus[0]?.body).toContain("Igreja Matriz");
  });

  it("mostra o horário em Brasília, não em UTC", async () => {
    const compromissos = await collectCommitments(agora);
    const meu = compromissos.find((c) => c.userId === fielId);
    // 22h UTC = 19h em Brasília. Se aparecesse "22:00" o fuso estaria errado.
    expect(meu?.body).toContain("19:00");
    expect(meu?.body).not.toContain("22:00");
  });

  it("uma celebração noturna de HOJE não escapa para o dia seguinte", async () => {
    await withTenantContext(parishId, async (tx) => {
      await tx.celebration.update({ where: { id: celebrationId }, data: { startsAt: missaHoje } });
    });

    const compromissos = await collectCommitments(agora);
    const meu = compromissos.find((c) => c.userId === fielId);
    expect(meu?.when).toBe("hoje");
    expect(meu?.title).toContain("hoje");
  });

  it("compromisso de depois de amanhã fica de fora da janela", async () => {
    await withTenantContext(parishId, async (tx) => {
      await tx.celebration.update({ where: { id: celebrationId }, data: { startsAt: missaDepois } });
    });

    const compromissos = await collectCommitments(agora);
    expect(compromissos.filter((c) => c.userId === fielId)).toHaveLength(0);

    await withTenantContext(parishId, async (tx) => {
      await tx.celebration.update({ where: { id: celebrationId }, data: { startsAt: missaAmanha } });
    });
  });

  it("inclui atendimento confirmado, e ignora o que ainda é só solicitado", async () => {
    const atendimentoId = await withTenantContext(parishId, async (tx) => {
      const a = await tx.appointment.create({
        data: {
          parishId,
          fielUserId: fielId,
          priestProfileId,
          category: "conversa",
          scheduledAt: missaAmanha,
          status: "solicitado",
        },
      });
      return a.id;
    });

    // Solicitado ainda não é compromisso: o sacerdote não confirmou.
    let compromissos = await collectCommitments(agora);
    expect(compromissos.filter((c) => c.tag.startsWith("atendimento-"))).toHaveLength(0);

    await withTenantContext(parishId, async (tx) => {
      await tx.appointment.update({ where: { id: atendimentoId }, data: { status: "confirmado" } });
    });

    compromissos = await collectCommitments(agora);
    const atendimento = compromissos.find((c) => c.tag === `atendimento-${atendimentoId}`);
    expect(atendimento?.userId).toBe(fielId);
    expect(atendimento?.title).toContain("atendimento");
  });

  it("cada compromisso tem tag estável — não empilha aviso repetido", async () => {
    const compromissos = await collectCommitments(agora);
    const tags = compromissos.map((c) => c.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it("não vaza compromisso de uma paróquia para outra", async () => {
    const compromissos = await collectCommitments(agora);
    // Tudo o que veio pertence a uma das paróquias que criamos, e nada da
    // outra paróquia (que não tem compromisso nenhum) aparece.
    expect(compromissos.filter((c) => c.parishId === outraParishId)).toHaveLength(0);
    expect(compromissos.every((c) => typeof c.parishId === "string")).toBe(true);
  });

  it("o aviso leva para o lugar do próprio compromisso", async () => {
    // Escala vai para a liturgia, mutirão para Servir, atendimento para os
    // atendimentos. Mandar tudo para o mesmo lugar deixa a pessoa
    // procurando na tela errada o que ela acabou de ser avisada.
    await sendCommitmentReminders(agora);

    const avisos = await listMyNotifications(parishId, fielId);
    const escala = avisos.find((n) => n.title.includes("liturgia"));
    const atendimento = avisos.find((n) => n.title.includes("atendimento"));

    expect(escala?.linkPath).toBe("/servir/liturgia");
    expect(atendimento?.linkPath).toBe("/eu/atendimentos");
  });

  it("rodar de novo no mesmo dia NÃO avisa a pessoa duas vezes", async () => {
    // A Vercel repete o job quando ele falha. Sem trava, quem tem uma missa
    // amanhã seria acordado duas vezes pela mesma missa.
    const antes = (await listMyNotifications(parishId, fielId)).length;

    const resultado = await sendCommitmentReminders(agora);

    const depois = (await listMyNotifications(parishId, fielId)).length;
    expect(depois).toBe(antes);
    expect(resultado.avisosNoApp).toBe(0);
    expect(resultado.repetidos).toBe(resultado.compromissos);
  });
});