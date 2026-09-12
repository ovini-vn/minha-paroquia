/**
 * Dinheiro formatado para leitura, a partir de centavos inteiros.
 *
 * Morava exportado de `app/(fiel)/contribuir/page.tsx`, e a ficha de uma
 * oferta importava dali. O Next não aceita export arbitrário de um
 * `page.tsx`: os tipos gerados exigem que só as chaves conhecidas (default,
 * metadata, revalidate…) saiam de uma página, e o `tsc` acusava
 * "Property 'emReais' is incompatible with index signature" — um erro que
 * não vinha do `next build`, e por isso passava despercebido.
 *
 * Centavos INTEIROS, nunca reais fracionários: contribuição guardada em
 * ponto flutuante é como um centavo some numa soma de trezentas linhas.
 */
export function emReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
