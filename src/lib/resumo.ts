/**
 * O começo de um texto longo, para caber numa notificação.
 *
 * Vivia dentro do módulo de avisos, onde nasceu. Saiu para cá quando a
 * Palavra do Padre passou a precisar da mesma coisa: duas cópias da mesma
 * função é como duas telas começam a truncar de jeitos diferentes, e o
 * limite de uma muda sem o da outra.
 *
 * Colapsa espaço em branco antes de medir, porque um texto colado de outro
 * lugar costuma vir com quebras de linha que não valem caractere nenhum
 * para quem lê a notificação numa linha só.
 */
export function resumir(texto: string, limite = 140): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite - 1).trimEnd()}…`;
}
