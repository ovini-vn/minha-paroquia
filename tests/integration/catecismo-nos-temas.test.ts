import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createFamilyMember } from "@/server/modules/family/service";
import {
  createGroup,
  createSession,
  criarItinerario,
  criarTema,
  definirItinerarioDaTurma,
  enrollFamilyMember,
  getEnrollmentProgress,
  obterItinerario,
  obterProximoTemaDaTurma,
} from "@/server/modules/catequese/service";
import {
  desligarParagrafoDoTema,
  ligarParagrafoAoTema,
  PARAGRAFOS_POR_TEMA,
  type LeitorDoCatecismo,
} from "@/server/modules/catecismo/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O Catecismo nos encontros do itinerário.
 *
 * O site do Vaticano NÃO é chamado aqui: o leitor é trocado por um falso,
 * que devolve um texto conhecido. O que se protege é a regra — o limite por
 * encontro, o número repetido, o parágrafo que não existe, e que o trecho
 * chega à família e à catequista, e não à paróquia vizinha.
 */
const lidos: number[] = [];
const leitorFalso: LeitorDoCatecismo = async (n) => {
  lidos.push(n);
  if (n === 2000) return null;
  if (n === 1400) return "Uma frase longa do parágrafo, que se repete para passar do limite. ".repeat(12);
  return `Texto do parágrafo ${n}.`;
};

describe("Catecismo nos temas do itinerário", () => {
  let parishId: string;
  let outraParishId: string;
  let itinerarioId: string;
  let temaId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Catecismo ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);
    const outra = await registerParish({ name: `Paróquia Vizinha Catecismo ${Date.now()}` });
    outraParishId = outra.id;
    parishIds.push(outra.id);

    const itinerario = await criarItinerario(parishId, { nome: "Eucaristia · 2º ano" });
    itinerarioId = itinerario.id;
    const tema = await criarTema(parishId, itinerario.id, { titulo: "A Eucaristia" });
    temaId = tema!.id;
  });

  afterAll(async () => {
    await cleanupTenantData({ parishIds, userIds });
  });

  it("liga o parágrafo pelo número e guarda o trecho", async () => {
    const ligado = await ligarParagrafoAoTema(parishId, temaId, 1324, leitorFalso);
    expect(ligado && "trecho" in ligado ? ligado.trecho : null).toBe("Texto do parágrafo 1324.");

    const itinerario = await obterItinerario(parishId, itinerarioId);
    expect(itinerario?.temas[0]?.catecismo.map((c) => c.paragrafo)).toEqual([1324]);
  });

  it("o mesmo número duas vezes não duplica, e nem vai à rede", async () => {
    const antes = lidos.length;
    const repetido = await ligarParagrafoAoTema(parishId, temaId, 1324, leitorFalso);
    expect(repetido).toEqual({ jaEstava: true });
    expect(lidos.length).toBe(antes);
  });

  it("parágrafo longo é guardado cortado, e marcado como incompleto", async () => {
    const ligado = await ligarParagrafoAoTema(parishId, temaId, 1400, leitorFalso);
    expect(ligado && "completo" in ligado ? ligado.completo : null).toBe(false);
  });

  it(`recusa o ${PARAGRAFOS_POR_TEMA + 1}º parágrafo no mesmo encontro`, async () => {
    await ligarParagrafoAoTema(parishId, temaId, 1325, leitorFalso);
    await expect(ligarParagrafoAoTema(parishId, temaId, 1326, leitorFalso)).rejects.toThrow(/até 3 parágrafos/);
  });

  it("recusa número fora do Catecismo, e o que o site não tem", async () => {
    const outroTema = await criarTema(parishId, itinerarioId, { titulo: "A missa" });
    await expect(ligarParagrafoAoTema(parishId, outroTema!.id, 3000, leitorFalso)).rejects.toThrow(/1 ao 2865/);
    await expect(ligarParagrafoAoTema(parishId, outroTema!.id, 2000, leitorFalso)).rejects.toThrow(/não foi encontrado/);
  });

  it("um tema de outra paróquia não recebe parágrafo daqui", async () => {
    expect(await ligarParagrafoAoTema(outraParishId, temaId, 1327, leitorFalso)).toBeNull();
  });

  it("a família vê o Catecismo do próximo encontro, e a catequista também", async () => {
    const responsavel = await registerUser({
      fullName: "Responsável Catecismo",
      email: `resp-cic-${Date.now()}@test.comunidade.app`,
      password: "Senha@12345",
    });
    userIds.push(responsavel.id);

    const turma = await createGroup({ parishId, name: "Turma do Catecismo", year: 2026 });
    await definirItinerarioDaTurma(parishId, turma.id, itinerarioId);
    const crianca = await createFamilyMember({
      parishId,
      responsibleUserId: responsavel.id,
      fullName: "Davi",
      relationship: "filho",
    });
    const matricula = await enrollFamilyMember(parishId, turma.id, crianca.id);

    // Nada dado ainda: o próximo é "A Eucaristia", que tem três parágrafos.
    const progresso = await getEnrollmentProgress(parishId, matricula.id, new Date("2026-03-01"));
    const proximoId = progresso?.caminhada?.proximo?.temaId;
    const tema = progresso?.enrollment.group.itinerario?.temas.find((t) => t.id === proximoId);
    expect(tema?.catecismo.map((c) => c.paragrafo)).toEqual([1324, 1325, 1400]);

    expect((await obterProximoTemaDaTurma(parishId, turma.id))?.id).toBe(temaId);

    // Dado o encontro, a catequista passa a preparar o seguinte.
    await createSession(parishId, turma.id, { date: new Date("2026-03-08"), itinerarioTemaId: temaId });
    const seguinte = await obterProximoTemaDaTurma(parishId, turma.id);
    expect(seguinte?.titulo).toBe("A missa");
    expect(seguinte?.catecismo).toEqual([]);
  });

  it("tirar o parágrafo libera o lugar", async () => {
    const itinerario = await obterItinerario(parishId, itinerarioId);
    const ligado = itinerario!.temas[0]!.catecismo.find((c) => c.paragrafo === 1325)!;
    await desligarParagrafoDoTema(parishId, ligado.id);
    await expect(ligarParagrafoAoTema(parishId, temaId, 1326, leitorFalso)).resolves.toBeTruthy();
  });
});
