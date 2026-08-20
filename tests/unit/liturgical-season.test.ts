import { describe, expect, it } from "vitest";
import { computeEasterSunday, getLiturgicalSeason } from "@/lib/liturgical-season";

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

describe("computeEasterSunday", () => {
  it("bate com datas conhecidas de Páscoa", () => {
    expect(computeEasterSunday(2023).toISOString().slice(0, 10)).toBe("2023-04-09");
    expect(computeEasterSunday(2024).toISOString().slice(0, 10)).toBe("2024-03-31");
    expect(computeEasterSunday(2025).toISOString().slice(0, 10)).toBe("2025-04-20");
    expect(computeEasterSunday(2026).toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(computeEasterSunday(2027).toISOString().slice(0, 10)).toBe("2027-03-28");
  });
});

describe("getLiturgicalSeason", () => {
  it("1º de janeiro é Natal (sobra do ano anterior)", () => {
    expect(getLiturgicalSeason(utc(2026, 1, 1)).season).toBe("natal");
  });

  it("25 de dezembro é Natal", () => {
    expect(getLiturgicalSeason(utc(2026, 12, 25)).season).toBe("natal");
  });

  it("24 de dezembro ainda é Advento", () => {
    expect(getLiturgicalSeason(utc(2026, 12, 24)).season).toBe("advento");
  });

  it("Quarta-feira de Cinzas é Quaresma (2026: 18 de fevereiro)", () => {
    expect(getLiturgicalSeason(utc(2026, 2, 18)).season).toBe("quaresma");
  });

  it("meio de março de 2026 é Quaresma", () => {
    expect(getLiturgicalSeason(utc(2026, 3, 15)).season).toBe("quaresma");
  });

  it("Quinta, Sexta e Sábado Santo (2026) são Tríduo Pascal", () => {
    expect(getLiturgicalSeason(utc(2026, 4, 2)).season).toBe("triduo_pascal");
    expect(getLiturgicalSeason(utc(2026, 4, 3)).season).toBe("triduo_pascal");
    expect(getLiturgicalSeason(utc(2026, 4, 4)).season).toBe("triduo_pascal");
  });

  it("Domingo de Páscoa (2026: 5 de abril) inicia o tempo de Páscoa", () => {
    expect(getLiturgicalSeason(utc(2026, 4, 5)).season).toBe("pascoa");
  });

  it("Pentecostes (2026: 24 de maio) é seu próprio tempo", () => {
    expect(getLiturgicalSeason(utc(2026, 5, 24)).season).toBe("pentecostes");
  });

  it("o dia depois de Pentecostes já é Tempo Comum", () => {
    expect(getLiturgicalSeason(utc(2026, 5, 25)).season).toBe("tempo_comum");
  });

  it("início de julho é Tempo Comum", () => {
    expect(getLiturgicalSeason(utc(2026, 7, 1)).season).toBe("tempo_comum");
  });

  it("cada tempo retorna seu nome de exibição", () => {
    // As cores não são testadas aqui de propósito: vivem só no CSS
    // ([data-season] em globals.css), não neste módulo.
    const quaresma = getLiturgicalSeason(utc(2026, 3, 1));
    expect(quaresma.season).toBe("quaresma");
    expect(quaresma.name).toBe("Quaresma");
  });
});
