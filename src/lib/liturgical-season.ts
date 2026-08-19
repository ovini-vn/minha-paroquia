/**
 * Calendário litúrgico centralizado — fonte única de verdade pra "que
 * tempo litúrgico é hoje" (docs do redesign visual, seção 7: "não espalhe
 * verificações de data pela aplicação"). Datas móveis (Quaresma, Tríduo,
 * Páscoa, Pentecostes) derivam da Páscoa via o algoritmo de Meeus/Jones/
 * Butcher (gregoriano) — testado contra datas conhecidas em
 * tests/unit/liturgical-season.test.ts.
 */

export const LITURGICAL_SEASONS = [
  "advento",
  "natal",
  "tempo_comum",
  "quaresma",
  "triduo_pascal",
  "pascoa",
  "pentecostes",
] as const;
export type LiturgicalSeasonCode = (typeof LITURGICAL_SEASONS)[number];

export type LiturgicalSeasonInfo = {
  season: LiturgicalSeasonCode;
  name: string;
  primaryColor: string;
  primaryHoverColor: string;
  primaryLightColor: string;
  accentColor: string;
};

const SEASON_TOKENS: Record<LiturgicalSeasonCode, Omit<LiturgicalSeasonInfo, "season">> = {
  advento: {
    name: "Advento",
    primaryColor: "#6B4E8E",
    primaryHoverColor: "#5A4078",
    primaryLightColor: "#8E63B0",
    accentColor: "#C9A44C",
  },
  natal: {
    name: "Natal",
    primaryColor: "#C9A44C",
    primaryHoverColor: "#B08F3F",
    primaryLightColor: "#D9BE7A",
    accentColor: "#8E63B0",
  },
  tempo_comum: {
    name: "Tempo Comum",
    primaryColor: "#6E8B5B",
    primaryHoverColor: "#5C7549",
    primaryLightColor: "#8FA87F",
    accentColor: "#C9A44C",
  },
  quaresma: {
    name: "Quaresma",
    primaryColor: "#5B2890",
    primaryHoverColor: "#4A2073",
    primaryLightColor: "#8E63B0",
    accentColor: "#C9A44C",
  },
  triduo_pascal: {
    name: "Tríduo Pascal",
    primaryColor: "#2A2A2A",
    primaryHoverColor: "#1A1A1A",
    primaryLightColor: "#4A4A4A",
    accentColor: "#C9A44C",
  },
  pascoa: {
    name: "Páscoa",
    primaryColor: "#C9A44C",
    primaryHoverColor: "#B08F3F",
    primaryLightColor: "#D9BE7A",
    accentColor: "#8E63B0",
  },
  pentecostes: {
    name: "Pentecostes",
    primaryColor: "#A83232",
    primaryHoverColor: "#8A2828",
    primaryLightColor: "#C15A5A",
    accentColor: "#C9A44C",
  },
};

function addDays(date: Date, days: number): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toUtcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Domingo de Páscoa do ano — algoritmo de Meeus/Jones/Butcher (gregoriano). */
export function computeEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Domingo de Epifania (Reis) no calendário brasileiro/CNBB: o domingo entre 2 e 8 de janeiro. */
function computeEpiphanySunday(year: number): Date {
  for (let day = 2; day <= 8; day++) {
    const candidate = new Date(Date.UTC(year, 0, day));
    if (candidate.getUTCDay() === 0) return candidate;
  }
  throw new Error("Não foi possível calcular a Epifania — isso nunca deveria acontecer.");
}

/** Batismo do Senhor: domingo seguinte à Epifania, ou segunda-feira se a Epifania cair em 7/8 de janeiro. */
function computeBaptismOfTheLord(year: number): Date {
  const epiphany = computeEpiphanySunday(year);
  if (epiphany.getUTCDate() >= 7) return addDays(epiphany, 1);
  return addDays(epiphany, 7);
}

/** 4º domingo antes do Natal (domingo mais próximo de 30 de novembro). */
function computeFirstSundayOfAdvent(year: number): Date {
  const stAndrew = new Date(Date.UTC(year, 10, 30));
  const weekday = stAndrew.getUTCDay();
  const offset = weekday === 0 ? 0 : -weekday;
  return addDays(stAndrew, offset);
}

/**
 * Partição única do ano civil — cada verificação depende só do ano de
 * `date` (a Epifania/Batismo de janeiro pertence ao mesmo ano civil que o
 * Natal anterior "vazou" pra ela, então não precisa olhar o ano vizinho).
 */
export function getLiturgicalSeason(date: Date): LiturgicalSeasonInfo {
  const today = toUtcDateOnly(date);
  const year = today.getUTCFullYear();

  const easter = computeEasterSunday(year);
  const ashWednesday = addDays(easter, -46);
  const holyThursday = addDays(easter, -3);
  const holySaturday = addDays(easter, -1);
  const pentecost = addDays(easter, 49);
  const baptismOfTheLord = computeBaptismOfTheLord(year);
  const adventStart = computeFirstSundayOfAdvent(year);
  const christmas = new Date(Date.UTC(year, 11, 25));

  let season: LiturgicalSeasonCode;
  if (today <= baptismOfTheLord) {
    season = "natal"; // sobra do Natal do ano anterior, ainda em janeiro
  } else if (today < ashWednesday) {
    season = "tempo_comum";
  } else if (today < holyThursday) {
    season = "quaresma";
  } else if (today <= holySaturday) {
    season = "triduo_pascal";
  } else if (today < pentecost) {
    season = "pascoa";
  } else if (today.getTime() === pentecost.getTime()) {
    season = "pentecostes";
  } else if (today < adventStart) {
    season = "tempo_comum";
  } else if (today < christmas) {
    season = "advento";
  } else {
    season = "natal"; // 25-31 de dezembro
  }

  return { season, ...SEASON_TOKENS[season] };
}
