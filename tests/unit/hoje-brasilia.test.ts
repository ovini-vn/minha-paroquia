import { afterEach, describe, expect, it, vi } from "vitest";
import { hojeEmBrasilia, horaEmBrasilia } from "@/lib/brasilia";

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
