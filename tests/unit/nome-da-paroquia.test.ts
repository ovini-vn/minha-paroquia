import { describe, expect, it } from "vitest";
import { separarNomeDaParoquia } from "@/lib/nome-da-paroquia";

describe("separar o tipo do nome da comunidade", () => {
  it("tira o Paróquia da frente", () => {
    expect(separarNomeDaParoquia("Paróquia Nossa Senhora de Fátima")).toEqual({
      tipo: "Paróquia",
      nome: "Nossa Senhora de Fátima",
    });
  });

  it("a preposição vai junto do tipo, para o nome começar no nome", () => {
    // "Paróquia de / São João" e não "Paróquia / de São João".
    expect(separarNomeDaParoquia("Paróquia de São João Batista")).toEqual({
      tipo: "Paróquia de",
      nome: "São João Batista",
    });
    expect(separarNomeDaParoquia("Santuário do Divino Pai Eterno")).toEqual({
      tipo: "Santuário do",
      nome: "Divino Pai Eterno",
    });
  });

  it("reconhece outros tipos de comunidade", () => {
    expect(separarNomeDaParoquia("Catedral Metropolitana de Londrina").tipo).toBe("Catedral");
    expect(separarNomeDaParoquia("Capela Santa Rita").nome).toBe("Santa Rita");
  });

  it("nome fora do padrão fica inteiro, sem invenção", () => {
    // Melhor mostrar tudo numa linha do que cortar onde não devia.
    expect(separarNomeDaParoquia("São Pedro Apóstolo")).toEqual({
      tipo: null,
      nome: "São Pedro Apóstolo",
    });
  });

  it("não separa quando sobraria nada", () => {
    expect(separarNomeDaParoquia("Paróquia")).toEqual({ tipo: null, nome: "Paróquia" });
    expect(separarNomeDaParoquia("Paróquia de")).toEqual({ tipo: null, nome: "Paróquia de" });
  });

  it("não se confunde com nome que só COMEÇA parecido", () => {
    // "Paroquial" não é "Paróquia": exige a palavra inteira seguida de espaço.
    expect(separarNomeDaParoquia("Paroquial São Vicente").tipo).toBeNull();
  });

  it("aguenta espaço sobrando, e normaliza o tipo", () => {
    // Muita paróquia está cadastrada toda em maiúsculas nos registros
    // oficiais; o tipo sai na forma do catálogo para ficar apresentável.
    expect(separarNomeDaParoquia("  PARÓQUIA   Santo   Antônio  ")).toEqual({
      tipo: "Paróquia",
      nome: "Santo Antônio",
    });
  });

  it("nome vazio não quebra", () => {
    expect(separarNomeDaParoquia("   ")).toEqual({ tipo: null, nome: "" });
  });
});
