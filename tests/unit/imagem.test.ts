import { describe, expect, it } from "vitest";
import { problemaComImagem, TAMANHO_MAXIMO_IMAGEM } from "@/lib/imagem";

describe("as regras de imagem, conferidas antes de enviar", () => {
  const jpeg = (mb: number) => ({ size: Math.round(mb * 1024 * 1024), type: "image/jpeg" });

  it("aceita uma foto dentro do limite", () => {
    expect(problemaComImagem(jpeg(4.2))).toBeNull();
  });

  it("recusa acima de 5 MB dizendo o tamanho real", () => {
    // É este o caso que virava tela branca: a plataforma recusava o envio
    // com 413 antes de chegar no nosso código.
    const erro = problemaComImagem(jpeg(7.5));
    expect(erro).toContain("7,5 MB");
    expect(erro).toContain("5 MB");
  });

  it("o limite fica exatamente em 5 MB", () => {
    expect(problemaComImagem({ size: TAMANHO_MAXIMO_IMAGEM, type: "image/png" })).toBeNull();
    expect(problemaComImagem({ size: TAMANHO_MAXIMO_IMAGEM + 1, type: "image/png" })).not.toBeNull();
  });

  it("recusa arquivo vazio", () => {
    expect(problemaComImagem({ size: 0, type: "image/jpeg" })).toContain("vazio");
  });

  it("recusa SVG: é XML e pode carregar script", () => {
    expect(problemaComImagem({ size: 1000, type: "image/svg+xml" })).toContain("Formato não aceito");
  });
});
