import { brasiliaParts, brasiliaWallClockToUtc } from "./brasilia";

/**
 * Repetição de celebração.
 *
 * Cobre o que uma paróquia realmente usa:
 *   - `semanal`: "missa toda quarta às 19h30"
 *   - `mensal`:  "missa de primeira sexta-feira, na capela"
 *
 * Não é uma implementação de RRULE do iCalendar, e isso é deliberado — a
 * regra completa tem dezenas de casos que ninguém aqui vai preencher, e cada
 * um deles é mais superfície para errar.
 */

export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

/** 5 significa ÚLTIMA, não "quinta ocorrência" — nem todo mês tem cinco. */
export const WEEK_OF_MONTH_LABELS: Record<number, string> = {
  1: "Primeira",
  2: "Segunda",
  3: "Terceira",
  4: "Quarta",
  5: "Última",
};

export type RecurrenceRule = {
  frequency: "semanal" | "mensal";
  /** 0 = domingo. */
  weekday: number;
  /** 1..5 quando mensal (5 = última); ignorado quando semanal. */
  weekOfMonth: number | null;
  /** Minutos desde a meia-noite, horário de Brasília. */
  timeMinutes: number;
  startsOn: Date;
  endsOn: Date | null;
};

function diasNoMes(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * A semana do mês a que um dia pertence, e se ele é o ÚLTIMO daquele dia da
 * semana no mês. São coisas diferentes: dia 29 numa sexta pode ser a quinta
 * sexta E a última.
 */
function posicaoNoMes(year: number, month: number, day: number) {
  return {
    semana: Math.floor((day - 1) / 7) + 1,
    ehUltima: day + 7 > diasNoMes(year, month),
  };
}

/**
 * Instantes em que a regra acontece dentro da janela [from, to).
 *
 * Percorre dia a dia no calendário de Brasília em vez de calcular saltos.
 * A janela é de meses, então o custo é irrelevante — e aritmética esperta
 * com fuso e virada de mês é exatamente onde nascem os erros silenciosos.
 */
export function occurrencesBetween(rule: RecurrenceRule, from: Date, to: Date): Date[] {
  const resultado: Date[] = [];

  const inicio = rule.startsOn > from ? rule.startsOn : from;
  const limite = rule.endsOn && rule.endsOn < to ? rule.endsOn : to;
  if (inicio > limite) return resultado;

  const p = brasiliaParts(inicio);
  // Anda pelo calendário local; o UTC de cada ocorrência sai da conversão.
  const cursor = new Date(Date.UTC(p.year, p.month, p.day));
  const fimParts = brasiliaParts(limite);
  const fim = new Date(Date.UTC(fimParts.year, fimParts.month, fimParts.day));

  while (cursor <= fim) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const day = cursor.getUTCDate();

    if (cursor.getUTCDay() === rule.weekday) {
      let vale = rule.frequency === "semanal";

      if (rule.frequency === "mensal" && rule.weekOfMonth) {
        const { semana, ehUltima } = posicaoNoMes(year, month, day);
        vale = rule.weekOfMonth === 5 ? ehUltima : semana === rule.weekOfMonth;
      }

      if (vale) {
        const instante = brasiliaWallClockToUtc(year, month, day, rule.timeMinutes);
        // A hora do dia pode jogar a ocorrência para fora da janela mesmo
        // com o dia dentro dela.
        if (instante >= from && instante < to) resultado.push(instante);
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return resultado;
}

/** "Toda quarta-feira, 19:00" / "Primeira sexta-feira do mês, 15:00". */
export function describeRule(rule: Pick<RecurrenceRule, "frequency" | "weekday" | "weekOfMonth" | "timeMinutes">): string {
  const dia = WEEKDAY_LABELS[rule.weekday] ?? "";
  const hora = `${String(Math.floor(rule.timeMinutes / 60)).padStart(2, "0")}:${String(rule.timeMinutes % 60).padStart(2, "0")}`;

  if (rule.frequency === "semanal") {
    // "Todo domingo" / "Toda segunda-feira" — o gênero muda com o dia.
    const artigo = rule.weekday === 0 || rule.weekday === 6 ? "Todo" : "Toda";
    return `${artigo} ${dia.toLowerCase()}, ${hora}`;
  }

  const ordinal = WEEK_OF_MONTH_LABELS[rule.weekOfMonth ?? 1] ?? "Primeira";
  return `${ordinal} ${dia.toLowerCase()} do mês, ${hora}`;
}
