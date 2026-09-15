/**
 * Ler um parágrafo do Catecismo nas páginas do site do Vaticano.
 *
 * O texto oficial em português está em vatican.va, um capítulo por página,
 * em HTML dos anos 2000 escrito à mão: o número do parágrafo às vezes vem
 * como `<b>1213.</b>`, às vezes `<b>1281</b><i>.`, `<b>33<i>.</i></b>` ou
 * `<b>755 </b>`, sem ponto. Por isso nada aqui procura uma marcação exata. A
 * página vira uma lista de blocos de texto (um por `<p>`, `<li>`, citação),
 * e um parágrafo começa no bloco que abre com o número em negrito, e vai até
 * o próximo número ou o próximo título.
 *
 * É função pura, sem rede: quem busca a página é o serviço. Assim dá para
 * testar com um pedaço de HTML salvo, e rodar de novo contra as 27 páginas
 * inteiras se o site mudar — na primeira leitura, as 2865 saíram.
 */

export type Bloco = {
  texto: string;
  /** O número, quando o bloco abre um parágrafo. */
  numero: number | null;
  /** Título, subtítulo ou "Resumindo:" — encerra o parágrafo anterior. */
  titulo: boolean;
};

const ENTIDADES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  laquo: "«",
  raquo: "»",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  sect: "§",
  ordm: "º",
  ordf: "ª",
  deg: "°",
  middot: "·",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  ccedil: "ç",
  Ccedil: "Ç",
};

const ACENTOS: Record<string, string> = {
  acute: "́",
  grave: "̀",
  circ: "̂",
  tilde: "̃",
  uml: "̈",
};

function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (inteira, nome: string) => {
    if (nome[0] === "#") {
      const hexa = nome[1] === "x" || nome[1] === "X";
      const codigo = hexa ? parseInt(nome.slice(2), 16) : parseInt(nome.slice(1), 10);
      return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : inteira;
    }
    const conhecida = ENTIDADES[nome];
    if (conhecida !== undefined) return conhecida;
    // &aacute; &Ecirc; &otilde; …: letra + acento, recomposto.
    const acento = /^([a-z])(acute|grave|circ|tilde|uml)$/i.exec(nome);
    if (acento?.[1] && acento[2]) return (acento[1] + ACENTOS[acento[2]]).normalize("NFC");
    return inteira;
  });
}

function limpar(html: string): string {
  return decodificarEntidades(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

const TAG_DE_BLOCO = "p|li|ul|ol|blockquote|h[1-6]|div|table|tbody|tr|td";

/** A página em blocos de texto, na ordem em que aparecem. */
export function blocosDaPagina(html: string): Bloco[] {
  // As notas vêm depois da primeira linha horizontal, numeradas como
  // parágrafos ("1. II Concílio do Vaticano…"): ficam de fora.
  const corpo = html.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "").split(/<hr\b/i)[0] ?? "";
  const pedacos = corpo.split(new RegExp(`<\\/?(?:${TAG_DE_BLOCO})\\b[^>]*>`, "i"));
  // O `split` perde a tag, e o alinhamento ao centro é o que marca título
  // nessas páginas. Então as tags são lidas à parte, na mesma ordem: a tag
  // de índice i-1 é a que abre o pedaço i.
  const tags = [...corpo.matchAll(new RegExp(`<(\\/?)(?:${TAG_DE_BLOCO})\\b([^>]*)>`, "gi"))];
  const blocos: Bloco[] = [];

  pedacos.forEach((pedaco, i) => {
    const texto = limpar(pedaco);
    if (!texto) return;
    const tag = i > 0 ? tags[i - 1] : undefined;
    const centralizado = !!tag && tag[1] === "" && /align\s*=\s*"?center/i.test(tag[2] ?? "");

    // O número abre o bloco, em negrito — às vezes depois de um <font>.
    const cru = pedaco
      .replace(/&nbsp;/gi, " ")
      .replace(/^(?:\s|<\/?(?:font|span|a|u)\b[^>]*>)+/i, "")
      .trim();
    const negrito = /^<b>([\s\S]*?)<\/b>/i.exec(cru);
    const doNegrito = negrito?.[1] !== undefined ? /^(\d{1,4})\s*\.?$/.exec(limpar(negrito[1])) : null;
    const numero = doNegrito?.[1] ? Number(doNegrito[1]) : null;

    // Título é o que vem centralizado; ou todo em negrito, sem nada fora
    // ("I. Como se chama este sacramento?", "Resumindo:"); ou em maiúsculas
    // mesmo sem negrito ("A IRRELIGIÃO", "As CARACTERÍSTICAS DO POVO DE
    // DEUS"); ou curto e aberto por número romano ("III. Maria - ícone
    // escatológico da Igreja").
    const semEspacos = cru.replace(/\s/g, "");
    const soNegrito = /^<b>[\s\S]*<\/b>$/i.test(semEspacos) && !/<\/b>[\s\S]*<b>/i.test(semEspacos);
    const letras = texto.match(/\p{L}/gu)?.length ?? 0;
    const maiusculasNoTexto = texto.match(/\p{Lu}/gu)?.length ?? 0;
    const maiusculas = texto.length < 120 && letras > 0 && maiusculasNoTexto / letras >= 0.8;
    const romano = texto.length < 100 && /^[IVX]{1,5}\.\s/.test(texto) && !/[.;]$/.test(texto);

    blocos.push({
      texto,
      numero,
      titulo: numero === null && (centralizado || soNegrito || maiusculas || romano),
    });
  });

  corrigirNumeracao(blocos);
  return blocos;
}

/**
 * Erros de digitação na numeração do site: o 2217 está como "2117", e o
 * 2439 como "1439". Quando um número destoa e os vizinhos confirmam o que
 * ele deveria ser (o anterior é N-1 e o seguinte é N+1), ele vira N.
 */
function corrigirNumeracao(blocos: Bloco[]) {
  const numerados = blocos.filter((b) => b.numero !== null);
  for (let i = 1; i < numerados.length - 1; i++) {
    const anterior = numerados[i - 1]!.numero!;
    const atual = numerados[i]!;
    if (atual.numero !== anterior + 1 && numerados[i + 1]!.numero === anterior + 2) {
      atual.numero = anterior + 1;
    }
  }
}

/** Chamadas de nota, como "(146)", que no app não levam a lugar nenhum. */
function semNotas(texto: string): string {
  return texto
    .replace(/\s*\(\d{1,4}\)/g, "")
    .replace(/[ \t]+([.,;:»])/g, "$1")
    .trim();
}

/**
 * O texto de um parágrafo, sem o número e sem as chamadas de nota — um
 * bloco por linha. `null` quando a página não tem esse número.
 */
export function extrairParagrafo(html: string, numero: number): string | null {
  const blocos = blocosDaPagina(html);
  const inicio = blocos.findIndex((b) => b.numero === numero);
  if (inicio < 0) return null;

  const primeiro = blocos[inicio]!.texto.replace(/^\d{1,4}\s*\.?\s*/, "");
  const partes = primeiro ? [primeiro] : [];
  for (const bloco of blocos.slice(inicio + 1)) {
    // Só um número MAIOR encerra: um "1." em negrito numa lista dentro do
    // parágrafo não é o parágrafo seguinte.
    if (bloco.titulo || (bloco.numero !== null && bloco.numero > numero)) break;
    partes.push(bloco.texto);
  }
  return semNotas(partes.join("\n"));
}
