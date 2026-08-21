import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish, changeMemberRole } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import { createParishPerson } from "@/server/modules/family/service";
import {
  createGroup,
  enrollFamilyMember,
  createSession,
  recordAttendance,
  createRite,
  getCatequeseOverview,
  getEnrollmentProgress,
  listEnrollmentsForCatechist,
  setMassAttendance,
  listMassAttendance,
  getGroup,
  getEnrollmentGroupId,
  requireEnrollmentAccess,
  requireSessionAccess,
  requireRiteAccess,
  listAttendanceForSession,
} from "@/server/modules/catequese/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("catequese: as três visões", () => {
  let parishId: string;
  let parocoId: string;
  let catequistaId: string;
  let outroCatequistaId: string;
  let turmaId: string;
  let outraTurmaId: string;
  let matriculaId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Par Catequese V ${stamp}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const [paroco, cat, outro] = await Promise.all([
      registerUser({
        fullName: "Pe. Coordenador",
        email: `paroco-cv-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Ana Catequista",
        email: `cat-cv-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
      registerUser({
        fullName: "Bia Catequista",
        email: `cat2-cv-${stamp}@test.comunidade.app`,
        password: "SenhaForte123",
      }),
    ]);
    parocoId = paroco.id;
    catequistaId = cat.id;
    outroCatequistaId = outro.id;
    userIds.push(paroco.id, cat.id, outro.id);

    for (const [userId, role] of [
      [parocoId, "SACERDOTE"],
      [catequistaId, "CATEQUISTA"],
      [outroCatequistaId, "CATEQUISTA"],
    ] as const) {
      const convite = await createInvitation({ parishId, createdBy: parocoId, type: "link", role });
      await acceptInvitation({ code: convite.code, userId });
    }
    await changeMemberRole(parishId, parocoId, "PAROCO", catequistaId);

    const [t1, t2] = await Promise.all([
      createGroup({ parishId, name: `Eucaristia ${stamp}`, year: 2026, catechistUserId: catequistaId }),
      createGroup({ parishId, name: `Crisma ${stamp}`, year: 2026, catechistUserId: outroCatequistaId }),
    ]);
    turmaId = t1.id;
    outraTurmaId = t2.id;

    const aluno = await createParishPerson(parishId, {
      fullName: "Lucas Catequizando",
      guardianName: "Sra. Helena",
      guardianPhone: "(43) 98888-0000",
    });
    const matricula = await enrollFamilyMember(parishId, turmaId, aluno.id);
    matriculaId = matricula.id;
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("coordenação: números da catequese inteira", async () => {
    const visao = await getCatequeseOverview(parishId);

    expect(visao.turmas).toBe(2);
    expect(visao.matriculas).toBe(1);
    expect(visao.catequistas).toBe(2);
    expect(visao.turmasSemCatequista).toBe(0);
  });

  it("coordenação: aponta turma sem catequista, que é o que precisa de ação", async () => {
    await createGroup({ parishId, name: `Órfã ${stamp}`, year: 2026 });
    const visao = await getCatequeseOverview(parishId);
    expect(visao.turmasSemCatequista).toBe(1);
  });

  it("catequista enxerga só os catequizandos das SUAS turmas", async () => {
    const meus = await listEnrollmentsForCatechist(parishId, catequistaId);
    expect(meus).toHaveLength(1);
    expect(meus[0]?.familyMember.fullName).toBe("Lucas Catequizando");
    // O contato do responsável fora do app vem junto — é o que serve para
    // ligar quando o aluno falta.
    expect(meus[0]?.familyMember.guardianPhone).toBe("(43) 98888-0000");

    // A outra catequista não vê ninguém: a turma dela está vazia.
    expect(await listEnrollmentsForCatechist(parishId, outroCatequistaId)).toHaveLength(0);
  });

  it("catequista não alcança turma alheia", async () => {
    expect(await getGroup(parishId, outraTurmaId, catequistaId)).toBeNull();
    // Quem coordena alcança (sem o filtro).
    expect(await getGroup(parishId, outraTurmaId)).not.toBeNull();
  });

  it("presença na missa é lançada e contada — o que não existia", async () => {
    await setMassAttendance(parishId, matriculaId, new Date("2026-08-16"), true, catequistaId);
    await setMassAttendance(parishId, matriculaId, new Date("2026-08-23"), true, catequistaId);

    const missas = await listMassAttendance(parishId, matriculaId);
    expect(missas).toHaveLength(2);
  });

  it("lançar o mesmo domingo duas vezes não infla o acompanhamento", async () => {
    await setMassAttendance(parishId, matriculaId, new Date("2026-08-16"), true, catequistaId);
    expect(await listMassAttendance(parishId, matriculaId)).toHaveLength(2);
  });

  it("dá para desfazer um lançamento errado", async () => {
    await setMassAttendance(parishId, matriculaId, new Date("2026-08-16"), false, catequistaId);
    expect(await listMassAttendance(parishId, matriculaId)).toHaveLength(1);
  });

  it("dá para saber a turma de uma matrícula sem ler nome nenhum", async () => {
    // Regressão de vazamento: a página da ficha autoriza ANTES de buscar os
    // dados, porque o payload do React Server Components carrega o que foi
    // lido durante o render — mesmo terminando em notFound(), o nome do
    // catequizando viajava na resposta para quem não podia vê-lo.
    const groupId = await getEnrollmentGroupId(parishId, matriculaId);
    expect(groupId).toBe(turmaId);

    // E devolve null para matrícula inexistente, sem estourar.
    expect(
      await getEnrollmentGroupId(parishId, "00000000-0000-0000-0000-000000000000"),
    ).toBeNull();
  });

  it("a ficha do catequizando conta só encontros JÁ realizados", async () => {
    // Um encontro no passado, com presença; outro marcado para o futuro.
    const passado = await createSession(parishId, turmaId, {
      date: new Date("2026-08-10"),
      topic: "A criação",
    });
    await createSession(parishId, turmaId, { date: new Date("2099-01-01"), topic: "Ainda vem" });
    await recordAttendance(parishId, passado.id, [{ enrollmentId: matriculaId, present: true }]);
    await createRite(parishId, matriculaId, { name: "Primeira Eucaristia" });

    const progresso = await getEnrollmentProgress(parishId, matriculaId);

    expect(progresso).not.toBeNull();
    // Se o encontro futuro entrasse na conta, a família veria "1 de 2" e
    // acharia que o filho faltou a um encontro que ainda nem houve.
    expect(progresso?.resumo.encontrosRealizados).toBe(1);
    expect(progresso?.resumo.presencas).toBe(1);
    expect(progresso?.resumo.missas).toBe(1);
    expect(progresso?.ritos).toHaveLength(1);
    expect(progresso?.encontros).toHaveLength(2); // a lista mostra os dois
  });
  it("catequista não escreve na turma alheia — presença, rito, nem conclusão", async () => {
    // A permissão CATEQUESE_TEACH diz "é catequista", não "é catequista
    // DESTA turma". A leitura já respeitava esse limite; as ações de
    // escrita recebiam os ids do formulário e gravavam sem conferir.
    const encontroDaAna = await createSession(parishId, turmaId, {
      date: new Date("2026-09-01"),
      topic: "Só da Ana",
    });
    const rito = await createRite(parishId, matriculaId, { name: "Crisma" });

    // Bia é catequista, mas de OUTRA turma.
    await expect(
      requireEnrollmentAccess(parishId, matriculaId, outroCatequistaId, false),
    ).rejects.toThrow(/não é sua/i);
    await expect(
      requireSessionAccess(parishId, encontroDaAna.id, outroCatequistaId, false),
    ).rejects.toThrow(/não é sua/i);
    await expect(requireRiteAccess(parishId, rito.id, outroCatequistaId, false)).rejects.toThrow(
      /não é sua/i,
    );

    // Ana, dona da turma, passa.
    expect(await requireEnrollmentAccess(parishId, matriculaId, catequistaId, false)).toBe(turmaId);
    expect(await requireSessionAccess(parishId, encontroDaAna.id, catequistaId, false)).toBe(turmaId);

    // E quem coordena alcança qualquer turma.
    expect(await requireEnrollmentAccess(parishId, matriculaId, outroCatequistaId, true)).toBe(
      turmaId,
    );
  });

  it("chamada ignora matrícula que não é da turma do encontro", async () => {
    // Mesmo que o id chegue no formulário, não pode virar linha de presença:
    // seria gravar presença de aluno de outra turma.
    const alunoDaOutra = await createParishPerson(parishId, { fullName: "Aluno da Outra Turma" });
    const matriculaAlheia = await enrollFamilyMember(parishId, outraTurmaId, alunoDaOutra.id);

    const encontro = await createSession(parishId, turmaId, {
      date: new Date("2026-09-08"),
      topic: "Chamada",
    });

    await recordAttendance(parishId, encontro.id, [
      { enrollmentId: matriculaId, present: true },
      { enrollmentId: matriculaAlheia.id, present: true },
    ]);

    const presencas = await listAttendanceForSession(parishId, encontro.id);
    expect(presencas).toHaveLength(1);
    expect(presencas[0]?.enrollmentId).toBe(matriculaId);
  });
});
