import {
  addDays,
  toUtcDateOnly,
  computeEasterSunday,
  computeEpiphanySunday,
  computeFirstSundayOfAdvent,
} from "./liturgical-season";

/**
 * Solenidades e festas do calendário litúrgico — o "que se celebra hoje".
 *
 * Complementa liturgical-season.ts (que responde "que TEMPO é hoje"),
 * reaproveitando o cálculo da Páscoa de lá em vez de duplicá-lo.
 *
 * Segue o calendário próprio do BRASIL, que difere do romano geral em
 * alguns pontos importantes e deliberados:
 *   - Nossa Senhora Aparecida (12/10) é solenidade, padroeira do país;
 *   - Epifania e Ascensão são transferidas para o domingo;
 *   - Corpus Christi é celebrado na quinta-feira (é feriado nacional).
 *
 * Escopo assumido: as solenidades e festas do Senhor, de Nossa Senhora e
 * dos apóstolos principais. NÃO é o santoral completo (que tem memória em
 * quase todo dia do ano) — para isso seria preciso uma fonte licenciada,
 * como o lecionário. O que está aqui são datas de conhecimento público e
 * cálculo determinístico.
 */

export type FeastRank = "solenidade" | "festa" | "memoria";

export type Feast = {
  /** Meia-noite UTC do dia. */
  date: Date;
  name: string;
  rank: FeastRank;
  /** Feriado civil no Brasil — útil para avisar a comunidade. */
  civilHoliday?: boolean;
};

/** Datas fixas no calendário civil. */
function fixedFeasts(year: number): Feast[] {
  const on = (month: number, day: number) => new Date(Date.UTC(year, month - 1, day));

  return [
    { date: on(1, 1), name: "Santa Maria, Mãe de Deus", rank: "solenidade", civilHoliday: true },
    { date: on(2, 2), name: "Apresentação do Senhor", rank: "festa" },
    { date: on(3, 19), name: "São José, Esposo de Maria", rank: "solenidade" },
    { date: on(3, 25), name: "Anunciação do Senhor", rank: "solenidade" },
    { date: on(6, 24), name: "Natividade de São João Batista", rank: "solenidade" },
    { date: on(6, 29), name: "São Pedro e São Paulo", rank: "solenidade" },
    { date: on(8, 6), name: "Transfiguração do Senhor", rank: "festa" },
    { date: on(8, 15), name: "Assunção de Nossa Senhora", rank: "solenidade" },
    { date: on(9, 8), name: "Natividade de Nossa Senhora", rank: "festa" },
    {
      date: on(10, 12),
      name: "Nossa Senhora Aparecida, Padroeira do Brasil",
      rank: "solenidade",
      civilHoliday: true,
    },
    { date: on(11, 1), name: "Todos os Santos", rank: "solenidade" },
    { date: on(11, 2), name: "Comemoração de Todos os Fiéis Defuntos", rank: "solenidade", civilHoliday: true },
    { date: on(12, 8), name: "Imaculada Conceição de Nossa Senhora", rank: "solenidade" },
    { date: on(12, 25), name: "Natal do Senhor", rank: "solenidade", civilHoliday: true },
  ];
}

/** Datas que derivam da Páscoa (ou do Advento). */
function movableFeasts(year: number): Feast[] {
  const easter = computeEasterSunday(year);
  const advent = computeFirstSundayOfAdvent(year);

  return [
    { date: computeEpiphanySunday(year), name: "Epifania do Senhor", rank: "solenidade" },
    { date: addDays(easter, -46), name: "Quarta-feira de Cinzas", rank: "festa" },
    { date: addDays(easter, -7), name: "Domingo de Ramos", rank: "solenidade" },
    { date: addDays(easter, -3), name: "Quinta-feira Santa", rank: "solenidade" },
    { date: addDays(easter, -2), name: "Sexta-feira Santa da Paixão do Senhor", rank: "solenidade", civilHoliday: true },
    { date: addDays(easter, -1), name: "Sábado Santo", rank: "solenidade" },
    { date: easter, name: "Domingo de Páscoa", rank: "solenidade" },
    // No Brasil a Ascensão é transferida da quinta (+39) para o domingo.
    { date: addDays(easter, 42), name: "Ascensão do Senhor", rank: "solenidade" },
    { date: addDays(easter, 49), name: "Pentecostes", rank: "solenidade" },
    { date: addDays(easter, 56), name: "Santíssima Trindade", rank: "solenidade" },
    { date: addDays(easter, 60), name: "Corpus Christi", rank: "solenidade", civilHoliday: true },
    { date: addDays(easter, 68), name: "Sagrado Coração de Jesus", rank: "solenidade" },
    // Último domingo antes do Advento.
    { date: addDays(advent, -7), name: "Cristo Rei do Universo", rank: "solenidade" },
  ];
}

function feastsOfYear(year: number): Feast[] {
  return [...fixedFeasts(year), ...movableFeasts(year)].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
}

/** O que se celebra exatamente neste dia, se houver. */
export function getFeastOn(date: Date): Feast | null {
  const target = toUtcDateOnly(date).getTime();
  return feastsOfYear(date.getUTCFullYear()).find((f) => f.date.getTime() === target) ?? null;
}

/**
 * As próximas celebrações a partir de `date`. Atravessa a virada do ano
 * olhando também o ano seguinte — em dezembro, as próximas datas relevantes
 * são de janeiro.
 */
export function getUpcomingFeasts(date: Date, limit = 4): Feast[] {
  const from = toUtcDateOnly(date).getTime();
  const year = date.getUTCFullYear();

  return [...feastsOfYear(year), ...feastsOfYear(year + 1)]
    .filter((f) => f.date.getTime() >= from)
    .slice(0, limit);
}

/** Quantos dias faltam — 0 = hoje, 1 = amanhã. */
export function daysUntil(feast: Feast, from: Date): number {
  const ms = feast.date.getTime() - toUtcDateOnly(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** "Hoje" / "Amanhã" / "Em 5 dias". null quando está longe demais para valer. */
export function relativeLabel(days: number): string | null {
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days < 7) return `Em ${days} dias`;
  return null;
}
