/**
 * Acompanhar pela voz quem está rezando — o "videokê" do terço.
 *
 * PROTÓTIPO (15/09/2026). O navegador transforma a fala em texto; aqui esse
 * texto é comparado com a oração, que o app já conhece palavra por palavra.
 * Por isso não é preciso entender a fala com perfeição: basta ir casando o
 * que foi ouvido com o que vem a seguir na oração.
 *
 * Três perguntas, respondidas sem microfone nem tela — dá para testar com
 * frases escritas:
 *
 * 1. ATÉ ONDE a pessoa já rezou (`acompanhar`), para acender as palavras.
 * 2. Se TERMINOU (`terminou`): chegou às últimas palavras depois de ter
 *    rezado a maior parte da oração. Não depende de "Amém" — o Ó meu Jesus
 *    termina em "as que mais precisarem", e o Oferecimento em "desta santa
 *    devoção".
 * 3. Se já COMEÇOU A PRÓXIMA (`inicioDaProxima`): a segunda chance, para
 *    quando o fim se perdeu no barulho. Só vale depois da metade da oração
 *    da vez — senão, numa sequência de Ave-Marias, o "Ave Maria" do começo
 *    seria confundido com o começo da seguinte.
 */

export type PalavraExibida = {
  /** Como aparece na tela, com a pontuação: "livrai-nos,". */
  texto: string;
  /** Espaço ou quebra de linha: fica na tela, mas não é palavra. */
  espaco: boolean;
  /** Onde começam e terminam as palavras normalizadas desta palavra da tela. */
  de: number;
  ate: number;
};

/** "Livrai-nos," → ["livrai", "nos"]. Sem acento, sem caixa, sem pontuação. */
export function normalizarPalavras(texto: string): string[] {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[-–—]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** A oração como a tela mostra, com o endereço de cada palavra na lista normalizada. */
export function palavrasDaOracao(texto: string): { exibidas: PalavraExibida[]; esperadas: string[] } {
  const exibidas: PalavraExibida[] = [];
  const esperadas: string[] = [];
  for (const pedaco of texto.split(/(\s+)/)) {
    if (!pedaco) continue;
    if (/^\s+$/.test(pedaco)) {
      exibidas.push({ texto: pedaco, espaco: true, de: esperadas.length, ate: esperadas.length });
      continue;
    }
    const normais = normalizarPalavras(pedaco);
    exibidas.push({ texto: pedaco, espaco: false, de: esperadas.length, ate: esperadas.length + normais.length });
    esperadas.push(...normais);
  }
  return { exibidas, esperadas };
}

function distancia(a: string, b: string): number {
  const linha = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0]!;
    linha[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = linha[j]!;
      linha[j] = Math.min(linha[j]! + 1, linha[j - 1]! + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = guardado;
    }
  }
  return linha[b.length]!;
}

/**
 * Se a palavra ouvida é a esperada. O reconhecimento erra letras ("convosco"
 * vira "com vosco", "bendito" vira "bendita"), então palavras longas aceitam
 * uma ou duas letras de diferença. As curtas ("e", "o", "de", "nos") só
 * valem iguais: com tolerância, qualquer coisa casaria com elas.
 */
export function parecidas(ouvida: string, esperada: string): boolean {
  if (ouvida === esperada) return true;
  const menor = Math.min(ouvida.length, esperada.length);
  if (menor <= 3) return false;
  const limite = menor >= 6 ? 2 : 1;
  return Math.abs(ouvida.length - esperada.length) <= limite && distancia(ouvida, esperada) <= limite;
}

export type Andamento = {
  /** Quantas palavras da oração já foram rezadas, em ordem. */
  posicao: number;
  /** Quantas palavras ouvidas casaram com a oração. */
  acertos: number;
  /** Índice da palavra ouvida que levou a oração além da metade (ou -1 se já estava). */
  metadeEm: number | null;
  /** Índice da palavra ouvida que fechou a oração. */
  fimEm: number | null;
};

/** Quantas palavras à frente uma palavra ouvida pode pular — o que o reconhecimento engoliu. */
const JANELA = 4;

/**
 * Casa as palavras ouvidas com a oração, da `base` em diante.
 *
 * Guloso e sempre para a frente: cada palavra ouvida procura a sua nas
 * próximas quatro da oração. Palavras que não estão na oração (o anúncio do
 * mistério antes do Pai-Nosso, uma conversa no carro) simplesmente não
 * casam e não movem nada.
 */
export function acompanhar(
  esperadas: string[],
  ouvidas: string[],
  base: { posicao: number; acertos: number } = { posicao: 0, acertos: 0 },
): Andamento {
  let { posicao, acertos } = base;
  const metade = Math.ceil(esperadas.length / 2);
  let metadeEm: number | null = posicao >= metade ? -1 : null;
  let fimEm: number | null = posicao >= esperadas.length ? -1 : null;

  ouvidas.forEach((palavra, i) => {
    if (posicao >= esperadas.length) return;
    const limite = Math.min(esperadas.length, posicao + (palavra.length <= 3 ? 2 : JANELA));
    for (let k = posicao; k < limite; k++) {
      if (parecidas(palavra, esperadas[k]!)) {
        posicao = k + 1;
        acertos++;
        if (metadeEm === null && posicao >= metade) metadeEm = i;
        if (fimEm === null && posicao >= esperadas.length) fimEm = i;
        break;
      }
    }
  });

  return { posicao, acertos, metadeEm, fimEm };
}

/** Parte mínima das palavras da oração que precisa ter sido reconhecida. */
export const COBERTURA_MINIMA = 0.6;

/**
 * Chegou ao fim tendo rezado a maior parte. `quase` aceita a última palavra
 * perdida — o "Amém" final é justamente o que mais se perde, dito mais
 * baixo — e por isso a tela espera uma pausa maior antes de passar.
 */
export function terminou(esperadas: string[], andamento: Andamento): "sim" | "quase" | "nao" {
  const cobriu = andamento.acertos >= Math.ceil(esperadas.length * COBERTURA_MINIMA);
  if (!cobriu) return "nao";
  if (andamento.posicao >= esperadas.length) return "sim";
  if (esperadas.length >= 6 && andamento.posicao >= esperadas.length - 1) return "quase";
  return "nao";
}

/**
 * Onde, nas palavras ouvidas, começou a próxima oração — ou -1.
 *
 * Procura as três primeiras palavras dela, em sequência, aceitando que uma
 * palavra de fora apareça no meio ("ave ... maria cheia"). Duas das três já
 * bastam quando são as duas primeiras: "pai nosso", "ave maria".
 */
export function inicioDaProxima(ouvidas: string[], proxima: string[]): number {
  const alvo = proxima.slice(0, 3);
  if (alvo.length < 2) return -1;
  for (let i = 0; i < ouvidas.length; i++) {
    if (!parecidas(ouvidas[i]!, alvo[0]!)) continue;
    let k = 1;
    let j = i + 1;
    let folga = 1;
    while (k < alvo.length && j < ouvidas.length) {
      if (parecidas(ouvidas[j]!, alvo[k]!)) {
        k++;
      } else if (folga > 0) {
        folga--;
      } else {
        break;
      }
      j++;
    }
    if (k >= alvo.length || (k >= 2 && j >= ouvidas.length)) return i;
  }
  return -1;
}
