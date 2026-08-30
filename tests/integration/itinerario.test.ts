import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createFamilyMember } from "@/server/modules/family/service";
import {
  createGroup,
  createSession,
  enrollFamilyMember,
  registrarMissaDaTurma,
  listarMissaDaTurma,
  getEnrollmentProgress,
  criarItinerario,
  criarTema,
  definirItinerarioDaTurma,
  listarItinerarios,
  listarTemasDaTurma,
  obterAndamentoDaTurma,
  obterQuadroDaCoordenacao,
} from "@/server/modules/catequese/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O itinerário: o plano digitado pela paróquia contra o qual se mede a
 * evolução da turma.
 *
 * O que estes testes protegem, além do caminho feliz: um tema de OUTRA
 * paróquia não pode entrar no encontro de uma turma daqui. É a mesma classe
 * de furo que o RLS fecha no banco, e aqui é conferida na regra.
 */
describe("itinerário da catequese", () => {
  let parishId: string;
  let outraParishId: string;
  let catequistaId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Itinerário ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const outra = await registerParish({ name: `Paróquia Vizinha It ${Date.now()}` });
    outraParishId = outra.id;
    parishIds.push(outra.id);

    const catequista = await registerUser({
      fullName: "Catequista Itinerário",
      email: `catequista-it-${Date.now()}@test.comunidade.app`,
      password: "Senha@12345",
    });
    catequistaId = catequista.id;
    userIds.push(catequista.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ parishIds, userIds });
  });

  it("a paróquia digita o itinerário e os encontros entram na ordem", async () => {
    const itinerario = await criarItinerario(parishId, {
      nome: "Eucaristia · 1º ano",
      descricao: "Material da arquidiocese",
    });

    // Sem informar ordem: cada tema entra no fim, que é a sequência em que a
    // coordenação digita.
    await criarTema(parishId, itinerario.id, { titulo: "Deus é Pai" });
    await criarTema(parishId, itinerario.id, { titulo: "Jesus nos ensina a rezar" });
    await criarTema(parishId, itinerario.id, { titulo: "A Eucaristia" });

    const lista = await listarItinerarios(parishId);
    const meu = lista.find((i) => i.id === itinerario.id);
    expect(meu?._count.temas).toBe(3);
  });

  it("sem itinerário, a turma não oferece tema nenhum ao catequista", async () => {
    const turma = await createGroup({ parishId, name: "Turma Sem Plano", year: 2026 });
    expect(await listarTemasDaTurma(parishId, turma.id)).toEqual([]);
  });

  it("a evolução conta TEMAS distintos, não encontros", async () => {
    const itinerario = await criarItinerario(parishId, { nome: "Crisma · 1º ano" });
    const t1 = await criarTema(parishId, itinerario.id, { titulo: "O Espírito Santo" });
    const t2 = await criarTema(parishId, itinerario.id, { titulo: "Os dons" });
    await criarTema(parishId, itinerario.id, { titulo: "A missão" });

    const turma = await createGroup({ parishId, name: "Crisma A", year: 2026 });
    await definirItinerarioDaTurma(parishId, turma.id, itinerario.id);

    // Dois encontros sobre o MESMO tema não fazem a turma andar duas casas:
    // repetir uma aula é comum, e contaria evolução que não houve.
    await createSession(parishId, turma.id, {
      date: new Date("2026-03-01"),
      itinerarioTemaId: t1!.id,
    });
    await createSession(parishId, turma.id, {
      date: new Date("2026-03-08"),
      itinerarioTemaId: t1!.id,
    });
    await createSession(parishId, turma.id, {
      date: new Date("2026-03-15"),
      itinerarioTemaId: t2!.id,
    });

    const andamento = await obterAndamentoDaTurma(parishId, turma.id, new Date("2026-03-20"));
    expect(andamento?.previstos).toBe(3);
    expect(andamento?.dados).toBe(2);
  });

  it("recusa um tema que não é do itinerário da turma", async () => {
    const meuItinerario = await criarItinerario(parishId, { nome: "Plano A" });
    const outroItinerario = await criarItinerario(parishId, { nome: "Plano B" });
    const temaDoOutro = await criarTema(parishId, outroItinerario.id, { titulo: "Tema alheio" });

    const turma = await createGroup({ parishId, name: "Turma do Plano A", year: 2026 });
    await definirItinerarioDaTurma(parishId, turma.id, meuItinerario.id);

    await expect(
      createSession(parishId, turma.id, {
        date: new Date("2026-04-01"),
        itinerarioTemaId: temaDoOutro!.id,
      }),
    ).rejects.toThrow(/não pertence/i);
  });

  it("um itinerário de outra paróquia não alcança as turmas daqui", async () => {
    const daVizinha = await criarItinerario(outraParishId, { nome: "Plano da vizinha" });
    const temaVizinho = await criarTema(outraParishId, daVizinha.id, { titulo: "Tema vizinho" });

    const turma = await createGroup({ parishId, name: "Turma Local", year: 2026 });
    // Apontar a turma para o itinerário da vizinha não pega: o updateMany é
    // escopado pela paróquia, então nada muda e o tema segue recusado.
    await definirItinerarioDaTurma(parishId, turma.id, daVizinha.id).catch(() => undefined);

    await expect(
      createSession(parishId, turma.id, {
        date: new Date("2026-04-08"),
        itinerarioTemaId: temaVizinho!.id,
      }),
    ).rejects.toThrow();

    expect(await listarItinerarios(parishId)).not.toContainEqual(
      expect.objectContaining({ id: daVizinha.id }),
    );
  });

  it("o quadro da coordenação traz uma linha por turma, com o sinal de atraso", async () => {
    const itinerario = await criarItinerario(parishId, { nome: "Batismo · preparação" });
    const tema = await criarTema(parishId, itinerario.id, { titulo: "O batismo" });

    const turma = await createGroup({
      parishId,
      name: "Turma Quadro",
      year: 2026,
      catechistUserId: catequistaId,
    });
    await definirItinerarioDaTurma(parishId, turma.id, itinerario.id);

    await createSession(parishId, turma.id, {
      date: new Date("2026-05-03"),
      itinerarioTemaId: tema!.id,
    });
    // Um encontro velho e sem conteúdo: é o que precisa acender o sinal.
    await createSession(parishId, turma.id, { date: new Date("2026-05-10") });

    const quadro = await obterQuadroDaCoordenacao(parishId, new Date("2026-06-01"));
    const linha = quadro.find((l) => l.id === turma.id);

    expect(linha?.catequista).toBe("Catequista Itinerário");
    expect(linha?.itinerario?.nome).toBe("Batismo · preparação");
    expect(linha?.dados).toBe(1);
    expect(linha?.previstos).toBe(1);
    expect(linha?.lancamento.atrasados).toBe(1);
    expect(linha?.lancamento.maisAntigo?.dias).toBe(22);
  });
});

/**
 * As duas chamadas da semana.
 *
 * O encontro e a missa são presenças diferentes, e nenhuma substitui a
 * outra. A da missa existia só na ficha individual — numa turma de 25, eram
 * 25 telas para marcar um domingo.
 */
describe("presença na missa, da turma inteira", () => {
  let parishId: string;
  let responsavelId: string;
  let turmaId: string;
  let matriculas: string[] = [];
  const userIds: string[] = [];
  const parishIds: string[] = [];
  const domingo = new Date("2026-08-23T00:00:00.000Z");

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const paroquia = await registerParish({ name: `Paróquia Missa ${Date.now()}` });
    parishId = paroquia.id;
    parishIds.push(paroquia.id);

    const responsavel = await registerUser({
      fullName: "Responsável Missa",
      email: `resp-missa-${Date.now()}@test.comunidade.app`,
      password: "Senha@12345",
    });
    responsavelId = responsavel.id;
    userIds.push(responsavel.id);

    const turma = await createGroup({ parishId, name: "Turma Missa", year: 2026 });
    turmaId = turma.id;

    const criancas = [];
    for (const nome of ["Ana", "Bento", "Clara"]) {
      criancas.push(
        await createFamilyMember({
          parishId,
          responsibleUserId: responsavelId,
          fullName: nome,
          relationship: "filho",
        }),
      );
    }
    matriculas = [];
    for (const crianca of criancas) {
      const m = await enrollFamilyMember(parishId, turmaId, crianca.id);
      matriculas.push(m.id);
    }
  });

  afterAll(async () => {
    await cleanupTenantData({ parishIds, userIds });
  });

  it("marca a turma inteira num domingo só", async () => {
    await registrarMissaDaTurma(
      parishId,
      turmaId,
      domingo,
      [matriculas[0]!, matriculas[1]!],
      responsavelId,
    );
    expect((await listarMissaDaTurma(parishId, turmaId, domingo)).length).toBe(2);
  });

  it("quem sai da lista tem a presença REMOVIDA, não marcada como ausente", async () => {
    // A tabela guarda presença, não chamada: ausência na missa não é falta a
    // ser cobrada, e desmarcar por engano não pode deixar rastro de algo que
    // não aconteceu.
    await registrarMissaDaTurma(parishId, turmaId, domingo, [matriculas[0]!], responsavelId);

    const depois = await listarMissaDaTurma(parishId, turmaId, domingo);
    expect(depois.map((m) => m.enrollmentId)).toEqual([matriculas[0]!]);

    const progresso = await getEnrollmentProgress(parishId, matriculas[0]!);
    expect(progresso?.resumo.missas).toBe(1);

    const semMissa = await getEnrollmentProgress(parishId, matriculas[1]!);
    expect(semMissa?.resumo.missas).toBe(0);
  });

  it("ignora matrícula que não é da turma", async () => {
    await registrarMissaDaTurma(parishId, turmaId, domingo, ["id-que-nao-existe"], responsavelId);
    // A lista não ganhou ninguém, e quem estava marcado saiu — porque não
    // veio na lista de presentes.
    expect(await listarMissaDaTurma(parishId, turmaId, domingo)).toEqual([]);
  });
});
