import { describe, expect, it } from "vitest";
import { blocosDaPagina, extrairParagrafo } from "@/lib/catecismo/extrair";
import {
  arvoreDoCatecismo,
  buscarNoCatecismo,
  caminhoDoParagrafo,
  enderecoDoParagrafo,
  enderecoDoTitulo,
  numeroDaConsulta,
  normalizar,
  paginaDoParagrafo,
  TITULOS_DO_CATECISMO,
} from "@/lib/catecismo/busca";
import { PAGINAS_DO_CATECISMO } from "@/lib/catecismo/indice";
import { ULTIMO_PARAGRAFO } from "@/lib/catecismo/endereco";
import { trechoCurto } from "@/lib/catecismo/trecho";

/**
 * O Catecismo: ler o parágrafo certo, e achar o lugar dele.
 *
 * O HTML abaixo é inventado, mas imita, uma por uma, as marcações que as
 * páginas do Vaticano usam de verdade — cada caso é um que já quebrou a
 * leitura (medido contra as 27 páginas, com os 2865 parágrafos).
 */
const PAGINA = `
<html><head><title>Catecismo 100-110</title></head><body>
<p align="center"><b>ARTIGO 1</b></p>
<p align="center"><b>O TÍTULO DO ARTIGO</b></p>
<p><b>100.</b> Texto do cem, com nota (12). E uma segunda frase.</p>
<blockquote><p>Uma citação que continua o cem.</p></blockquote>
<p><b>101</b><i>. Ponto fora do negrito.</i></p>
<p><b>I. Um subtítulo romano</b></p>
<p><b>102<i>. </i></b>Ponto em itálico dentro do negrito.</p>
<p>A IRRELIGIÃO</p>
<p><b>103 </b>Sem ponto nenhum.</p>
<p><font face="Times"> <b>104. </b>Depois de um font.</font></p>
<p><b>Resumindo:</b></p>
<p><b>1105.</b> Erro de digitação: devia ser 105.</p>
<p><b>106.</b> Lista dentro do parágrafo:</p>
<p><b>1.</b> primeiro item</p>
<p><b>107.</b> O último &laquo;com aspas&raquo; e acentua&ccedil;&atilde;o.</p>
<hr />
<p>1. Nota de rodapé que parece parágrafo.</p>
<p>108. Outra nota.</p>
</body></html>`;

describe("ler um parágrafo na página do Vaticano", () => {
  it("acha o número em todas as marcações que o site usa", () => {
    expect(extrairParagrafo(PAGINA, 100)).toBe("Texto do cem, com nota. E uma segunda frase.\nUma citação que continua o cem.");
    expect(extrairParagrafo(PAGINA, 101)).toBe("Ponto fora do negrito.");
    expect(extrairParagrafo(PAGINA, 102)).toBe("Ponto em itálico dentro do negrito.");
    expect(extrairParagrafo(PAGINA, 103)).toBe("Sem ponto nenhum.");
    expect(extrairParagrafo(PAGINA, 104)).toBe("Depois de um font.");
  });

  it("para no título seguinte, em negrito, romano ou em maiúsculas", () => {
    // Sem isso, "I. Um subtítulo romano" e "A IRRELIGIÃO" entravam no
    // parágrafo de cima.
    expect(extrairParagrafo(PAGINA, 101)).not.toMatch(/subtítulo/);
    expect(extrairParagrafo(PAGINA, 102)).not.toMatch(/IRRELIGIÃO/);
    expect(extrairParagrafo(PAGINA, 104)).not.toMatch(/Resumindo/);
  });

  it("corrige o número digitado errado quando os vizinhos confirmam", () => {
    // No site, o 2217 está como "2117" e o 2439 como "1439".
    expect(extrairParagrafo(PAGINA, 105)).toBe("Erro de digitação: devia ser 105.");
  });

  it("um item numerado de lista não encerra o parágrafo", () => {
    expect(extrairParagrafo(PAGINA, 106)).toBe("Lista dentro do parágrafo:\n1. primeiro item");
  });

  it("decodifica as entidades e deixa as notas de rodapé de fora", () => {
    expect(extrairParagrafo(PAGINA, 107)).toBe("O último «com aspas» e acentuação.");
    expect(extrairParagrafo(PAGINA, 108)).toBeNull();
    expect(blocosDaPagina(PAGINA).some((b) => b.texto.includes("Nota de rodapé"))).toBe(false);
  });

  it("devolve null para um número que a página não tem", () => {
    expect(extrairParagrafo(PAGINA, 999)).toBeNull();
  });
});

describe("o índice do Catecismo", () => {
  it("as páginas cobrem do 1 ao 2865, sem buraco nem sobreposição", () => {
    let esperado = 1;
    for (const [de, ate] of PAGINAS_DO_CATECISMO) {
      expect(de).toBe(esperado);
      expect(ate).toBeGreaterThanOrEqual(de);
      esperado = ate + 1;
    }
    expect(esperado - 1).toBe(ULTIMO_PARAGRAFO);
  });

  it("os títulos vêm na ordem do livro e dentro da faixa", () => {
    let anterior = 1;
    for (const t of TITULOS_DO_CATECISMO) {
      expect(t.inicio).toBeGreaterThanOrEqual(anterior);
      expect(t.fim).toBeGreaterThanOrEqual(t.inicio);
      expect(t.fim).toBeLessThanOrEqual(ULTIMO_PARAGRAFO);
      anterior = t.inicio;
    }
  });

  it("tem o Prólogo e as quatro partes", () => {
    const partes = arvoreDoCatecismo();
    expect(partes.map((p) => p.titulo)).toEqual([
      "Prólogo",
      "A profissão da fé",
      "A celebração do mistério cristão",
      "A vida em Cristo",
      "A oração cristã",
    ]);
    expect(partes[4]!.fim).toBe(ULTIMO_PARAGRAFO);
  });

  it("o caminho de um número vai da parte ao subtítulo", () => {
    const caminho = caminhoDoParagrafo(1324).map((t) => t.titulo);
    expect(caminho).toEqual([
      "A celebração do mistério cristão",
      "Os sete sacramentos da Igreja",
      "Os sacramentos da iniciação cristã",
      "O sacramento da Eucaristia",
      "A Eucaristia – fonte e cume da vida eclesial",
    ]);
  });

  it("o link abre o capítulo no parágrafo, com a âncora do artigo de reserva", () => {
    expect(paginaDoParagrafo(1324)?.arquivo).toBe("p2s2cap1_1210-1419_po.html");
    expect(enderecoDoParagrafo(1324)).toBe(
      "https://www.vatican.va/archive/cathechism_po/index_new/p2s2cap1_1210-1419_po.html#ARTIGO_3_:~:text=1324.",
    );
    // O arquivo do Prólogo tem espaço no nome.
    expect(enderecoDoParagrafo(1)).toContain("prologo%201-25_po.html");
    expect(enderecoDoParagrafo(0)).toBeNull();
    const artigo = TITULOS_DO_CATECISMO.find((t) => t.titulo === "O sacramento do Baptismo")!;
    expect(enderecoDoTitulo(artigo)).toMatch(/#ARTIGO_1_$/);
  });
});

describe("procurar no Catecismo", () => {
  it("reconhece o número do jeito que ele aparece nas citações", () => {
    expect(numeroDaConsulta("1324")).toBe(1324);
    expect(numeroDaConsulta("§ 1324")).toBe(1324);
    expect(numeroDaConsulta("CIC 1324")).toBe(1324);
    expect(numeroDaConsulta("parágrafo 12")).toBe(12);
    expect(numeroDaConsulta("9999")).toBeNull();
    expect(numeroDaConsulta("batismo")).toBeNull();
  });

  it("a grafia do Brasil acha a de Portugal", () => {
    expect(normalizar("Baptismo")).toBe(normalizar("batismo"));
    expect(normalizar("acto")).toBe(normalizar("ato"));
    expect(normalizar("acção")).toBe(normalizar("ação"));
    expect(normalizar("Matrimónio")).toBe(normalizar("matrimônio"));
  });

  it("acha pelo assunto, com o artigo em que o título está", () => {
    const { achados } = buscarNoCatecismo("batismo crianças");
    expect(achados).toHaveLength(1);
    expect(achados[0]!.titulo).toBe("O Baptismo das crianças");
    expect(achados[0]!.dentroDe?.titulo).toBe("O sacramento do Baptismo");
  });

  it("procura no começo das palavras, e ignora as palavras vazias", () => {
    // "ato" não pode achar "contato"; "de" sozinho não acha tudo.
    expect(buscarNoCatecismo("ato").achados.every((a) => normalizar(a.titulo).split(" ").some((p) => p.startsWith("ato")))).toBe(true);
    expect(buscarNoCatecismo("de").achados).toHaveLength(0);
  });
});

describe("o trecho guardado", () => {
  it("parágrafo curto entra inteiro", () => {
    expect(trechoCurto("Uma frase curta.")).toEqual({ trecho: "Uma frase curta.", completo: true });
  });

  it("parágrafo longo é cortado no fim de uma frase", () => {
    const frase = "Esta é uma frase de tamanho médio que se repete no parágrafo. ";
    const { trecho, completo } = trechoCurto(frase.repeat(12));
    expect(completo).toBe(false);
    expect(trecho.length).toBeLessThanOrEqual(490);
    expect(trecho).toMatch(/parágrafo\. \[…\]$/);
  });
});
