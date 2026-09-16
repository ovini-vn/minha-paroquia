import { describe, expect, it } from "vitest";
import { wavQuaseEmSilencio } from "@/lib/oracoes/silencio";

/**
 * O som que sustenta o botão do volante. O que importa é ser um WAV válido
 * e quase mudo: silêncio absoluto alguns navegadores e carros ignoram.
 */
describe("o som quase em silêncio do botão do volante", () => {
  it("é um WAV mono de 16 bits com a duração pedida", async () => {
    const bytes = new Uint8Array(await wavQuaseEmSilencio(8000, 1).arrayBuffer());
    const texto = (de: number) => String.fromCharCode(...bytes.slice(de, de + 4));
    const u16 = (de: number) => bytes[de]! | (bytes[de + 1]! << 8);
    const u32 = (de: number) => u16(de) | (u16(de + 2) << 16);

    expect(texto(0)).toBe("RIFF");
    expect(texto(8)).toBe("WAVE");
    expect(u16(20)).toBe(1); // PCM
    expect(u16(22)).toBe(1); // mono
    expect(u32(24)).toBe(8000); // taxa
    expect(u16(34)).toBe(16); // bits
    expect(u32(40)).toBe(8000 * 2); // um segundo de amostras
    expect(bytes.length).toBe(44 + 8000 * 2);
  });

  it("tem som suficiente para o navegador contar como tocando, e ainda assim baixo", async () => {
    const bytes = new Uint8Array(await wavQuaseEmSilencio(8000, 1).arrayBuffer());
    let maior = 0;
    for (let i = 44; i < bytes.length; i += 2) {
      const amostra = new DataView(bytes.buffer).getInt16(i, true);
      maior = Math.max(maior, Math.abs(amostra));
    }
    /*
     * O primeiro protótipo usava 8 de 32767 — silêncio para o navegador, e
     * por isso o botão do volante não recebia nada. O piso aqui é o que faz
     * a página valer como "tocando som"; o teto é o que a mantém discreta.
     */
    expect(maior).toBeGreaterThan(32767 * 0.005);
    expect(maior).toBeLessThan(32767 * 0.02);
  });
});
