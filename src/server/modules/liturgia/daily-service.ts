import { getLiturgicalSeason, type LiturgicalSeasonCode } from "@/lib/liturgical-season";

/**
 * O "hoje" litúrgico que o app consegue afirmar SOZINHO: a data e o tempo
 * litúrgico, ambos calculáveis (ver src/lib/liturgical-season.ts).
 *
 * O que NÃO está aqui, de propósito: as leituras do dia. O lecionário é uma
 * tabela extensa (ciclos A/B/C aos domingos, I/II nos dias de semana, mais o
 * próprio dos santos) e o texto das traduções católicas em português é
 * licenciado. Derivar um palpite do tempo litúrgico produziria uma
 * referência errada apresentada como certa — pior do que não ter o dado.
 *
 * As leituras vêm da paróquia, via LiturgyOfTheDay (a secretaria/pároco
 * publica), que é a fonte de verdade real para a comunidade.
 */

export type TodayContext = {
  dateLabel: string;
  weekdayLabel: string;
  season: LiturgicalSeasonCode;
  seasonName: string;
};

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function getTodayContext(date: Date): TodayContext {
  const season = getLiturgicalSeason(date);

  return {
    dateLabel: new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date),
    weekdayLabel: WEEKDAYS[date.getDay()] ?? "Hoje",
    season: season.season,
    seasonName: season.name,
  };
}
