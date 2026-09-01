import { describe, expect, it } from "vitest";
import { crc16, montarBrCode } from "@/lib/pix/brcode";

/**
 * O código que o fiel copia para pagar.
 *
 * Estes testes existem porque um payload errado não dá erro: ele vira um
 * código que o aplicativo do banco recusa — ou, no pior caso, aceita com o
 * destino trocado.
 *
 * O que estes testes provam: o algoritmo do CRC (contra o vetor do padrão) e
 * a ESTRUTURA do payload, campo a campo. O que eles NÃO provam: que um banco
 * de verdade aceita o código. Isso só um Pix de um centavo responde, e é por
 * isso que ele está no fluxo antes de a paróquia liberar a cobrança.
 */

describe("CRC-16 do BR Code", () => {
  /*
   * NÃO há aqui um vetor "do manual do Banco Central".
   *
   * Uma versão anterior deste arquivo tinha um, transcrito de memória, e ele
   * não conferia — o payload estava errado, não o algoritmo. Um vetor que eu
   * não consigo comprovar contra a fonte é pior do que vetor nenhum: ele
   * passa a impressão de estar ancorado em algo.
   *
   * O que ancora o algoritmo é o vetor abaixo, que é do próprio padrão
   * CRC-16/CCITT-FALSE e qualquer implementação de referência confirma. O
   * payload inteiro é conferido de outro jeito, que nenhum teste substitui:
   * um Pix de um centavo, antes de a paróquia liberar a cobrança.
   */
  it("é o CCITT-FALSE, e não uma das variantes parecidas", () => {
    // Vetor clássico do CRC-16/CCITT-FALSE: "123456789" -> 29B1. As
    // variantes ARC, MODBUS e XMODEM dão outros valores para a mesma
    // entrada, e é por isso que este teste existe.
    expect(crc16("123456789")).toBe("29B1");
  });

  it("são sempre quatro caracteres, com zero à esquerda quando precisa", () => {
    expect(crc16("A")).toHaveLength(4);
    expect(crc16("")).toBe("FFFF");
  });
});

describe("montando a cobrança", () => {
  const base = {
    chave: "12345678000199",
    nome: "Paróquia Nossa Senhora de Fátima",
    cidade: "Londrina",
    centavos: 15000,
    identificador: "MP26A8F91XK7P",
  };

  it("se anuncia como estático, que é o que ele é", () => {
    // "01" = 11 é o estático. "12" seria o dinâmico, que exige uma URL de
    // provedor no campo 25 — e diria ao aplicativo do banco para procurar
    // uma URL que não está no código.
    expect(montarBrCode(base)).toContain("010211");
    expect(montarBrCode(base)).not.toContain("010212");
  });

  it("o código fecha com um CRC que confere", () => {
    const codigo = montarBrCode(base);
    const corpo = codigo.slice(0, -4);
    expect(codigo.slice(-4)).toBe(crc16(corpo));
    expect(corpo.endsWith("6304")).toBe(true);
  });

  it("carrega a chave, o valor e o identificador", () => {
    const codigo = montarBrCode(base);
    expect(codigo).toContain("0014br.gov.bcb.pix");
    expect(codigo).toContain("011412345678000199");
    // 54 é o valor: R$ 150,00 escrito como "150.00", com o tamanho antes.
    expect(codigo).toContain("5406150.00");
    // 62 traz o campo 05, que é a referência que volta no extrato.
    expect(codigo).toContain("62170513MP26A8F91XK7P");
  });

  it("a chave entra exatamente como cadastrada", () => {
    // Nome e cidade são limpos; a chave NÃO. Um "+" ou um ponto trocado nela
    // muda o destino do dinheiro.
    const comEmail = montarBrCode({ ...base, chave: "paroquia+dizimo@fatima.org.br" });
    expect(comEmail).toContain("paroquia+dizimo@fatima.org.br");

    const comTelefone = montarBrCode({ ...base, chave: "+5543999998888" });
    expect(comTelefone).toContain("+5543999998888");
  });

  it("nome e cidade perdem acento e cabem no limite do padrão", () => {
    const codigo = montarBrCode(base);
    // 25 caracteres é o teto do campo 59.
    expect(codigo).toContain("5925PAROQUIA NOSSA SENHORA");
    expect(codigo).toContain("6008LONDRINA");
    expect(codigo).not.toMatch(/[áàâãéêíóôõúç]/i);
  });

  it("sem valor, o pagador escolhe quanto dar", () => {
    // O dízimo é isto: a pessoa dá o quanto quer.
    const codigo = montarBrCode({ ...base, centavos: null });
    expect(codigo).not.toContain("5406");
    expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)));
  });

  it("recusa o que produziria um código torto", () => {
    expect(() => montarBrCode({ ...base, chave: "  " })).toThrow(/chave/i);
    expect(() => montarBrCode({ ...base, identificador: "MP 26" })).toThrow(/identificador/i);
    expect(() => montarBrCode({ ...base, identificador: "A".repeat(26) })).toThrow(/identificador/i);
    // Centavos, não reais: 150.5 seria um valor e meio centavo.
    expect(() => montarBrCode({ ...base, centavos: 150.5 })).toThrow(/centavos/i);
    expect(() => montarBrCode({ ...base, centavos: 0 })).toThrow(/centavos/i);
  });

  it("o valor sai em reais com duas casas, vindo de centavos", () => {
    // Um centavo é o Pix de teste que a secretaria faz antes de liberar.
    expect(montarBrCode({ ...base, centavos: 1 })).toContain("54040.01");
    expect(montarBrCode({ ...base, centavos: 100 })).toContain("54041.00");
    expect(montarBrCode({ ...base, centavos: 123456 })).toContain("54071234.56");
  });
});
