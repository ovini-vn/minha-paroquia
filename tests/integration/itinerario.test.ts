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
  createRite,
  criarRitoDaTurma,
  registrarParticipacaoNoRito,
  concluirComSacramento,
  listarSacramentosDoCatequizando,
  definirCatequista,
  editarTurma,
  editarEncontro,
  apagarTurma,
  getGroup,
  listSessions,
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

/**
 * O rito da turma.
 *
 * O que estes testes protegem, além do caminho feliz: um rito lançado à mão
 * na ficha de uma criança NÃO pode ser apagado quando alguém desmarca a
 * participação no rito da turma. Registro sacramental não some como efeito
 * colateral de uma chamada.
 */
describe("rito da turma", () => {
  let parishId: string;
  let responsavelId: string;
  let turmaId: string;
  let matriculas: string[] = [];
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const paroquia = await registerParish({ name: `Paróquia Rito ${Date.now()}` });
    parishId = paroquia.id;
    parishIds.push(paroquia.id);

    const responsavel = await registerUser({
      fullName: "Responsável Rito",
      email: `resp-rito-${Date.now()}@test.comunidade.app`,
      password: "Senha@12345",
    });
    responsavelId = responsavel.id;
    userIds.push(responsavel.id);

    const turma = await createGroup({ parishId, name: "Turma Rito", year: 2026 });
    turmaId = turma.id;

    matriculas = [];
    for (const nome of ["Ana", "Bento", "Clara"]) {
      const crianca = await createFamilyMember({
        parishId,
        responsibleUserId: responsavelId,
        fullName: nome,
        relationship: "filho",
      });
      const m = await enrollFamilyMember(parishId, turmaId, crianca.id);
      matriculas.push(m.id);
    }
  });

  afterAll(async () => {
    await cleanupTenantData({ parishIds, userIds });
  });

  it("um rito marcado uma vez vira participação de vários", async () => {
    const rito = await criarRitoDaTurma(parishId, turmaId, {
      nome: "Entrega do Pai-Nosso",
      scheduledAt: new Date("2026-09-13T00:00:00.000Z"),
    });

    const r = await registrarParticipacaoNoRito(
      parishId,
      rito.id,
      [matriculas[0]!, matriculas[1]!],
      new Date("2026-09-13T00:00:00.000Z"),
    );
    expect(r.participantes).toBe(2);

    // Cada criança recebe o SEU registro, com o nome vindo do rito da turma —
    // é o que impede duas grafias para a mesma entrega.
    const daAna = await getEnrollmentProgress(parishId, matriculas[0]!);
    expect(daAna?.ritos.map((x) => x.name)).toEqual(["Entrega do Pai-Nosso"]);
    expect(daAna?.ritos[0]?.completedAt).not.toBeNull();

    const daClara = await getEnrollmentProgress(parishId, matriculas[2]!);
    expect(daClara?.ritos).toEqual([]);
  });

  it("desmarcar tira a participação daquele rito", async () => {
    const rito = await criarRitoDaTurma(parishId, turmaId, { nome: "Entrega do Credo" });

    await registrarParticipacaoNoRito(parishId, rito.id, [matriculas[0]!], new Date("2026-10-04"));
    await registrarParticipacaoNoRito(parishId, rito.id, [], new Date("2026-10-04"));

    const daAna = await getEnrollmentProgress(parishId, matriculas[0]!);
    expect(daAna?.ritos.map((x) => x.name)).not.toContain("Entrega do Credo");
  });

  it("NÃO apaga o rito lançado à mão na ficha da criança", async () => {
    // A regra que protege registro sacramental: a sincronização só mexe nas
    // linhas que vieram DAQUELE rito de turma.
    await createRite(parishId, matriculas[2]!, {
      name: "Batismo de emergência",
      scheduledAt: new Date("2026-05-01"),
    });

    const rito = await criarRitoDaTurma(parishId, turmaId, { nome: "Apresentação à comunidade" });
    await registrarParticipacaoNoRito(parishId, rito.id, [], new Date("2026-11-01"));

    const daClara = await getEnrollmentProgress(parishId, matriculas[2]!);
    expect(daClara?.ritos.map((x) => x.name)).toContain("Batismo de emergência");
  });

  it("ignora matrícula que não é da turma", async () => {
    const rito = await criarRitoDaTurma(parishId, turmaId, { nome: "Rito de escopo" });
    const r = await registrarParticipacaoNoRito(
      parishId,
      rito.id,
      ["id-que-nao-existe"],
      new Date("2026-11-08"),
    );
    expect(r.participantes).toBe(0);
  });

  it("o rito agendado da turma é o próximo passo da família, antes de acontecer", async () => {
    // Sem isto, a família só saberia do rito depois que ele acontecesse — que
    // é exatamente quando ele deixa de ser "próximo passo".
    const rito = await criarRitoDaTurma(parishId, turmaId, {
      nome: "Entrega da Bíblia",
      scheduledAt: new Date("2099-03-01T00:00:00.000Z"),
    });
    expect(rito.completedAt).toBeNull();

    const progresso = await getEnrollmentProgress(parishId, matriculas[0]!, new Date("2026-09-01"));
    expect(progresso?.proximoRito?.name).toBe("Entrega da Bíblia");
  });
});

/**
 * A catequese termina no sacramento — e o catequizando NÃO tem conta.
 *
 * Era o que travava o certificado: `Sacrament` exigia `userId`, e a criança
 * que faz a Primeira Eucaristia tem sete anos. A vida sacramental de quem
 * participa não depende de usar o aplicativo.
 */
describe("conclusão da catequese em sacramento", () => {
  let parishId: string;
  let responsavelId: string;
  let matriculaId: string;
  let familyMemberId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const paroquia = await registerParish({ name: `Paróquia Conclusão ${Date.now()}` });
    parishId = paroquia.id;
    parishIds.push(paroquia.id);

    const responsavel = await registerUser({
      fullName: "Responsável Conclusão",
      email: `resp-concl-${Date.now()}@test.comunidade.app`,
      password: "Senha@12345",
    });
    responsavelId = responsavel.id;
    userIds.push(responsavel.id);

    const turma = await createGroup({ parishId, name: "Turma Conclusão", year: 2026 });
    const crianca = await createFamilyMember({
      parishId,
      responsibleUserId: responsavelId,
      fullName: "Cecília sem conta",
      relationship: "filho",
    });
    familyMemberId = crianca.id;
    const m = await enrollFamilyMember(parishId, turma.id, crianca.id);
    matriculaId = m.id;
  });

  afterAll(async () => {
    await cleanupTenantData({ parishIds, userIds });
  });

  it("registra o sacramento de quem não tem conta nenhuma", async () => {
    const sac = await concluirComSacramento(
      parishId,
      matriculaId,
      {
        type: "primeira_eucaristia",
        date: new Date("2026-11-15T00:00:00.000Z"),
        location: "Igreja Matriz",
        note: "Livro 12, folha 43, nº 118",
      },
      responsavelId,
    );

    expect(sac.userId).toBeNull();
    expect(sac.familyMemberId).toBe(familyMemberId);
    // Nasce validado: quem lança é a paróquia, a partir do próprio livro.
    expect(sac.status).toBe("validated");

    const lista = await listarSacramentosDoCatequizando(parishId, matriculaId);
    expect(lista.map((s) => s.type)).toEqual(["primeira_eucaristia"]);
  });

  it("relançar o mesmo tipo CORRIGE, não duplica", async () => {
    // Duas primeiras eucaristias na ficha seriam erro de registro, e o
    // certificado sairia com a data errada.
    await concluirComSacramento(
      parishId,
      matriculaId,
      { type: "primeira_eucaristia", date: new Date("2026-11-22T00:00:00.000Z") },
      responsavelId,
    );

    const lista = await listarSacramentosDoCatequizando(parishId, matriculaId);
    expect(lista).toHaveLength(1);
    expect(lista[0]?.date.toISOString().slice(0, 10)).toBe("2026-11-22");
  });

  it("o aniversário do sacramento entra no painel da paróquia", async () => {
    // A criança sem conta é da comunidade do mesmo jeito: o aniversário de
    // Primeira Eucaristia dela precisa aparecer para a secretaria.
    const { listarAniversarios } = await import("@/server/modules/aniversarios/service");
    const proximos = await listarAniversarios(parishId, new Date("2026-11-20"), 10);
    expect(proximos.some((a) => a.nome === "Cecília sem conta")).toBe(true);
  });
});

/**
 * Editar e excluir, e a catequista que ainda não usa o app.
 */
describe("gestão da turma", () => {
  let parishId: string;
  let catequistaId: string;
  let turmaId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const paroquia = await registerParish({ name: `Paróquia Gestão ${Date.now()}` });
    parishId = paroquia.id;
    parishIds.push(paroquia.id);

    const catequista = await registerUser({
      fullName: "Rosa Catequista",
      email: `rosa-${Date.now()}@test.comunidade.app`,
      password: "Senha@12345",
    });
    catequistaId = catequista.id;
    userIds.push(catequista.id);

    const turma = await createGroup({ parishId, name: "Turma Gestão", year: 2026 });
    turmaId = turma.id;
  });

  afterAll(async () => {
    await cleanupTenantData({ parishIds, userIds });
  });

  it("aceita a catequista pelo NOME, sem conta nenhuma", async () => {
    await definirCatequista(parishId, turmaId, { nome: "Dona Marta" });
    const turma = await getGroup(parishId, turmaId);
    expect(turma?.catechistName).toBe("Dona Marta");
    expect(turma?.catechistUserId).toBeNull();
  });

  it("ao apontar a conta, LIMPA o nome digitado", async () => {
    // É o que garante que a troca "ela se cadastrou" não deixe o nome antigo
    // para trás, divergindo do que a conta diz.
    await definirCatequista(parishId, turmaId, { userId: catequistaId });
    const turma = await getGroup(parishId, turmaId);
    expect(turma?.catechistUserId).toBe(catequistaId);
    expect(turma?.catechistName).toBeNull();
  });

  it("edita nome e ano da turma", async () => {
    await editarTurma(parishId, turmaId, { name: "Crisma 2027", year: 2027 });
    const turma = await getGroup(parishId, turmaId);
    expect(turma?.name).toBe("Crisma 2027");
    expect(turma?.year).toBe(2027);
  });

  it("corrige um encontro já lançado", async () => {
    const encontro = await createSession(parishId, turmaId, {
      date: new Date("2026-04-04"),
      topic: "Errado",
    });
    await editarEncontro(parishId, encontro.id, {
      date: new Date("2026-04-11"),
      topic: "Certo",
    });

    const lista = await listSessions(parishId, turmaId);
    const corrigido = lista.find((e) => e.id === encontro.id);
    expect(corrigido?.topic).toBe("Certo");
    expect(corrigido?.date.toISOString().slice(0, 10)).toBe("2026-04-11");
  });

  it("excluir a turma leva o que é dela e DEIXA registro na auditoria", async () => {
    const { listar } = await import("@/server/modules/auditoria/service");

    const resultado = await apagarTurma(parishId, turmaId, catequistaId);
    expect(resultado.nome).toBe("Crisma 2027");

    expect(await getGroup(parishId, turmaId)).toBeNull();

    // O registro é escrito ANTES do delete, com a contagem: depois não há a
    // quem perguntar quantos eram.
    const trilha = await listar(parishId, { limite: 20 });
    const linha = trilha.find(
      (l) => l.acao === "turma.apagada" && (l.detalhe as { nome?: string })?.nome === "Crisma 2027",
    );
    expect(linha).toBeDefined();
    // A contagem do que sumiu é a única pergunta que alguém faz depois.
    expect((linha?.detalhe as { encontros?: number })?.encontros).toBe(1);
  });
});
