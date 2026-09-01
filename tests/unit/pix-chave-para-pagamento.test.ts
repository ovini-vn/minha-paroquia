import { describe, expect, it } from "vitest";
import { chaveParaPagamento } from "@/lib/pix";
import { montarBrCode } from "@/lib/pix/brcode";

/**
 * A chave dentro do código de pagamento.
 *
 * Este arquivo nasceu de um defeito real: o primeiro código gerado em
 * desenvolvimento saiu com "11.222.333/0001-81" dentro. A paróquia digita o
 * CNPJ pontuado porque é assim que se lê um CNPJ; o BR Code não aceita isso,
 * e o banco recusaria o código.
 *
 * A regra não é "limpar a chave" — é a forma canônica de cada TIPO, e o tipo
 * é o que a própria paróquia declarou ao cadastrar. Onde não há forma a
 * impor, nada é imposto: adivinhar na chave manda dinheiro para o lugar
 * errado.
 */
describe("a chave na forma que o pagamento exige", () => {
  it("CNPJ e CPF vão só com dígitos", () => {
    expect(chaveParaPagamento("11.222.333/0001-81", "cnpj")).toBe("11222333000181");
    expect(chaveParaPagamento("529.982.247-25", "cpf")).toBe("52998224725");
    // Já sem pontuação, continua igual.
    expect(chaveParaPagamento("11222333000181", "cnpj")).toBe("11222333000181");
  });

  it("telefone vai com o código do país, e não o ganha duas vezes", () => {
    expect(chaveParaPagamento("(43) 99999-8888", "telefone")).toBe("+5543999998888");
    expect(chaveParaPagamento("+55 43 99999-8888", "telefone")).toBe("+5543999998888");
    expect(chaveParaPagamento("5543999998888", "telefone")).toBe("+5543999998888");
  });

  it("e-mail e chave aleatória passam intactos", () => {
    // Aqui não há forma a impor. Qualquer mudança seria adivinhação.
    const email = "paroquia+dizimo@fatima.org.br";
    expect(chaveParaPagamento(email, "email")).toBe(email);

    const aleatoria = "123e4567-e89b-12d3-a456-426614174000";
    expect(chaveParaPagamento(aleatoria, "aleatoria")).toBe(aleatoria);
    // Sem tipo declarado, também não se mexe.
    expect(chaveParaPagamento(aleatoria, null)).toBe(aleatoria);
  });

  it("o código sai com a chave limpa, e não com a pontuada", () => {
    const codigo = montarBrCode({
      chave: chaveParaPagamento("11.222.333/0001-81", "cnpj"),
      nome: "Paróquia Nossa Senhora de Fátima",
      cidade: "Londrina",
      centavos: 15000,
      identificador: "MP26A4F9XK7PQ",
    });
    expect(codigo).toContain("011411222333000181");
    expect(codigo).not.toContain("11.222.333");
    expect(codigo).not.toContain("/0001-81");
  });
});
