import { describe, expect, it } from "vitest";
import { porExtenso } from "@/lib/siglas";

/**
 * Os trechos abaixo são texto real do calendário de 2026 da Paróquia Nossa
 * Senhora de Fátima. A troca mexe no que o fiel lê, e uma regra gulosa
 * demais estraga a frase em vez de esclarecê-la.
 */
describe("siglas por extenso", () => {
  it("troca a sigla solta", () => {
    expect(porExtenso("GBR")).toBe("Grupos Bíblicos de Reflexão");
    // O artigo passa a concordar com o NOME, não com a sigla.
    expect(porExtenso("Missa no setor 7 com o GBR")).toBe(
      "Missa no setor 7 com os Grupos Bíblicos de Reflexão",
    );
  });

  it("o plural da sigla some, porque o nome já é plural", () => {
    expect(porExtenso("formação dos animadores dos GBRs")).toBe(
      "formação dos animadores dos Grupos Bíblicos de Reflexão",
    );
  });

  it("o artigo concorda mesmo quando a expansão já estava no texto", () => {
    // "Articular o COMIPA (Comissão Missionária Paroquial)" não pode virar
    // "Articular o Comissão Missionária Paroquial".
    expect(porExtenso("Articular o COMIPA (Comissão Missionária Paroquial).")).toBe(
      "Articular a Comissão Missionária Paroquial.",
    );
  });

  it("não duplica o nome quando a fonte já o escreveu em aposto", () => {
    // A fonte diz "Criar o COMIPA, a Comissão Missionária Paroquial" —
    // trocar a sigla ali escrevia o nome duas vezes seguidas.
    expect(porExtenso("Criar o COMIPA, a Comissão Missionária Paroquial (reunião em 11/mar).")).toBe(
      "Criar a Comissão Missionária Paroquial (reunião em 11/mar).",
    );
  });

  it("não repete o nome dentro dos próprios parênteses", () => {
    // "IVC (Iniciação à Vida Cristã)" não pode virar
    // "Iniciação à Vida Cristã (Iniciação à Vida Cristã)".
    expect(porExtenso("catequizandos que estão concluindo a IVC (Iniciação à Vida Cristã)")).toBe(
      "catequizandos que estão concluindo a Iniciação à Vida Cristã",
    );
    expect(porExtenso("criar ou fortalecer a PPI (Pastoral da Pessoa Idosa) nas comunidades")).toBe(
      "criar ou fortalecer a Pastoral da Pessoa Idosa nas comunidades",
    );
  });

  it("deixa em paz o que já está por extenso com a sigla ao lado", () => {
    // Aqui a sigla é o apelido pelo qual as pessoas chamam a coisa, e o
    // nome já está escrito. Tirá-la não ajudaria ninguém a entender mais.
    expect(porExtenso("Conselho Pastoral Paroquial (CPP)")).toBe(
      "Conselho Pastoral Paroquial (CPP)",
    );
    expect(porExtenso("Reunião do Conselho Pastoral Paroquial (CPP)")).toBe(
      "Reunião do Conselho Pastoral Paroquial (CPP)",
    );
  });

  it("não desmonta uma enumeração de siglas", () => {
    // A fonte nunca diz o que são CPC e CAEP. Expandir só o primeiro membro
    // deixaria a lista sem ler nem como sigla nem como nome.
    expect(porExtenso("garantir a aplicação dos estatutos (CPP/CPC/CAEP) nas comunidades")).toBe(
      "garantir a aplicação dos estatutos (CPP/CPC/CAEP) nas comunidades",
    );
  });

  it("não troca pedaço de palavra", () => {
    expect(porExtenso("HUMILDADE")).toBe("HUMILDADE");
    expect(porExtenso("IAMBO")).toBe("IAMBO");
  });

  it("troca várias siglas na mesma frase", () => {
    // "o COMIPA" é o uso corrente, mas o nome por extenso é feminino:
    // deixar "o Comissão Missionária Paroquial" seria pior que a sigla.
    expect(porExtenso("Articular IAM, catequese, coroinhas e o COMIPA")).toBe(
      "Articular Infância e Adolescência Missionária, catequese, coroinhas e a Comissão Missionária Paroquial",
    );
  });

  it("os títulos reais da agenda", () => {
    expect(porExtenso("1º Congresso Arquidiocesano da IAM")).toBe(
      "1º Congresso Arquidiocesano da Infância e Adolescência Missionária",
    );
    expect(porExtenso("Visita da Pastoral da Saúde ao HU")).toBe(
      "Visita da Pastoral da Saúde ao Hospital Universitário",
    );
    expect(porExtenso("Reunião do MESC")).toBe(
      "Reunião dos Ministros Extraordinários da Sagrada Comunhão",
    );
  });

  it("mantém as contrações que já estavam certas", () => {
    expect(porExtenso("Congresso da IAM")).toBe("Congresso da Infância e Adolescência Missionária");
    expect(porExtenso("Reunião do CPP")).toBe("Reunião do Conselho Pastoral Paroquial");
    expect(porExtenso("visita ao HU")).toBe("visita ao Hospital Universitário");
    expect(porExtenso("animadores dos GBRs")).toBe(
      "animadores dos Grupos Bíblicos de Reflexão",
    );
  });

  it("texto sem sigla nenhuma passa intacto", () => {
    const frase = "Caminhar juntos, numa Igreja em Saída Missionária.";
    expect(porExtenso(frase)).toBe(frase);
  });
});
