import { randomBytes } from "node:crypto";

/**
 * O identificador que liga um Pix recebido a uma cobrança.
 *
 * Ele viaja dentro do BR Code, chega ao banco junto com o pagamento e — nos
 * bancos que o devolvem — volta no extrato. É a única evidência objetiva de
 * que aquele dinheiro é daquela cobrança. Tudo o mais (nome, valor, data) é
 * coincidência, e coincidência não concilia.
 *
 * FORMA: "MP" + dois dígitos do ano + 9 caracteres sorteados. Exemplo:
 * `MP26A8F91XK7P`. Treze caracteres, dentro do limite de 25 do campo de
 * referência, e curto o bastante para caber na tela de um extrato bancário
 * sem ser cortado.
 *
 * O QUE ELE NÃO CARREGA: nome, CPF, e-mail, id de usuário, valor. Um
 * identificador de pagamento passa por sistemas de terceiros e aparece em
 * extrato que outras pessoas leem — pôr dado pessoal nele seria vazá-lo por
 * um caminho que ninguém audita.
 */

/**
 * Alfabeto sem os caracteres que se confundem quando alguém LÊ o código de
 * um extrato para digitar noutro lugar: 0/O, 1/I/L, 5/S, 2/Z, 8/B.
 *
 * A secretaria vai fazer isso — conferir um identificador do extrato contra
 * a tela — e um "O" lido como zero manda procurar uma cobrança que não
 * existe.
 */
const ALFABETO = "ACDEFGHJKMNPQRTUVWXY34679";

/** Quantos caracteres sorteados vêm depois do prefixo e do ano. */
const SORTEADOS = 9;

/**
 * Sorteia com `randomBytes`, e não com `Math.random`.
 *
 * Não é segredo — o identificador aparece no extrato —, mas ser previsível
 * permitiria a alguém adivinhar identificadores de cobranças alheias e usá-
 * los para forçar uma conciliação errada. `Math.random` é previsível o
 * bastante para isso.
 *
 * A rejeição de valores acima do maior múltiplo do alfabeto evita o viés do
 * módulo: sem ela, as primeiras letras sairiam com mais frequência.
 */
function sortear(quantos: number): string {
  const teto = Math.floor(256 / ALFABETO.length) * ALFABETO.length;
  let saida = "";
  while (saida.length < quantos) {
    for (const byte of randomBytes(quantos * 2)) {
      if (byte >= teto) continue;
      saida += ALFABETO[byte % ALFABETO.length];
      if (saida.length === quantos) break;
    }
  }
  return saida;
}

export function gerarIdentificadorPix(agora = new Date()): string {
  const ano = String(agora.getUTCFullYear()).slice(-2);
  return `MP${ano}${sortear(SORTEADOS)}`;
}

/** Reconhece um identificador nosso dentro do texto solto de um extrato. */
export function acharIdentificador(texto: string): string | null {
  const achado = new RegExp(`MP\\d{2}[${ALFABETO}]{${SORTEADOS}}`).exec(texto.toUpperCase());
  return achado?.[0] ?? null;
}
