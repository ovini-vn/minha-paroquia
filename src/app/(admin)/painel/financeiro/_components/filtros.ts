import { brasiliaWallClockToUtc, hojeEmBrasilia } from "@/lib/brasilia";

export type PeriodoDeContribuicoes = "mes" | "mes-passado" | "ano" | "todos";

export const PERIODOS: { id: PeriodoDeContribuicoes; rotulo: string }[] = [
  { id: "mes", rotulo: "Este mês" },
  { id: "mes-passado", rotulo: "Mês passado" },
  { id: "ano", rotulo: "Este ano" },
  { id: "todos", rotulo: "Desde o começo" },
];

export type FiltrosDeContribuicoes = {
  periodo: PeriodoDeContribuicoes;
  /** Id da finalidade, "sem" para a doação espontânea, ou nulo para todas. */
  finalidade: string | null;
};

/**
 * A janela de datas do período, em horário de Brasília.
 *
 * `new Date(ano, mes)` usaria o fuso de quem executa, e em produção quem
 * executa é UTC: no dia 1º, "este mês" começaria no dia 30 do anterior e o
 * relatório de setembro traria uma contribuição de agosto.
 */
export function janelaDoPeriodo(periodo: PeriodoDeContribuicoes): { de?: Date; ate?: Date } {
  if (periodo === "todos") return {};

  const hoje = hojeEmBrasilia();
  const ano = Number(hoje.slice(0, 4));
  const mes = Number(hoje.slice(5, 7));

  if (periodo === "ano") {
    return { de: brasiliaWallClockToUtc(ano, 0, 1, 0), ate: brasiliaWallClockToUtc(ano, 11, 31, 0) };
  }

  const alvo = periodo === "mes" ? mes : mes === 1 ? 12 : mes - 1;
  const anoAlvo = periodo === "mes" ? ano : mes === 1 ? ano - 1 : ano;
  const ultimoDia = new Date(Date.UTC(anoAlvo, alvo, 0)).getUTCDate();

  return {
    de: brasiliaWallClockToUtc(anoAlvo, alvo - 1, 1, 0),
    ate: brasiliaWallClockToUtc(anoAlvo, alvo - 1, ultimoDia, 0),
  };
}

/**
 * O endereço da tela, montado num lugar só.
 *
 * Mesmo cuidado das outras: dois filtros que se combinam, e cada um precisa
 * preservar o outro. E o padrão — "este mês", todas as finalidades — não vai
 * para o endereço: escrevê-lo só faria um endereço mais longo dizendo o
 * mesmo que a ausência dele.
 */
export function enderecoDoFinanceiro(filtros: FiltrosDeContribuicoes): string {
  const params = new URLSearchParams();
  if (filtros.periodo !== "mes") params.set("periodo", filtros.periodo);
  if (filtros.finalidade) params.set("para", filtros.finalidade);

  const busca = params.toString();
  return busca ? `/painel/financeiro?${busca}` : "/painel/financeiro";
}
