import { describe, expect, it } from "vitest";
import { ATALHOS, atalhosPara, casa, normalizar } from "@/lib/busca";

describe("busca do fiel", () => {
  it("ignora acento, caixa e espaço sobrando", () => {
    expect(normalizar("  Confissão   Sacramental ")).toBe("confissao sacramental");
    expect(casa("confissao", "Confissão")).toBe(true);
    expect(casa("CATEQUESE crisma", "Turma de Crisma da catequese")).toBe(true);
    expect(casa("crisma adultos", "Turma de Crisma")).toBe(false);
  });

  it("as palavras do dia a dia levam às telas certas", () => {
    expect(atalhosPara("confissão").map((a) => a.href)).toContain("/comunidade/sacerdotes");
    expect(atalhosPara("sétimo dia").map((a) => a.href)).toContain("/intencoes");
    expect(atalhosPara("horário").map((a) => a.href)).toContain("/agenda");
    expect(atalhosPara("telefone").map((a) => a.href)).toContain("/contato");
  });

  it("todo atalho aponta para dentro do app, sem repetir destino", () => {
    const hrefs = ATALHOS.map((a) => a.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const h of hrefs) expect(h.startsWith("/")).toBe(true);
  });
});
