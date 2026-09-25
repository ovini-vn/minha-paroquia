import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { createGroup, expressGroupInterest } from "@/server/modules/pastorais/service";
import { adicionarMembroPorNome, papelNoGrupo } from "@/server/modules/grupos/service";
import {
  adicionarMembroPorEmail,
  assumirTarefa,
  criarTarefa,
  entrarPeloConvite,
  estaSeAfastando,
  gerarConviteDoGrupo,
  lembrarInteressesParados,
  listarRecados,
  publicarRecado,
  quemEstaSeAfastando,
  salvarChamada,
} from "@/server/modules/grupos/vida-do-grupo";
import { collectCommitments } from "@/server/modules/reminders/service";
import { withTenantContext } from "@/server/db/tenant-context";
import { paraOBanco } from "@/lib/grupos/cronograma";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * A vida de um grupo entre os encontros: recado, chamada, tarefas, convite
 * e o interesse que não pode ficar sem resposta.
 */
describe("a vida do grupo", () => {
  const stamp = Date.now();
  const userIds: string[] = [];
  const parishIds: string[] = [];
  let parishId: string;
  let vizinhaId: string;
  let grupoId: string;
  let coordId: string;
  let anaId: string;
  let beaId: string;
  let deForaId: string;
  let deOutraId: string;
  const encontros: string[] = [];

  const conta = async (nome: string, apelido: string, paroquia: string) => {
    const u = await registerUser({
      fullName: nome,
      email: `${apelido}-vg-${stamp}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(u.id);
    const convite = await createInvitation({ parishId: paroquia, createdBy: u.id, type: "link", role: "FIEL" });
    await acceptInvitation({ code: convite.code, userId: u.id });
    return u.id;
  };

  const avisosDe = (userId: string) =>
    withTenantContext(parishId, (tx) => tx.notification.findMany({ where: { parishId, userId }, orderBy: { createdAt: "desc" } }));

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const [p, v] = await Promise.all([
      registerParish({ name: `Par Vida Grupo ${stamp}` }),
      registerParish({ name: `Par Vida Vizinha ${stamp}` }),
    ]);
    parishId = p.id;
    vizinhaId = v.id;
    parishIds.push(p.id, v.id);

    coordId = await conta("Carla Coordenadora Lima", "coord", parishId);
    anaId = await conta("Ana Membro Souza", "ana", parishId);
    beaId = await conta("Bea Membro Rocha", "bea", parishId);
    deForaId = await conta("Davi De Fora Nunes", "fora", parishId);
    deOutraId = await conta("Olga Outra Paroquia", "outra", vizinhaId);

    const grupo = await createGroup(parishId, coordId, { name: "Grupo de Jovens" });
    grupoId = grupo.id;
    await adicionarMembroPorNome(parishId, grupoId, "Carla Coordenadora Lima", "coordenador", coordId);
    await adicionarMembroPorNome(parishId, grupoId, "Ana Membro Souza", "membro", coordId);
    await adicionarMembroPorNome(parishId, grupoId, "Bea Membro Rocha", "membro", coordId);

    for (const dia of ["2026-09-06", "2026-09-13", "2026-09-20", "2026-12-10"]) {
      const e = await withTenantContext(parishId, (tx) =>
        tx.encontroDoGrupo.create({
          data: { parishId, groupId: grupoId, createdBy: coordId, data: paraOBanco(dia), tema: `Encontro ${dia}` },
        }),
      );
      encontros.push(e.id);
    }
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("o recado chega a cada membro — menos a quem escreveu — e fica na página", async () => {
    const { avisados } = await publicarRecado(parishId, grupoId, coordId, "Domingo começamos às 16h30.");
    expect(avisados).toBe(2);
    expect((await avisosDe(anaId))[0]?.title).toBe("Recado de Grupo de Jovens");
    expect((await avisosDe(coordId)).some((n) => n.title.startsWith("Recado de"))).toBe(false);
    expect((await listarRecados(parishId, grupoId))[0]?.texto).toBe("Domingo começamos às 16h30.");
    await expect(publicarRecado(parishId, grupoId, coordId, "   ")).rejects.toThrow(/Escreva/);
  });

  it("três faltas seguidas acendem o alerta, uma vez só", () => {
    expect(estaSeAfastando([false, false, false])).toBe(true);
    expect(estaSeAfastando([false, false, true, false])).toBe(false);
    expect(estaSeAfastando([false, false])).toBe(false);
  });

  it("a chamada avisa a coordenação de quem está se afastando, sem repetir", async () => {
    const [e1, e2, e3] = encontros;
    await salvarChamada(parishId, grupoId, e1!, coordId, [
      { userId: anaId, presente: false },
      { userId: beaId, presente: true },
    ]);
    await salvarChamada(parishId, grupoId, e2!, coordId, [{ userId: anaId, presente: false }]);
    const terceira = await salvarChamada(parishId, grupoId, e3!, coordId, [
      { userId: anaId, presente: false },
      { userId: beaId, presente: true },
      // Quem não é do grupo é ignorado: não se marca falta de estranho.
      { userId: deForaId, presente: false },
    ]);
    expect(terceira.seAfastando).toEqual([anaId]);
    expect(terceira.salvas).toBe(2);

    const alertas = (await avisosDe(coordId)).filter((n) => n.title.includes("faltou aos últimos"));
    expect(alertas).toHaveLength(1);

    // Refazer a chamada do mesmo domingo não repete o aviso.
    await salvarChamada(parishId, grupoId, e3!, coordId, [{ userId: anaId, presente: false }]);
    expect((await avisosDe(coordId)).filter((n) => n.title.includes("faltou aos últimos"))).toHaveLength(1);

    expect((await quemEstaSeAfastando(parishId, grupoId)).map((p) => p.userId)).toEqual([anaId]);
  });

  it("a tarefa só fica com alguém do grupo, e quem é do grupo assume a que está livre", async () => {
    const futuro = encontros[3]!;
    await expect(criarTarefa(parishId, grupoId, futuro, "Lanche", deForaId)).rejects.toThrow(/alguém do grupo/);
    const livre = await criarTarefa(parishId, grupoId, futuro, "Lanche", null);
    await assumirTarefa(parishId, grupoId, livre.id, beaId);
    await expect(assumirTarefa(parishId, grupoId, livre.id, anaId)).rejects.toThrow(/já tem alguém/);
    await expect(assumirTarefa(parishId, grupoId, livre.id, deForaId)).rejects.toThrow(/Só quem é do grupo/);
  });

  it("o robô lembra, na véspera, quem ficou com uma tarefa", async () => {
    const compromissos = await collectCommitments(new Date("2026-12-09T11:00:00Z"));
    const daTarefa = compromissos.filter((c) => c.parishId === parishId && c.tag.startsWith("tarefa-"));
    expect(daTarefa).toHaveLength(1);
    expect(daTarefa[0]).toMatchObject({ userId: beaId, title: "Amanhã você fica com: Lanche" });
  });

  it("o convite do grupo põe quem é da paróquia para dentro, e o novo link desliga o velho", async () => {
    const antigo = await gerarConviteDoGrupo(parishId, grupoId);
    const novo = await gerarConviteDoGrupo(parishId, grupoId);
    await expect(entrarPeloConvite(antigo, deForaId)).rejects.toThrow(/não vale mais/);

    const r = await entrarPeloConvite(novo, deForaId);
    expect(r).toMatchObject({ groupId: grupoId, jaEra: false });
    expect(await papelNoGrupo(parishId, grupoId, deForaId)).toBe("membro");

    await expect(entrarPeloConvite(novo, deOutraId)).rejects.toThrow(/outra paróquia/);
  });

  it("o e-mail resolve quem não se acha pelo nome — e só dentro da paróquia", async () => {
    await expect(
      adicionarMembroPorEmail(parishId, grupoId, `outra-vg-${stamp}@test.comunidade.app`, "membro", coordId),
    ).rejects.toThrow(/Não achei/);
    const r = await adicionarMembroPorEmail(parishId, grupoId, `  ANA-vg-${stamp}@test.comunidade.app `, "membro", coordId);
    expect(r).toMatchObject({ fullName: "Ana Membro Souza", jaEra: true });
  });

  it("interesse sem resposta há uma semana lembra a coordenação uma vez", async () => {
    const interessado = await conta("Ivo Interessado Paz", "ivo", parishId);
    await expressGroupInterest(parishId, grupoId, interessado);
    await withTenantContext(parishId, (tx) =>
      tx.pastoralGroupInterest.updateMany({
        where: { parishId, userId: interessado },
        data: { createdAt: new Date(Date.now() - 8 * 86_400_000) },
      }),
    );

    expect(await lembrarInteressesParados(new Date())).toBeGreaterThanOrEqual(1);
    const lembretes = (await avisosDe(coordId)).filter((n) => n.title === "Ivo Interessado Paz ainda espera uma resposta");
    expect(lembretes).toHaveLength(1);

    await lembrarInteressesParados(new Date());
    expect((await avisosDe(coordId)).filter((n) => n.title === "Ivo Interessado Paz ainda espera uma resposta")).toHaveLength(1);
  });
});
