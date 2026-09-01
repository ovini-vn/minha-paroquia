import { describe, expect, it } from "vitest";
import { acharIdentificador, gerarIdentificadorPix } from "@/lib/pix/identificador";
import { montarBrCode } from "@/lib/pix/brcode";

describe("o identificador da cobrança", () => {
  it("tem a forma esperada e cabe no campo de referência", () => {
    const id = gerarIdentificadorPix(new Date(Date.UTC(2026, 8, 1)));
    expect(id).toMatch(/^MP26[A-Z0-9]{9}$/);
    expect(id).toHaveLength(13);
    expect(id.length).toBeLessThanOrEqual(25);
  });

  it("não repete", () => {
    // Nove caracteres num alfabeto de 25 dão 25^9 combinações. Mil sorteios
    // sem colisão não provam unicidade — quem prova é a restrição única no
    // banco. Isto pega o erro grosseiro: um gerador que devolve sempre igual.
    const vistos = new Set(Array.from({ length: 1000 }, () => gerarIdentificadorPix()));
    expect(vistos.size).toBe(1000);
  });

  it("não carrega dado pessoal nenhum", () => {
    /*
     * O identificador viaja por sistemas de terceiros e aparece em extrato
     * que outras pessoas leem. Este teste é a trava contra alguém "melhorar"
     * o gerador pondo o nome ou o CPF dentro para facilitar a conferência.
     */
    const id = gerarIdentificadorPix();
    expect(id).not.toMatch(/\d{11}/); // CPF
    expect(id).not.toContain("@");
    expect(id).not.toMatch(/-/); // uuid
    expect(id.slice(4)).not.toMatch(/[a-z]/); // nome digitado
  });

  it("evita os caracteres que se confundem ao ler de um extrato", () => {
    // A secretaria confere o identificador do extrato contra a tela. Um "O"
    // lido como zero manda procurar uma cobrança que não existe.
    // A parte SORTEADA de cada um, separadamente: o prefixo "MP26" tem um
    // "2" que é do ano, e juntar tudo numa string só faria o teste falhar
    // por causa dele.
    const sorteados = Array.from({ length: 200 }, () => gerarIdentificadorPix().slice(4));
    for (const confuso of ["O", "I", "L", "S", "Z", "B", "0", "1", "2", "5", "8"]) {
      expect(sorteados.some((s) => s.includes(confuso))).toBe(false);
    }
  });

  it("é aceito pelo montador do código, sem tratamento", () => {
    // Se o gerador produzisse algo que o BR Code recusa, o defeito só
    // apareceria na hora de o fiel pagar.
    const id = gerarIdentificadorPix();
    const codigo = montarBrCode({
      chave: "12345678000199",
      nome: "Paróquia",
      cidade: "Londrina",
      centavos: 100,
      identificador: id,
    });
    expect(codigo).toContain(id);
  });
});

describe("achando o identificador no texto do extrato", () => {
  // Os identificadores escritos à mão aqui usam SÓ o alfabeto do gerador —
  // sem 0/O, 1/I/L, 2/Z, 5/S, 8/B. Um exemplo com "8" não é achado, e o
  // teste falharia por dado inventado, não por defeito.
  it("encontra no meio da descrição que o banco escreve", () => {
    const descricao = "PIX RECEBIDO 31/08 JOAO DA SILVA MP26A4F9XK7PQ REF";
    expect(acharIdentificador(descricao)).toBe("MP26A4F9XK7PQ");
  });

  it("não inventa correspondência onde não há", () => {
    expect(acharIdentificador("PIX RECEBIDO JOAO DA SILVA")).toBeNull();
    // "MP" seguido de coisa demais ou de menos não é identificador nosso.
    expect(acharIdentificador("MP26ABC")).toBeNull();
  });

  it("acha o que o próprio gerador produziu", () => {
    const id = gerarIdentificadorPix();
    expect(acharIdentificador(`PIX RECEBIDO ${id}`)).toBe(id);
  });
});
