import { describe, expect, it } from "vitest";
import { formatDateTime, formatTimeLabel, formatDateLabel, formatDateOnly } from "@/lib/date";
import { brasiliaParts } from "@/lib/brasilia";

/**
 * Regressão do bug relatado em produção: "os horários das missas mudaram
 * sozinhos".
 *
 * A causa era Intl.DateTimeFormat sem timeZone. Ele usa o fuso do processo:
 * na máquina de quem desenvolve (São Paulo) a hora saía certa, e na Vercel
 * (UTC) saía três horas adiantada. Uma missa cadastrada para as 19h
 * aparecia como 22h.
 *
 * Estas asserções são absolutas de propósito. Antes da correção elas
 * passavam numa máquina em São Paulo e falhavam em UTC — que é exatamente
 * como o defeito atravessou todos os testes e só apareceu para o usuário.
 */
describe("horário exibido é sempre o de Brasília", () => {
  // 23/08/2026 às 22h UTC = domingo, 19h em Brasília.
  const missaDaNoite = new Date("2026-08-23T22:00:00.000Z");
  // 24/08/2026 às 00h30 UTC = ainda sábado 23, 21h30 em Brasília.
  const missaTardia = new Date("2026-08-24T00:30:00.000Z");

  it("mostra 19:00 para a missa das 19h, não o instante UTC", () => {
    expect(formatTimeLabel(missaDaNoite)).toBe("19:00");
    expect(formatDateTime(missaDaNoite)).toContain("19:00");
    expect(formatDateTime(missaDaNoite)).not.toContain("22:00");
  });

  it("a celebração de fim de noite continua no dia certo", () => {
    // Em UTC isso já é dia 24. Em Brasília ainda é o dia 23, e é o dia 23
    // que a pessoa procura na agenda.
    expect(formatTimeLabel(missaTardia)).toBe("21:30");
    expect(formatDateLabel(missaTardia)).toContain("23");
    // formatDateLabel capitaliza a inicial: "Domingo, 23 de agosto".
    expect(formatDateLabel(missaTardia)).toMatch(/^Domingo/);
  });

  it("o dia da semana também vem de Brasília", () => {
    // 00h30 UTC de segunda ainda é domingo à noite aqui.
    expect(brasiliaParts(missaTardia).weekday).toBe(0); // domingo
    expect(brasiliaParts(missaTardia).day).toBe(23);
  });

  it("campo de SÓ DATA continua em UTC, que é como ele é gravado", () => {
    // @db.Date chega como meia-noite UTC. Formatar em Brasília mostraria o
    // dia anterior — o erro simétrico, e é por isso que os dois formatadores
    // não podem usar o mesmo fuso.
    expect(formatDateOnly(new Date("2026-08-23T00:00:00.000Z"))).toBe("23 de agosto de 2026");
  });
});
