import { describe, expect, it } from "vitest";
import {
  calcularExpediente,
  agruparPorDia,
  interpretarExpediente,
  type Faixa,
} from "@/lib/expediente";

/**
 * As duas armadilhas de "está aberta agora?": o fuso (o servidor roda em
 * UTC) e o almoço (a secretaria fecha no meio do dia).
 */
const SEGUNDA_A_SEXTA: Faixa[] = [1, 2, 3, 4, 5].flatMap((d) => [
  { weekday: d, opensAt: 8 * 60, closesAt: 12 * 60 },
  { weekday: d, opensAt: 14 * 60, closesAt: 17 * 60 },
]);

describe("expediente da secretaria", () => {
  it("aberta no meio da manhã, e diz a que horas fecha", () => {
    // Segunda 24/08/2026, 13h UTC = 10h em Brasília.
    const r = calcularExpediente(SEGUNDA_A_SEXTA, new Date("2026-08-24T13:00:00.000Z"));
    expect(r.aberta).toBe(true);
    if (r.aberta) expect(r.fechaAs).toBe("12:00");
  });

  it("FECHADA no horário do almoço — o erro que uma faixa por dia causaria", () => {
    // 16h UTC = 13h em Brasília, entre as duas faixas.
    const r = calcularExpediente(SEGUNDA_A_SEXTA, new Date("2026-08-24T16:00:00.000Z"));
    expect(r.aberta).toBe(false);
    if (!r.aberta) expect(r.proxima).toEqual({ dia: "hoje", hora: "14:00" });
  });

  it("depois de fechar, aponta o próximo dia útil", () => {
    // Segunda 20h UTC = 17h em Brasília — acabou de fechar.
    const r = calcularExpediente(SEGUNDA_A_SEXTA, new Date("2026-08-24T20:00:00.000Z"));
    expect(r.aberta).toBe(false);
    if (!r.aberta) expect(r.proxima).toEqual({ dia: "amanhã", hora: "08:00" });
  });

  it("na sexta à noite, aponta a segunda — pula o fim de semana", () => {
    // Sexta 28/08/2026, 21h UTC = 18h em Brasília.
    const r = calcularExpediente(SEGUNDA_A_SEXTA, new Date("2026-08-28T21:00:00.000Z"));
    expect(r.aberta).toBe(false);
    if (!r.aberta) expect(r.proxima).toEqual({ dia: "segunda-feira", hora: "08:00" });
  });

  it("o fuso decide o DIA, não só a hora", () => {
    // Domingo 23/08 às 23h UTC já é segunda em UTC, mas em Brasília ainda é
    // domingo 20h. Se a conta fosse em UTC, o app diria que a secretaria de
    // segunda está prestes a abrir "hoje".
    const r = calcularExpediente(SEGUNDA_A_SEXTA, new Date("2026-08-23T23:00:00.000Z"));
    expect(r.aberta).toBe(false);
    if (!r.aberta) expect(r.proxima).toEqual({ dia: "amanhã", hora: "08:00" });
  });

  it("sem horário cadastrado, não inventa", () => {
    const r = calcularExpediente([], new Date("2026-08-24T13:00:00.000Z"));
    expect(r.aberta).toBe(false);
    if (!r.aberta) expect(r.proxima).toBeNull();
  });

  it("agrupa para exibição começando na segunda, com as faixas juntas", () => {
    const linhas = agruparPorDia(SEGUNDA_A_SEXTA);
    expect(linhas[0]).toEqual({ dia: "Segunda-feira", horarios: "08:00–12:00, 14:00–17:00" });
    expect(linhas).toHaveLength(5);
    // Domingo viria por último, se existisse.
    expect(linhas.map((l) => l.dia)).not.toContain("Domingo");
  });
});

describe("o que a secretaria digita", () => {
  const entrada = (weekday: number, abre: string, fecha: string, rotuloDoTurno = "Manhã") => ({
    weekday,
    rotuloDoTurno,
    abre,
    fecha,
  });

  it("converte o preenchido e ignora o vazio", () => {
    const r = interpretarExpediente([
      entrada(1, "08:00", "12:00"),
      entrada(1, "", "", "Tarde"),
      entrada(2, "  ", " "),
    ]);
    expect(r).toEqual({ faixas: [{ weekday: 1, opensAt: 480, closesAt: 720 }] });
  });

  it("recusa turno preenchido pela metade, dizendo qual", () => {
    const r = interpretarExpediente([entrada(3, "08:00", "")]);
    expect(r).toEqual({ erro: "Preencha a abertura e o fechamento de Quarta-feira (manhã)." });
  });

  it("recusa fechar antes de abrir", () => {
    const r = interpretarExpediente([entrada(1, "17:00", "09:00", "Tarde")]);
    expect("erro" in r && r.erro).toContain("depois da abertura");
  });

  it("recusa turnos que se cruzam no mesmo dia", () => {
    const r = interpretarExpediente([
      entrada(1, "08:00", "13:00"),
      entrada(1, "12:00", "17:00", "Tarde"),
    ]);
    expect(r).toEqual({ erro: "Os turnos de Segunda-feira se sobrepõem." });
  });

  it("aceita turnos que apenas se encostam", () => {
    // Fechar às 12 e reabrir às 12 é esquisito, mas não é contradição.
    const r = interpretarExpediente([
      entrada(1, "08:00", "12:00"),
      entrada(1, "12:00", "17:00", "Tarde"),
    ]);
    expect("faixas" in r && r.faixas).toHaveLength(2);
  });
});
