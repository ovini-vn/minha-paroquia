import { describe, expect, it } from "vitest";
import { BIBLE_BOOKS, findBook } from "@/lib/bible-books";

/**
 * O catálogo é o índice de TODAS as telas da Bíblia: ele decide quantos
 * capítulos cada livro oferece. Um número errado aqui vira um link para um
 * capítulo que não existe, ou esconde um que existe.
 */
describe("catálogo dos livros da Bíblia", () => {
  it("tem os 73 livros do cânon católico", () => {
    expect(BIBLE_BOOKS).toHaveLength(73);
  });

  it("inclui os sete deuterocanônicos", () => {
    // São o que separa o cânon católico do protestante. Se alguém importar
    // uma fonte de 66 livros, é aqui que se percebe.
    const slugs = BIBLE_BOOKS.map((b) => b.slug);
    for (const livro of [
      "tobias",
      "judite",
      "sabedoria",
      "eclesiastico",
      "baruc",
      "1-macabeus",
      "2-macabeus",
    ]) {
      expect(slugs).toContain(livro);
    }
  });

  it("segue a divisão da Vulgata nos três livros em que ela difere", () => {
    // Matos Soares traduz da Vulgata. A numeração hebraica dá 10 capítulos
    // a Ester, 4 a Joel e 3 a Malaquias — e "corrigir" para ela quebraria
    // o leitor, porque o texto carregado não é esse.
    expect(findBook("ester")?.chapters).toBe(16);
    expect(findBook("joel")?.chapters).toBe(3);
    expect(findBook("malaquias")?.chapters).toBe(4);
  });

  it("não repete slug nem abreviatura", () => {
    const slugs = BIBLE_BOOKS.map((b) => b.slug);
    const abrevs = BIBLE_BOOKS.map((b) => b.abbrev);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(abrevs).size).toBe(abrevs.length);
  });

  it("todo livro tem pelo menos um capítulo", () => {
    for (const livro of BIBLE_BOOKS) {
      expect(livro.chapters).toBeGreaterThan(0);
    }
  });

  it("separa os testamentos na proporção do cânon", () => {
    const antigo = BIBLE_BOOKS.filter((b) => b.testament === "antigo");
    const novo = BIBLE_BOOKS.filter((b) => b.testament === "novo");
    expect(antigo).toHaveLength(46);
    expect(novo).toHaveLength(27);
  });

  it("findBook devolve undefined para slug inventado", () => {
    expect(findBook("evangelho-de-tomé")).toBeUndefined();
  });
});
