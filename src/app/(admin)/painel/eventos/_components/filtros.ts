import type { CategoriaDaAgenda } from "@prisma/client";
import type { PeriodoDeEventos } from "@/server/modules/events/service";

export const PERIODOS: { id: PeriodoDeEventos; rotulo: string }[] = [
  { id: "proximos", rotulo: "Próximos" },
  { id: "mes", rotulo: "Este mês" },
  { id: "passados", rotulo: "Já aconteceram" },
  { id: "todos", rotulo: "Todo o período" },
];

export type FiltrosDeEventos = {
  tipo: CategoriaDaAgenda | null;
  periodo: PeriodoDeEventos;
};

/**
 * O endereço da lista, montado num lugar só.
 *
 * São dois filtros que se combinam, e cada um precisa preservar o outro:
 * montando a string em cada botão, escolher o período apagaria o tipo em
 * silêncio. É o mesmo cuidado que a agenda já exigiu com três controles.
 */
export function enderecoDosEventos(filtros: FiltrosDeEventos): string {
  const params = new URLSearchParams();
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  // "Próximos" é o padrão: escrevê-lo no endereço só faria um endereço mais
  // longo dizendo o mesmo que a ausência dele.
  if (filtros.periodo !== "proximos") params.set("periodo", filtros.periodo);

  const busca = params.toString();
  return busca ? `/painel/eventos?${busca}` : "/painel/eventos";
}
