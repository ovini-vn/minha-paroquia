import { describe, expect, it } from "vitest";
import { hexToRgbTriple } from "@/lib/color";

describe("hexToRgbTriple", () => {
  it("converte hex pra 'R G B' separado por espaço", () => {
    expect(hexToRgbTriple("#5b2890")).toBe("91 40 144");
    expect(hexToRgbTriple("#ffffff")).toBe("255 255 255");
    expect(hexToRgbTriple("#000000")).toBe("0 0 0");
  });
});
