/**
 * O trecho que o app guarda de um parágrafo do Catecismo.
 *
 * Curto de propósito: é para a família e a catequista lerem no celular o
 * essencial do que o encontro trabalha, e não para trazer o livro para
 * dentro do app — o texto é da Libreria Editrice Vaticana, e inteiro ele
 * continua em vatican.va, a um toque. A mediana dos parágrafos tem uns 390
 * caracteres, então a maioria cabe inteira; os longos são cortados no fim
 * de uma frase.
 */
export const LIMITE_DO_TRECHO = 480;

export function trechoCurto(texto: string, limite = LIMITE_DO_TRECHO): { trecho: string; completo: boolean } {
  const limpo = texto.trim();
  if (limpo.length <= limite) return { trecho: limpo, completo: true };

  const corte = limpo.slice(0, limite);
  // O último fim de frase dentro do limite: ponto, ponto e vírgula,
  // interrogação, exclamação, dois-pontos ou fecha-aspas.
  let fimDeFrase = -1;
  for (const m of corte.matchAll(/[.;?!:»](?=\s)/g)) fimDeFrase = m.index ?? fimDeFrase;

  // Se a frase termina cedo demais, sobraria pouco — corta na palavra.
  const ate = fimDeFrase >= limite * 0.45 ? fimDeFrase + 1 : corte.lastIndexOf(" ");
  return { trecho: `${limpo.slice(0, ate > 0 ? ate : limite).trim()} […]`, completo: false };
}
