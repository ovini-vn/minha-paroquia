import { describe, expect, it } from "vitest";
import { occurrencesBetween, describeRule, type RecurrenceRule } from "@/lib/recurrence";
import { brasiliaParts } from "@/lib/brasilia";

/**
 * As datas usadas aqui foram conferidas no calendário, não geradas pelo
 * próprio código — testar contra a própria saída não prova nada.
 *
 * Referências de agosto/2026: dia 1 é sábado. Sextas: 7, 14, 21, 28.
 * Quartas: 5, 12, 19, 26.
 */
function regra(p: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    frequency: "semanal",
    weekday: 3, // quarta
    weekOfMonth: null,
    timeMinutes: 19 * 60, // 19:00
    startsOn: new Date("2026-01-01T00:00:00.000Z"),
    endsOn: null,
    ...p,
  };
}

/** Data e hora como quem lê no Brasil, para as expectativas ficarem legíveis. */
function local(instante: Date): string {
  const p = brasiliaParts(instante);
  const d = String(p.day).padStart(2, "0");
  const m = String(p.month + 1).padStart(2, "0");
  const h = String(Math.floor(p.minutes / 60)).padStart(2, "0");
  const min = String(p.minutes % 60).padStart(2, "0");
  return `${d}/${m}/${p.year} ${h}:${min}`;
}

describe("repetição de celebrações", () => {
  it("semanal: pega todas as quartas do mês, no horário certo", () => {
    const ocorrencias = occurrencesBetween(
      regra(),
      new Date("2026-08-01T00:00:00.000Z"),
      new Date("2026-09-01T00:00:00.000Z"),
    );

    expect(ocorrencias.map(local)).toEqual([
      "05/08/2026 19:00",
      "12/08/2026 19:00",
      "19/08/2026 19:00",
      "26/08/2026 19:00",
    ]);
  });

  it("guarda o instante em UTC, não a hora de parede", () => {
    const ocorrencias = occurrencesBetween(
      regra(),
      new Date("2026-08-01T00:00:00.000Z"),
      new Date("2026-08-10T00:00:00.000Z"),
    );
    // 19h em Brasília = 22h UTC. Se guardasse 19:00Z, o aviso e a agenda
    // sairiam três horas deslocados.
    expect(ocorrencias[0]?.toISOString()).toBe("2026-08-05T22:00:00.000Z");
  });

  it("mensal: primeira sexta-feira do mês", () => {
    const ocorrencias = occurrencesBetween(
      regra({ frequency: "mensal", weekday: 5, weekOfMonth: 1, timeMinutes: 15 * 60 }),
      new Date("2026-08-01T00:00:00.000Z"),
      new Date("2026-11-01T00:00:00.000Z"),
    );

    // Primeiras sextas: 07/08, 04/09, 02/10.
    expect(ocorrencias.map(local)).toEqual([
      "07/08/2026 15:00",
      "04/09/2026 15:00",
      "02/10/2026 15:00",
    ]);
  });

  it("mensal: ÚLTIMA sexta não é o mesmo que a quinta sexta", () => {
    // Outubro/2026 tem cinco sextas: 2, 9, 16, 23, 30.
    const ultima = occurrencesBetween(
      regra({ frequency: "mensal", weekday: 5, weekOfMonth: 5, timeMinutes: 15 * 60 }),
      new Date("2026-10-01T00:00:00.000Z"),
      new Date("2026-11-01T00:00:00.000Z"),
    );
    expect(ultima.map(local)).toEqual(["30/10/2026 15:00"]);

    // Setembro/2026 tem quatro sextas (4, 11, 18, 25): "última" ainda
    // devolve uma; "quinta" não devolveria nada.
    const setembro = occurrencesBetween(
      regra({ frequency: "mensal", weekday: 5, weekOfMonth: 5, timeMinutes: 15 * 60 }),
      new Date("2026-09-01T00:00:00.000Z"),
      new Date("2026-10-01T00:00:00.000Z"),
    );
    expect(setembro.map(local)).toEqual(["25/09/2026 15:00"]);
  });

  it("respeita início e fim de vigência", () => {
    const ocorrencias = occurrencesBetween(
      regra({
        startsOn: new Date("2026-08-10T00:00:00.000Z"),
        endsOn: new Date("2026-08-20T00:00:00.000Z"),
      }),
      new Date("2026-08-01T00:00:00.000Z"),
      new Date("2026-09-01T00:00:00.000Z"),
    );
    // Fora as quartas 05 (antes do início) e 26 (depois do fim).
    expect(ocorrencias.map(local)).toEqual(["12/08/2026 19:00", "19/08/2026 19:00"]);
  });

  it("uma missa noturna no último dia da janela não escapa", () => {
    // A janela termina 27/08 00:00Z. A quarta 26/08 às 19h local = 22h UTC
    // do dia 26, que está dentro. Aritmética por dia local sem converter
    // deixaria isso de fora.
    const ocorrencias = occurrencesBetween(
      regra(),
      new Date("2026-08-26T00:00:00.000Z"),
      new Date("2026-08-27T00:00:00.000Z"),
    );
    expect(ocorrencias.map(local)).toEqual(["26/08/2026 19:00"]);
  });

  it("janela vazia devolve lista vazia, não erro", () => {
    expect(
      occurrencesBetween(
        regra(),
        new Date("2026-08-10T00:00:00.000Z"),
        new Date("2026-08-10T00:00:00.000Z"),
      ),
    ).toEqual([]);
  });

  it("descreve a regra em português correto", () => {
    expect(describeRule({ frequency: "semanal", weekday: 3, weekOfMonth: null, timeMinutes: 1170 })).toBe(
      "Toda quarta-feira, 19:30",
    );
    // Domingo e sábado são masculinos — "toda domingo" estaria errado.
    expect(describeRule({ frequency: "semanal", weekday: 0, weekOfMonth: null, timeMinutes: 480 })).toBe(
      "Todo domingo, 08:00",
    );
    expect(describeRule({ frequency: "mensal", weekday: 5, weekOfMonth: 1, timeMinutes: 900 })).toBe(
      "Primeira sexta-feira do mês, 15:00",
    );
    expect(describeRule({ frequency: "mensal", weekday: 5, weekOfMonth: 5, timeMinutes: 900 })).toBe(
      "Última sexta-feira do mês, 15:00",
    );
    // O ordinal também concorda: a Adoração do calendário de 2026 é no
    // último SÁBADO, e "Última sábado" é o erro que uma tabela só produz.
    expect(describeRule({ frequency: "mensal", weekday: 6, weekOfMonth: 5, timeMinutes: 960 })).toBe(
      "Último sábado do mês, 16:00",
    );
    expect(describeRule({ frequency: "mensal", weekday: 0, weekOfMonth: 3, timeMinutes: 540 })).toBe(
      "Terceiro domingo do mês, 09:00",
    );
  });
});
