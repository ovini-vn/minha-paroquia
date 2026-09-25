import { describe, expect, it } from "vitest";
import { emFrases } from "@/components/domain/OuvirEmVoz";

describe("leitura em voz", () => {
  it("parte nas frases, para o Chrome não cortar a fala no meio", () => {
    expect(emFrases("Naquele tempo, Jesus disse: Amai os vossos inimigos. Fazei o bem!")).toEqual([
      "Naquele tempo, Jesus disse:",
      "Amai os vossos inimigos.",
      "Fazei o bem!",
    ]);
  });

  it("frase longa demais é cortada na vírgula, sem pedaço acima do limite", () => {
    const longa = Array.from({ length: 30 }, (_, i) => `palavra${i}, e mais`).join(" ") + ".";
    const pedacos = emFrases(longa, 80);
    expect(pedacos.length).toBeGreaterThan(1);
    for (const p of pedacos) expect(p.length).toBeLessThanOrEqual(80);
    expect(pedacos.join(" ")).toBe(longa);
  });
});
