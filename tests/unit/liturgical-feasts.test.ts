import { describe, expect, it } from "vitest";
import {
  getFeastOn,
  getUpcomingFeasts,
  daysUntil,
  relativeLabel,
} from "@/lib/liturgical-feasts";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("solenidades e festas do calendário brasileiro", () => {
  it("acerta as datas fixas", () => {
    expect(getFeastOn(utc(2026, 1, 1))?.name).toBe("Santa Maria, Mãe de Deus");
    expect(getFeastOn(utc(2026, 12, 25))?.name).toBe("Natal do Senhor");
    expect(getFeastOn(utc(2026, 8, 15))?.name).toBe("Assunção de Nossa Senhora");
    expect(getFeastOn(utc(2026, 12, 8))?.name).toBe("Imaculada Conceição de Nossa Senhora");
  });

  it("Nossa Senhora Aparecida é solenidade e feriado — o próprio do Brasil", () => {
    const aparecida = getFeastOn(utc(2026, 10, 12));
    expect(aparecida?.name).toContain("Aparecida");
    expect(aparecida?.rank).toBe("solenidade");
    expect(aparecida?.civilHoliday).toBe(true);
  });

  it("dia sem celebração própria devolve null", () => {
    // 14 de agosto: véspera da Assunção, sem solenidade própria na lista.
    expect(getFeastOn(utc(2026, 8, 14))).toBeNull();
  });

  /**
   * Páscoa de 2026 = 5 de abril (data conhecida). As móveis abaixo são
   * conferidas contra ela, não contra o que o código calcula.
   */
  describe("datas móveis, ancoradas na Páscoa de 05/04/2026", () => {
    it("Páscoa, Cinzas e Tríduo", () => {
      expect(getFeastOn(utc(2026, 4, 5))?.name).toBe("Domingo de Páscoa");
      expect(getFeastOn(utc(2026, 2, 18))?.name).toBe("Quarta-feira de Cinzas");
      expect(getFeastOn(utc(2026, 3, 29))?.name).toBe("Domingo de Ramos");
      expect(getFeastOn(utc(2026, 4, 2))?.name).toBe("Quinta-feira Santa");
      expect(getFeastOn(utc(2026, 4, 3))?.name).toContain("Sexta-feira Santa");
    });

    it("Ascensão cai no domingo — transferida, como se faz no Brasil", () => {
      const ascensao = getFeastOn(utc(2026, 5, 17));
      expect(ascensao?.name).toBe("Ascensão do Senhor");
      expect(ascensao?.date.getUTCDay()).toBe(0); // domingo
      // Na quinta-feira do calendário romano geral não há nada aqui.
      expect(getFeastOn(utc(2026, 5, 14))).toBeNull();
    });

    it("Pentecostes, Trindade e Corpus Christi", () => {
      expect(getFeastOn(utc(2026, 5, 24))?.name).toBe("Pentecostes");
      expect(getFeastOn(utc(2026, 5, 31))?.name).toBe("Santíssima Trindade");
      const corpus = getFeastOn(utc(2026, 6, 4));
      expect(corpus?.name).toBe("Corpus Christi");
      expect(corpus?.date.getUTCDay()).toBe(4); // quinta-feira
      expect(corpus?.civilHoliday).toBe(true);
    });

    it("Cristo Rei é o último domingo antes do Advento", () => {
      const cristoRei = getFeastOn(utc(2026, 11, 22));
      expect(cristoRei?.name).toBe("Cristo Rei do Universo");
      expect(cristoRei?.date.getUTCDay()).toBe(0);
    });
  });

  it("as móveis acompanham o ano — 2027 tem Páscoa em 28/03", () => {
    expect(getFeastOn(utc(2027, 3, 28))?.name).toBe("Domingo de Páscoa");
    // E não continua em abril, como em 2026.
    expect(getFeastOn(utc(2027, 4, 5))).toBeNull();
  });

  it("lista as próximas celebrações em ordem, a partir de hoje", () => {
    const proximas = getUpcomingFeasts(utc(2026, 8, 20), 3);
    expect(proximas.map((f) => f.name)).toEqual([
      "Natividade de Nossa Senhora",
      "Nossa Senhora Aparecida, Padroeira do Brasil",
      "Todos os Santos",
    ]);
    // Ordem cronológica estrita.
    expect(proximas[0]!.date.getTime()).toBeLessThan(proximas[1]!.date.getTime());
  });

  it("inclui hoje entre as próximas, quando hoje é celebração", () => {
    const proximas = getUpcomingFeasts(utc(2026, 12, 25), 1);
    expect(proximas[0]?.name).toBe("Natal do Senhor");
    expect(daysUntil(proximas[0]!, utc(2026, 12, 25))).toBe(0);
  });

  it("atravessa a virada do ano", () => {
    // Em 26/12 as próximas datas relevantes já são de janeiro do ano seguinte.
    const proximas = getUpcomingFeasts(utc(2026, 12, 26), 2);
    expect(proximas[0]?.name).toBe("Santa Maria, Mãe de Deus");
    expect(proximas[0]?.date.getUTCFullYear()).toBe(2027);
  });

  it("rotula a distância em linguagem natural", () => {
    const natal = getFeastOn(utc(2026, 12, 25))!;
    expect(daysUntil(natal, utc(2026, 12, 25))).toBe(0);
    expect(relativeLabel(0)).toBe("Hoje");
    expect(relativeLabel(1)).toBe("Amanhã");
    expect(relativeLabel(5)).toBe("Em 5 dias");
    // Longe demais para um rótulo relativo ajudar — mostra-se a data.
    expect(relativeLabel(30)).toBeNull();
  });
});
