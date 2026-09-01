import type { CategoriaDaAgenda } from "@prisma/client";

export type Vista = "lista" | "calendario";

export type EstadoDaAgenda = {
  ano: number;
  /** 1 a 12. Pode vir 0 ou 13 — o mês vizinho é normalizado aqui. */
  mes: number;
  vista: Vista;
  /** Vazio quer dizer "todas". */
  categorias: CategoriaDaAgenda[];
};

/**
 * O endereço da agenda, montado num lugar só.
 *
 * Três controles — mês, visão e filtro — e cada um precisa preservar os
 * outros dois. Montando a string em cada botão, o primeiro que esquecesse um
 * parâmetro apagaria a escolha da pessoa em silêncio: trocar de mês perderia
 * o filtro, filtrar voltaria para a lista.
 *
 * O mês vizinho é normalizado aqui de propósito: quem chama pede "mes - 1" e
 * não precisa saber que janeiro menos um é dezembro do ano anterior.
 */
export function enderecoDaAgenda(estado: EstadoDaAgenda): string {
  const ano = estado.mes < 1 ? estado.ano - 1 : estado.mes > 12 ? estado.ano + 1 : estado.ano;
  const mes = estado.mes < 1 ? 12 : estado.mes > 12 ? 1 : estado.mes;

  const params = new URLSearchParams({
    mes: `${ano}-${String(mes).padStart(2, "0")}`,
    vista: estado.vista,
  });
  // Ausente é "todas". Escrever a lista inteira faria um endereço longo
  // dizendo o mesmo que a ausência dele.
  if (estado.categorias.length > 0) params.set("cats", estado.categorias.join(","));

  return `/agenda?${params.toString()}`;
}

/** Liga ou desliga uma categoria, devolvendo a lista nova. */
export function alternarCategoria(
  atuais: CategoriaDaAgenda[],
  categoria: CategoriaDaAgenda,
  todasDoMes: CategoriaDaAgenda[],
): CategoriaDaAgenda[] {
  /*
   * Sem filtro, tocar numa categoria escolhe SÓ ela.
   *
   * É o gesto que a pessoa espera: ela toca em "Missa" porque quer ver as
   * missas, e não porque quer desmarcar as missas. Tratar a ausência de
   * filtro como "todas marcadas" faria o primeiro toque esconder justamente
   * o que foi tocado.
   */
  if (atuais.length === 0) return [categoria];

  const proximas = atuais.includes(categoria)
    ? atuais.filter((c) => c !== categoria)
    : [...atuais, categoria];

  // Marcar todas é o mesmo que não filtrar — e o endereço fica mais curto.
  return proximas.length === todasDoMes.length ? [] : proximas;
}
