import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerUser } from "@/server/modules/users/service";
import {
  listarAndamentosDasNovenas,
  marcarDiaRezado,
  obterAndamentoDaNovena,
  recomecarNovena,
} from "@/server/modules/novenas/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O andamento das novenas, guardado na conta.
 *
 * É o que permite começar a novena no celular e continuar em outro
 * aparelho. O que importa aqui: o dia só anda de um em um, rezar de novo o
 * mesmo dia não é erro, e a novena de uma pessoa não conta na de outra.
 */
describe("novenas: andamento na conta", () => {
  const userIds: string[] = [];
  const stamp = Date.now();
  let maria: string;
  let joao: string;
  const FATIMA = "nossa-senhora-de-fatima";

  beforeAll(async () => {
    const a = await registerUser({ fullName: "Maria Novena", email: `maria-novena-${stamp}@test.comunidade.app`, password: "SenhaForte123" });
    const b = await registerUser({ fullName: "Joao Novena", email: `joao-novena-${stamp}@test.comunidade.app`, password: "SenhaForte123" });
    maria = a.id;
    joao = b.id;
    userIds.push(a.id, b.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds: [] });
  });

  it("quem nunca começou está no dia 1, sem linha criada", async () => {
    const a = await obterAndamentoDaNovena(maria, FATIMA);
    expect(a.proximoDia).toBe(1);
    expect(await listarAndamentosDasNovenas(maria)).toHaveLength(0);
  });

  it("rezar o dia 1 leva ao dia 2", async () => {
    const a = await marcarDiaRezado(maria, FATIMA, 1);
    expect(a.diasRezados).toBe(1);
    expect(a.proximoDia).toBe(2);
    expect(a.ultimoDiaEm).not.toBeNull();
  });

  it("rezar de novo um dia já rezado não é erro e não muda nada", async () => {
    const a = await marcarDiaRezado(maria, FATIMA, 1);
    expect(a.diasRezados).toBe(1);
  });

  it("não deixa pular dia", async () => {
    await expect(marcarDiaRezado(maria, FATIMA, 3)).rejects.toThrow(/Reze antes o dia 2/);
    expect((await obterAndamentoDaNovena(maria, FATIMA)).diasRezados).toBe(1);
  });

  it("o nono dia conclui a novena", async () => {
    for (let dia = 2; dia <= 9; dia++) await marcarDiaRezado(maria, FATIMA, dia);
    const a = await obterAndamentoDaNovena(maria, FATIMA);
    expect(a.diasRezados).toBe(9);
    expect(a.proximoDia).toBeNull();
    expect(a.concluidaEm).not.toBeNull();
  });

  it("recomeçar volta ao dia 1 e limpa a conclusão", async () => {
    const a = await recomecarNovena(maria, FATIMA);
    expect(a.proximoDia).toBe(1);
    expect(a.concluidaEm).toBeNull();
    // Reaproveita a linha: continua uma só.
    expect(await listarAndamentosDasNovenas(maria)).toHaveLength(1);
  });

  it("a novena de uma pessoa não anda a de outra", async () => {
    await marcarDiaRezado(maria, FATIMA, 1);
    expect((await obterAndamentoDaNovena(joao, FATIMA)).proximoDia).toBe(1);
  });

  it("recusa novena que não existe e dia fora de 1 a 9", async () => {
    await expect(marcarDiaRezado(maria, "novena-inventada", 1)).rejects.toThrow(/Novena não encontrada/);
    await expect(marcarDiaRezado(joao, FATIMA, 0)).rejects.toThrow(/inválido/);
    await expect(marcarDiaRezado(joao, FATIMA, 10)).rejects.toThrow(/inválido/);
  });
});
