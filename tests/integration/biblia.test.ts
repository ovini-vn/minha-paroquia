import { beforeAll, describe, expect, it } from "vitest";
import { lerCapitulo, buscar, contarVersiculos } from "@/server/modules/biblia/service";
import { BIBLE_BOOKS } from "@/lib/bible-books";

/**
 * O leitor da Bíblia, contra o texto realmente carregado.
 *
 * A Escritura é dado de referência: é carregada uma vez por
 * `scripts/importar-biblia.ts` e não muda. Por isso estes testes leem o que
 * está lá em vez de semear linhas próprias — semear no meio de uma tabela
 * global, cuja chave é o endereço do versículo, colidiria com o texto real.
 */
describe("leitor da Bíblia", () => {
  let carregada = false;

  beforeAll(async () => {
    carregada = (await contarVersiculos()) > 0;
    if (!carregada) {
      console.warn(
        "Bíblia não carregada neste banco — rode scripts/importar-biblia.ts. Testes de leitura ficam sem valor.",
      );
    }
  });

  it("o banco tem a Bíblia inteira", async () => {
    if (!carregada) return;
    // 35.602 endereços únicos depois da limpeza; a margem cobre uma
    // correção pontual de versículo sem quebrar o teste.
    const total = await contarVersiculos();
    expect(total).toBeGreaterThan(35_000);
  });

  it("lê um capítulo em ordem, sem buracos", async () => {
    if (!carregada) return;
    const joao3 = await lerCapitulo("joao", 3);

    expect(joao3.length).toBeGreaterThan(30);
    expect(joao3[0]?.number).toBe(1);
    // Numeração sequencial: um salto significaria versículo perdido na
    // importação, que é exatamente o que a tabela de decisões evita.
    joao3.forEach((v, i) => expect(v.number).toBe(i + 1));
  });

  it("não devolve nada para livro inexistente ou capítulo fora da faixa", async () => {
    if (!carregada) return;
    expect(await lerCapitulo("evangelho-de-tome", 1)).toEqual([]);
    expect(await lerCapitulo("joao", 0)).toEqual([]);
    // João tem 21 capítulos: o 22 não existe e não pode inventar texto.
    expect(await lerCapitulo("joao", 22)).toEqual([]);
  });

  it("os marcadores de rodapé da edição impressa não sobraram", async () => {
    if (!carregada) return;
    // "(ver nota)" vinha colado a 1.722 versículos. É apparatus da edição,
    // não Escritura, e sai na importação.
    const { achados } = await buscar("(ver nota)");
    expect(achados).toHaveLength(0);
  });

  it("Esdras 6 traz o próprio capítulo, e não o bloco intruso do capítulo 4", async () => {
    if (!carregada) return;
    // A fonte repetia em 6:14-22 o texto da carta a Artaxerxes, que
    // pertence a Esdras 4 — e continua lá. Se a decisão de importação for
    // desfeita, é aqui que aparece.
    const esdras6 = await lerCapitulo("esdras", 6);
    const v14 = esdras6.find((v) => v.number === 14);
    expect(v14?.text).not.toContain("acusação que nos enviastes");
  });

  it("acha uma expressão e devolve o endereço dela", async () => {
    if (!carregada) return;
    const { achados } = await buscar("No princípio criou Deus");
    const genesis = achados.find((a) => a.livro.slug === "genesis");

    expect(genesis?.chapter).toBe(1);
    expect(genesis?.number).toBe(1);
  });

  it("ignora busca curta demais para ser útil", async () => {
    const { achados } = await buscar("de");
    expect(achados).toHaveLength(0);
  });

  it("avisa quando há mais resultados do que cabe na tela", async () => {
    if (!carregada) return;
    // "Deus" aparece milhares de vezes: quem procura assim precisa
    // refinar, não rolar uma lista infinita.
    const { achados, truncado } = await buscar("Deus");
    expect(truncado).toBe(true);
    expect(achados.length).toBeLessThanOrEqual(40);
  });

  it("todo livro do catálogo tem texto carregado", async () => {
    if (!carregada) return;
    // Um livro sem texto é um link que leva a uma tela vazia.
    const vazios: string[] = [];
    for (const livro of BIBLE_BOOKS) {
      const primeiro = await lerCapitulo(livro.slug, 1);
      if (primeiro.length === 0) vazios.push(livro.slug);
    }
    expect(vazios).toEqual([]);
  });
});
