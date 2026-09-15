/**
 * Gera src/lib/catecismo/indice.ts a partir das páginas do Catecismo no
 * site do Vaticano.
 *
 *   npx tsx scripts/gerar-indice-do-catecismo.ts            (baixa as 27 páginas)
 *   npx tsx scripts/gerar-indice-do-catecismo.ts pasta/      (usa páginas já baixadas)
 *
 * O índice guarda só a ESTRUTURA — partes, seções, capítulos, artigos e
 * subtítulos, com o número do parágrafo em que cada um começa. O texto não
 * vem para o app: quem quer ler abre o capítulo em vatican.va, e na
 * Catequese só entram os parágrafos que a coordenação escolheu.
 *
 * Os títulos no site estão quase todos em maiúsculas ("O SACRAMENTO DO
 * BAPTISMO"). Em maiúsculas, um título longo é difícil de ler para quem
 * enxerga pouco, então aqui eles viram frase, preservando nomes próprios e
 * os de Deus, da Igreja e dos sacramentos. Rodou uma vez e o resultado foi
 * relido à mão; se o site mudar, rodar de novo e reler o diff.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { blocosDaPagina } from "../src/lib/catecismo/extrair";
import { ENDERECO_DO_CATECISMO } from "../src/lib/catecismo/endereco";

const ARQUIVOS = [
  "prologo 1-25_po.html",
  "p1s1c1_26-49_po.html",
  "p1s1c2_50-141_po.html",
  "p1s1c3_142-184_po.html",
  "p1s2_185-197_po.html",
  "p1s2c1_198-421_po.html",
  "p1s2cap2_422-682_po.html",
  "p1s2cap3_683-1065_po.html",
  "p2s1cap1_1066-1075_po.html",
  "p2s1cap1_1076-1134_po.html",
  "p2s1cap2_1135-1209_po.html",
  "p2s2cap1_1210-1419_po.html",
  "p2s2cap1_1420-1532_po.html",
  "p2s2cap3_1533-1666_po.html",
  "p2s2cap4_1667-1690_po.html",
  "p3-intr_1691-1698_po.html",
  "p3s1cap1_1699-1876_po.html",
  "p3s1cap2_1877-1948_po.html",
  "p3s1cap3_1949-2051_po.html",
  "p3s2-intr_2052-2082_po.html",
  "p3s2cap1_2083-2195_po.html",
  "p3s2cap2_2196-2557_po.html",
  "p4-intr_2558-2565_po.html",
  "p4s1cap1_2566-2649_po.html",
  "p4s1cap2_2650-2696_po.html",
  "p4s1cap3_2697-2758_po.html",
  "p4s2_2759-2865_po.html",
];

const ORDINAL: Record<string, number> = {
  PRIMEIRA: 1,
  SEGUNDA: 2,
  TERCEIRA: 3,
  QUARTA: 4,
  PRIMEIRO: 1,
  SEGUNDO: 2,
  TERCEIRO: 3,
  QUARTO: 4,
};

/** Palavras que continuam com maiúscula quando o título vira frase. */
const MAIUSCULAS = new Set(
  (
    "Deus Jesus Cristo Espírito Pai Filho Igreja Igrejas Maria Virgem Abraão Adão Noé David Elias " +
    "Moisés Israel Jerusalém João Baptista Pilatos Pôncio Getsémani Pentecostes Senhor Trindade " +
    "Santíssima Verbo Escritura Escrituras Evangelho Testamento Magistério Baptismo Confirmação " +
    "Eucaristia Penitência Reconciliação Unção Matrimónio Decálogo Credo Papa Messias Ámen Amen " +
    "Criador Redentor Mediador Natal"
  ).split(" "),
);

/** Duplas em que as duas palavras levam maiúscula. */
const DUPLAS: [string, string][] = [
  ["espírito", "santo"],
  ["antiga", "aliança"],
  ["nova", "aliança"],
  ["sagrada", "família"],
  ["imaculada", "conceição"],
  ["igreja", "católica"],
  ["santa", "igreja"],
  ["pai", "nosso"],
  ["antigo", "testamento"],
  ["novo", "testamento"],
  ["sagrada", "escritura"],
];

function comMaiuscula(p: string) {
  return p.charAt(0).toLocaleUpperCase("pt") + p.slice(1);
}

function emFrase(titulo: string): string {
  // Chamadas de nota que ficaram no título: "(32)".
  const limpo = titulo.replace(/\s*\(\d{1,4}\)/g, "").trim();
  const letras = limpo.match(/\p{L}/gu)?.length ?? 0;
  const maiusculas = limpo.match(/\p{Lu}/gu)?.length ?? 0;
  if (!letras || maiusculas / letras < 0.8) return limpo; // já vem em caixa normal

  const pedacos = limpo.split(/(\s+|[«»"()–—,.:;!?…]+)/);
  const saida = pedacos.map((p) => (/\p{Lu}/u.test(p) && p === p.toUpperCase() ? p.toLocaleLowerCase("pt") : p));
  const palavras = saida.map((p, i) => ({ p, i })).filter((x) => /\p{L}/u.test(x.p));
  palavras.forEach(({ p, i }, k) => {
    if (MAIUSCULAS.has(comMaiuscula(p))) saida[i] = comMaiuscula(p);
    if (p === "todo-poderoso") saida[i] = "Todo-Poderoso";
    const seguinte = palavras[k + 1];
    for (const [a, b] of DUPLAS) {
      if (p === a && seguinte?.p === b) {
        saida[i] = comMaiuscula(p);
        saida[seguinte.i] = comMaiuscula(seguinte.p);
      }
    }
  });
  const frase = saida.join("").replace(/sacramento da ordem/g, "sacramento da Ordem");
  // A primeira letra sobe — menos quando o título continua o anterior
  // ("... continuada na sucessão apostólica").
  return frase.startsWith("...") || frase.startsWith("…") ? frase : frase.replace(/\p{L}/u, (l) => l.toLocaleUpperCase("pt"));
}

type Nivel = "parte" | "secao" | "capitulo" | "artigo" | "paragrafo" | "subtitulo" | "topico";
type Linha = [Nivel, number, string, string] | [Nivel, number, string, string, string];

async function lerPagina(arquivo: string, pasta?: string): Promise<string> {
  const bytes = pasta
    ? readFileSync(`${pasta}/${arquivo}`)
    : new Uint8Array(await (await fetch(ENDERECO_DO_CATECISMO + encodeURIComponent(arquivo))).arrayBuffer());
  return new TextDecoder("windows-1252").decode(bytes);
}

async function main() {
  const pasta = process.argv[2];
  const linhas: Linha[] = [];
  const vigente: Partial<Record<Nivel, string>> = {};

  for (const arquivo of ARQUIVOS) {
    const html = await lerPagina(arquivo, pasta);
    const ancoras = [...html.matchAll(/<a name="([^"]+)"/g)].map((m) => m[1]!);
    const blocos = blocosDaPagina(html);

    for (let i = 0; i < blocos.length; i++) {
      const bloco = blocos[i]!;
      if (!bloco.titulo) continue;
      const inicio = blocos.slice(i + 1).find((b) => b.numero !== null)?.numero;
      if (inicio == null) continue;
      const texto = bloco.texto;
      // O Prólogo descreve as quatro partes numa lista com cara de título.
      if (arquivo.startsWith("prologo") && /PARTE:/.test(texto)) continue;

      const tituloSeguinte = () => {
        const seguinte = blocos[i + 1];
        if (!seguinte?.titulo) return "";
        i++;
        return seguinte.texto;
      };
      // Parte, seção e capítulo se repetem no topo de cada página do site.
      const estrutural = (nivel: Nivel, rotulo: string, titulo: string, ancora?: string) => {
        const chave = `${rotulo}|${titulo}`;
        if (nivel === "parte" || nivel === "secao" || nivel === "capitulo") {
          if (vigente[nivel] === chave) return;
          vigente[nivel] = chave;
          if (nivel === "parte") delete vigente.secao;
          if (nivel !== "capitulo") delete vigente.capitulo;
        }
        linhas.push(ancora ? [nivel, inicio, rotulo, emFrase(titulo), ancora] : [nivel, inicio, rotulo, emFrase(titulo)]);
      };

      let m: RegExpExecArray | null;
      if (texto === "PRÓLOGO") estrutural("parte", "", "Prólogo");
      else if ((m = /^(PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA) PARTE$/.exec(texto)))
        estrutural("parte", `Parte ${ORDINAL[m[1]!]}`, tituloSeguinte());
      else if ((m = /^(PRIMEIRA|SEGUNDA) SECÇÃO$/.exec(texto)))
        estrutural("secao", `Seção ${ORDINAL[m[1]!]}`, tituloSeguinte());
      else if ((m = /^CAPÍTULO (PRIMEIRO|SEGUNDO|TERCEIRO|QUARTO)\s*-?$/.exec(texto)))
        estrutural("capitulo", `Capítulo ${ORDINAL[m[1]!]}`, tituloSeguinte());
      else if (texto === "INTRODUÇÃO") estrutural("capitulo", "", "Introdução");
      else if ((m = /^ARTIGO ([0-9Il]+)$/.exec(texto))) {
        const n = m[1]!.replace(/[Il]/g, "1");
        const ancora = ancoras.find((a) => new RegExp(`^ARTIGO_${n}_+$`).test(a));
        estrutural("artigo", `Artigo ${n}`, tituloSeguinte(), ancora);
      } else if ((m = /^PARÁGRAFO (\d+)$/.exec(texto))) estrutural("paragrafo", `Parágrafo ${m[1]}`, tituloSeguinte());
      else if (/^Resumindo/.test(texto)) linhas.push(["subtitulo", inicio, "", "Resumindo"]);
      else if ((m = /^([IVX]+)\.\s+(.*)$/.exec(texto))) linhas.push(["subtitulo", inicio, m[1]!, emFrase(m[2]!)]);
      else linhas.push(["topico", inicio, "", emFrase(texto)]);
    }
  }

  const paginas = ARQUIVOS.map((a) => {
    const [, de, ate] = /[_ ](\d+)-(\d+)_po\.html$/.exec(a)!;
    return `  [${de}, ${ate}, ${JSON.stringify(a)}],`;
  });

  const conteudo = `// GERADO por scripts/gerar-indice-do-catecismo.ts — não editar à mão.
//
// A estrutura do Catecismo da Igreja Católica, na ordem do livro: cada
// linha é [nível, parágrafo em que começa, rótulo, título, âncora na página].
// Os títulos são do texto oficial em português publicado em vatican.va
// (tradução de Portugal), passados de maiúsculas para frase.

export type NivelDoCatecismo = ${[...new Set(linhas.map((l) => l[0]))].map((n) => JSON.stringify(n)).join(" | ")};

export type LinhaDoIndice = readonly [NivelDoCatecismo, number, string, string, string?];

/** [primeiro parágrafo, último parágrafo, arquivo] — uma página por capítulo. */
export const PAGINAS_DO_CATECISMO: readonly (readonly [number, number, string])[] = [
${paginas.join("\n")}
];

export const INDICE_DO_CATECISMO: readonly LinhaDoIndice[] = [
${linhas.map((l) => `  ${JSON.stringify(l)},`).join("\n")}
];
`;
  writeFileSync("src/lib/catecismo/indice.ts", conteudo, "utf8");
  console.log(`${linhas.length} títulos em ${ARQUIVOS.length} páginas.`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
