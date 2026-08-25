import { describe, expect, it } from "vitest";
import { problemaNaChavePix, formatarChavePix, formatarCnpj, problemaNoCnpj } from "@/lib/pix";

/**
 * Chave errada não dá erro: o fiel tenta doar, não consegue, e não volta.
 * Por isso a conferência é de dígito verificador, não só de formato.
 */
describe("conferência da chave PIX", () => {
  it("aceita CPF válido e recusa o que só parece CPF", () => {
    expect(problemaNaChavePix("cpf", "529.982.247-25")).toBeNull();
    expect(problemaNaChavePix("cpf", "111.111.111-11")).toContain("inválido");
    // Um dígito trocado passa por qualquer validação de formato.
    expect(problemaNaChavePix("cpf", "529.982.247-26")).toContain("inválido");
  });

  it("aceita CNPJ válido e recusa o inválido", () => {
    expect(problemaNaChavePix("cnpj", "11.222.333/0001-81")).toBeNull();
    expect(problemaNaChavePix("cnpj", "11.222.333/0001-82")).toContain("inválido");
  });

  it("e-mail precisa estar completo", () => {
    expect(problemaNaChavePix("email", "paroquia@fatima.org.br")).toBeNull();
    expect(problemaNaChavePix("email", "paroquia@fatima")).toContain("inválido");
    expect(problemaNaChavePix("email", "paroquia")).toContain("inválido");
  });

  it("telefone vale com ou sem o 55 do Brasil", () => {
    expect(problemaNaChavePix("telefone", "(43) 99999-0000")).toBeNull();
    expect(problemaNaChavePix("telefone", "+55 43 99999-0000")).toBeNull();
    expect(problemaNaChavePix("telefone", "43 3322-1100")).toBeNull();
    expect(problemaNaChavePix("telefone", "99999-0000")).toContain("DDD");
  });

  it("chave aleatória tem o formato que o banco mostra", () => {
    expect(problemaNaChavePix("aleatoria", "123e4567-e89b-12d3-a456-426614174000")).toBeNull();
    expect(problemaNaChavePix("aleatoria", "123e4567e89b12d3a456426614174000")).toContain("hífens");
  });

  it("chave vazia é recusada em qualquer tipo", () => {
    expect(problemaNaChavePix("cpf", "   ")).toBe("Informe a chave PIX.");
    expect(problemaNaChavePix("aleatoria", "")).toBe("Informe a chave PIX.");
  });
});

describe("como a chave aparece para o fiel", () => {
  it("mostra CPF e CNPJ pontuados, como no banco", () => {
    expect(formatarChavePix("cpf", "52998224725")).toBe("529.982.247-25");
    expect(formatarChavePix("cnpj", "11222333000181")).toBe("11.222.333/0001-81");
  });

  it("telefone sai com DDD entre parênteses, sem o 55", () => {
    expect(formatarChavePix("telefone", "5543999990000")).toBe("(43) 99999-0000");
    expect(formatarChavePix("telefone", "4333221100")).toBe("(43) 3322-1100");
  });

  it("e-mail e chave aleatória saem como estão", () => {
    expect(formatarChavePix("email", " paroquia@fatima.org.br ")).toBe("paroquia@fatima.org.br");
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(formatarChavePix("aleatoria", uuid)).toBe(uuid);
  });

  it("não inventa formatação para número incompleto", () => {
    expect(formatarChavePix("cpf", "5299822")).toBe("5299822");
  });
});

describe("CNPJ da paróquia", () => {
  it("formata para o fiel conferir a quem doa", () => {
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("vazio é permitido — nem toda paróquia cadastrou", () => {
    expect(problemaNoCnpj("")).toBeNull();
  });

  it("mas preenchido errado é recusado", () => {
    expect(problemaNoCnpj("11.222.333/0001-82")).toContain("inválido");
  });
});
