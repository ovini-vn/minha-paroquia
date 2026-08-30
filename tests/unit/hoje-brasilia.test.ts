import { afterEach, describe, expect, it, vi } from "vitest";
import { domingoAte, hojeEmBrasilia, horaEmBrasilia } from "@/lib/brasilia";

/**
 * Regressão do defeito achado em 29/08/2026 medindo as telas internas.
 *
 * Oito formulários usavam `new Date().toISOString().slice(0, 10)` como
 * padrão de campo de data, e a saudação do Início usava
 * `new Date().getHours()`. Os dois leem o fuso de quem está rodando: na
 * máquina de quem desenvolve (São Paulo) sai certo, e na Vercel (UTC) sai
 * três horas adiantado.
 *
 * O relógio destes testes é fixado em instantes da faixa perigosa — entre
 * 21h e a meia-noite de Brasília, quando UTC já virou o dia. Sem a
 * correção, todos falham.
 */
describe("hoje e agora são os de Brasília, não os do processo", () => {
  afterEach(() => vi.useRealTimers());

  function em(instanteUtc: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(instanteUtc));
  }

  it("às 21h de Brasília ainda é o mesmo dia, embora UTC já tenha virado", () => {
    // 30/08 00:30 UTC = 29/08 às 21h30 em Brasília.
    em("2026-08-30T00:30:00.000Z");
    expect(hojeEmBrasilia()).toBe("2026-08-29");
    expect(horaEmBrasilia()).toBe(21);
  });

  it("na virada do ano o dia não se adianta", () => {
    // 01/01/2027 01:00 UTC = 31/12/2026 às 22h em Brasília.
    em("2027-01-01T01:00:00.000Z");
    expect(hojeEmBrasilia()).toBe("2026-12-31");
    expect(horaEmBrasilia()).toBe(22);
  });

  it("às seis da tarde a saudação é de tarde, e não de noite", () => {
    // 29/08 21:00 UTC = 18h em Brasília. `getHours()` no servidor daria 21.
    em("2026-08-29T21:00:00.000Z");
    expect(horaEmBrasilia()).toBe(18);
  });

  it("de manhã os dois relógios concordam, e continua certo", () => {
    // 29/08 12:00 UTC = 9h em Brasília.
    em("2026-08-29T12:00:00.000Z");
    expect(hojeEmBrasilia()).toBe("2026-08-29");
    expect(horaEmBrasilia()).toBe(9);
  });
});

describe("o domingo sugerido para a chamada da missa", () => {
  it("de uma quarta-feira, aponta o domingo anterior", () => {
    // 26/08/2026 é uma quarta; o domingo anterior é 23/08.
    expect(domingoAte(new Date("2026-08-26T15:00:00.000Z"))).toBe("2026-08-23");
  });

  it("de um domingo, aponta o próprio dia", () => {
    expect(domingoAte(new Date("2026-08-23T15:00:00.000Z"))).toBe("2026-08-23");
  });

  it("de um sábado, aponta o domingo da semana que passou", () => {
    // Catequese de sábado: a missa a lançar é a do domingo anterior, não a
    // do dia seguinte, que ainda não aconteceu.
    expect(domingoAte(new Date("2026-08-29T15:00:00.000Z"))).toBe("2026-08-23");
  });

  it("de madrugada, ainda é o dia de Brasília, não o de UTC", () => {
    // 24/08 00:30 UTC = domingo 23/08 às 21h30 em Brasília.
    expect(domingoAte(new Date("2026-08-24T00:30:00.000Z"))).toBe("2026-08-23");
  });
});
