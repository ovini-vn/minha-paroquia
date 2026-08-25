import { describe, expect, it } from "vitest";
import { analisarLinha, analisarTexto } from "@/lib/texto-rico";

describe("o pedacinho de Markdown do memorial histórico", () => {
  it("separa negrito do resto da linha", () => {
    expect(analisarLinha("**Importância:** nascimento da comunidade.")).toEqual([
      { texto: "Importância:", forte: true },
      { texto: " nascimento da comunidade." },
    ]);
  });

  it("reconhece endereço solto para virar link", () => {
    const t = analisarLinha("Fonte: https://arquidioceselondrina.com.br/p/historia");
    expect(t).toEqual([
      { texto: "Fonte: " },
      {
        texto: "https://arquidioceselondrina.com.br/p/historia",
        href: "https://arquidioceselondrina.com.br/p/historia",
      },
    ]);
  });

  it("não engole o ponto final da frase dentro do link", () => {
    const t = analisarLinha("Veja em https://exemplo.org/pagina.");
    expect(t[1]?.href).toBe("https://exemplo.org/pagina");
    expect(t[2]?.texto).toBe(".");
  });

  it("separa títulos, parágrafos, listas e divisores", () => {
    const blocos = analisarTexto(
      ["# Nossa História", "", "## 1954", "", "Primeira linha.", "Segunda linha.", "", "---", "", "- Pe. Mário Del Sante", "- Ir. Primo Portesani"].join("\n"),
    );
    expect(blocos.map((b) => b.tipo)).toEqual([
      "titulo",
      "titulo",
      "paragrafo",
      "divisor",
      "lista",
    ]);
    // Linhas seguidas sem linha em branco continuam sendo UM parágrafo — é
    // assim que a ficha de identificação do memorial fica junta.
    const p = blocos[2]!;
    if (p.tipo !== "paragrafo") throw new Error("esperava parágrafo");
    expect(p.linhas).toHaveLength(2);
    const l = blocos[4]!;
    if (l.tipo !== "lista") throw new Error("esperava lista");
    expect(l.itens).toHaveLength(2);
  });

  it("rebaixa títulos fundos: dois níveis bastam numa tela de celular", () => {
    const blocos = analisarTexto("#### Bem fundo");
    expect(blocos[0]).toEqual({ tipo: "titulo", nivel: 2, trechos: [{ texto: "Bem fundo" }] });
  });

  it("não deixa marcação virar HTML", () => {
    // O texto vem de quem administra a paróquia, mas continua sendo dado:
    // o que chega como tag tem que sair como texto.
    const blocos = analisarTexto("<script>alert(1)</script>");
    expect(blocos).toEqual([
      { tipo: "paragrafo", linhas: [[{ texto: "<script>alert(1)</script>" }]] },
    ]);
  });

  it("texto vazio não vira bloco nenhum", () => {
    expect(analisarTexto("   \n\n  ")).toEqual([]);
  });
});
