import { ENDERECO_DO_CATECISMO, ULTIMO_PARAGRAFO } from "./endereco";
import { INDICE_DO_CATECISMO, PAGINAS_DO_CATECISMO, type NivelDoCatecismo } from "./indice";

/**
 * Achar o lugar de um parágrafo, ou de um assunto, no Catecismo.
 *
 * Tudo aqui trabalha sobre o índice gerado (só a estrutura: títulos e onde
 * cada um começa). O texto fica em vatican.va, e o que o app entrega é o
 * caminho até ele: "parágrafo 1324 fica na Parte 2, no artigo sobre a
 * Eucaristia" e o link que abre o capítulo já no parágrafo.
 */

export type TituloDoCatecismo = {
  nivel: NivelDoCatecismo;
  rotulo: string;
  titulo: string;
  /** Primeiro e último parágrafo sob este título. */
  inicio: number;
  fim: number;
  ancora?: string;
};

/** Quanto mais baixo, mais alto na hierarquia. */
const PESO: Record<NivelDoCatecismo, number> = {
  parte: 0,
  secao: 1,
  capitulo: 2,
  artigo: 3,
  paragrafo: 4,
  subtitulo: 5,
  topico: 6,
};

export const TITULOS_DO_CATECISMO: readonly TituloDoCatecismo[] = INDICE_DO_CATECISMO.map(
  ([nivel, inicio, rotulo, titulo, ancora], i) => {
    // Um título vale até o próximo do mesmo nível ou acima.
    const proximo = INDICE_DO_CATECISMO.slice(i + 1).find(([n]) => PESO[n] <= PESO[nivel]);
    const fim = proximo ? Math.max(inicio, proximo[1] - 1) : ULTIMO_PARAGRAFO;
    return { nivel, rotulo, titulo, inicio, fim, ...(ancora ? { ancora } : {}) };
  },
);

export function ehParagrafoValido(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= ULTIMO_PARAGRAFO;
}

/** A página do site (um capítulo) onde está o parágrafo. */
export function paginaDoParagrafo(n: number): { de: number; ate: number; arquivo: string } | null {
  const pagina = PAGINAS_DO_CATECISMO.find(([de, ate]) => n >= de && n <= ate);
  return pagina ? { de: pagina[0], ate: pagina[1], arquivo: pagina[2] } : null;
}

export function enderecoDaPagina(arquivo: string): string {
  return ENDERECO_DO_CATECISMO + encodeURIComponent(arquivo);
}

/**
 * Do maior para o menor: a parte, a seção, o capítulo, o artigo e o
 * subtítulo em que o parágrafo está.
 */
export function caminhoDoParagrafo(n: number): TituloDoCatecismo[] {
  const pilha: TituloDoCatecismo[] = [];
  for (const titulo of TITULOS_DO_CATECISMO) {
    if (titulo.inicio > n) break;
    while (pilha.length > 0 && PESO[pilha[pilha.length - 1]!.nivel] >= PESO[titulo.nivel]) pilha.pop();
    pilha.push(titulo);
  }
  return pilha.filter((t) => t.fim >= n);
}

/**
 * O link que abre o capítulo no site do Vaticano já no parágrafo.
 *
 * O `#:~:text=1324.` é um fragmento de texto: o navegador rola até a
 * primeira ocorrência de "1324." e a destaca. Quando o parágrafo não tem o
 * ponto no site (há uns vinte assim), o navegador ignora o fragmento e usa a
 * âncora do artigo, que vem antes dele — cai no começo do artigo, que é o
 * melhor que dá.
 */
export function enderecoDoParagrafo(n: number): string | null {
  const pagina = paginaDoParagrafo(n);
  if (!pagina) return null;
  const artigo = caminhoDoParagrafo(n).find((t) => t.nivel === "artigo" && t.ancora && t.inicio >= pagina.de);
  return `${enderecoDaPagina(pagina.arquivo)}#${artigo?.ancora ?? ""}:~:text=${n}.`;
}

export function enderecoDoTitulo(titulo: TituloDoCatecismo): string {
  const pagina = paginaDoParagrafo(titulo.inicio);
  if (!pagina) return ENDERECO_DO_CATECISMO;
  if (titulo.ancora) return `${enderecoDaPagina(pagina.arquivo)}#${titulo.ancora}`;
  if (titulo.inicio === pagina.de) return enderecoDaPagina(pagina.arquivo);
  return `${enderecoDaPagina(pagina.arquivo)}#:~:text=${titulo.inicio}.`;
}

/** "§ 1324" ou "§ 1322–1419". */
export function faixaDeParagrafos(titulo: Pick<TituloDoCatecismo, "inicio" | "fim">): string {
  return titulo.inicio === titulo.fim ? `§ ${titulo.inicio}` : `§ ${titulo.inicio}–${titulo.fim}`;
}

/**
 * "1324", "§1324", "CIC 1324", "parágrafo 1324", "n. 1324" → 1324.
 * Qualquer outra coisa → null, e a busca vai para os títulos.
 */
export function numeroDaConsulta(consulta: string): number | null {
  const m = /^\s*(?:cic|catecismo|§|par[áa]grafo|n\.?\s*º?|nº)?\s*(\d{1,4})\s*$/i.exec(consulta);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return ehParagrafoValido(n) ? n : null;
}

/**
 * Para comparar sem acento, sem caixa e sem a grafia de Portugal.
 *
 * O texto do site é a tradução de Portugal — "Baptismo", "acto", "acção".
 * Quem procura escreve como no Brasil. As duas grafias passam pela mesma
 * normalização e se encontram: "batismo" acha "Baptismo".
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/p(?=[tc])/g, "")
    .replace(/c(?=t)/g, "")
    .replace(/cc/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

const PALAVRAS_VAZIAS = new Set(["a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "na", "no", "nas", "nos", "um", "uma", "que", "para", "com", "por"]);

export type AchadoNoCatecismo = TituloDoCatecismo & {
  /** O artigo ou capítulo em que o título está, para dar contexto. */
  dentroDe: TituloDoCatecismo | null;
};

export function buscarNoCatecismo(consulta: string, limite = 40): { achados: AchadoNoCatecismo[]; truncado: boolean } {
  const termos = normalizar(consulta)
    .split(" ")
    .filter((t) => t.length >= 2 && !PALAVRAS_VAZIAS.has(t));
  if (termos.length === 0) return { achados: [], truncado: false };

  const todos = TITULOS_DO_CATECISMO.filter((t) => {
    if (t.titulo === "Resumindo") return false;
    const alvo = normalizar(t.titulo);
    // No começo da palavra: "ato" não pode achar "contato".
    return termos.every((termo) => ` ${alvo}`.includes(` ${termo}`));
  });

  const achados = todos.slice(0, limite).map((t) => {
    const acima = caminhoDoParagrafo(t.inicio).filter((c) => PESO[c.nivel] < PESO[t.nivel]);
    const dentroDe =
      [...acima].reverse().find((c) => c.nivel === "artigo" || c.nivel === "paragrafo") ??
      [...acima].reverse().find((c) => c.nivel === "capitulo" || c.nivel === "secao" || c.nivel === "parte") ??
      null;
    return { ...t, dentroDe };
  });
  return { achados, truncado: todos.length > limite };
}

export type RamoDoIndice = TituloDoCatecismo & { filhos: RamoDoIndice[] };

/** Partes → seções → capítulos → artigos → parágrafos, para navegar. */
export function arvoreDoCatecismo(): RamoDoIndice[] {
  const raiz: RamoDoIndice[] = [];
  const pilha: RamoDoIndice[] = [];
  for (const titulo of TITULOS_DO_CATECISMO) {
    if (PESO[titulo.nivel] > PESO.paragrafo) continue;
    const ramo: RamoDoIndice = { ...titulo, filhos: [] };
    while (pilha.length > 0 && PESO[pilha[pilha.length - 1]!.nivel] >= PESO[titulo.nivel]) pilha.pop();
    const pai = pilha[pilha.length - 1];
    (pai ? pai.filhos : raiz).push(ramo);
    pilha.push(ramo);
  }
  return raiz;
}
