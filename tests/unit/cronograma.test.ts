import { describe, expect, it } from "vitest";
import {
  emOrdem,
  jaPassou,
  ladrilho,
  lerCronograma,
  mesDoCronograma,
  palpiteDeIcone,
  proximoEncontro,
  quando,
} from "@/lib/grupos/cronograma";

/**
 * O cronograma de formação do Colo de Mãe (CDM), grupo de adolescentes da
 * Paróquia Nossa Senhora de Fátima, como está no cartaz de 2026/2027. É o
 * caso de verdade: datas de um dia, de dois, de três, atravessando o mês, e
 * dois encontros ainda sem data.
 */
const CRONOGRAMA_DO_CDM = `
06/09/26 — Quem sou eu de verdade?
20/09/26 — Meu jeito de ser: qualidades, limites e temperamento
04/10/26 — Minha melhor versão: quem Deus sonhou que eu fosse.
10/10/26 — Encontro Vocacional (junto com a juventude)
11/10/26 — Se Joga CDM (Seminário)
25/10/26 — Assumindo o controle da minha vida.
08/11/26 — Conectados com Deus: oração e intimidade.
22/11/26 — Espírito Santo: dons que despertam e transformam.
06/12/26 — Batismo, Crisma, Confissão e Eucaristia: minha vida com Deus.
Data a definir — Confraternização CDM
31/01/27 — Cura, amor e serviço: os outros sacramentos.
07/02/27 — Se Joga CDM (Seminário)
21/02/27 — Virtudes: escolhas que constroem quem eu sou.
06 e 07/03/27 — Encontro da Essência (Seminário)
28/03/27 — No que eu acredito?
11/04/27 — Bíblia e Igreja: onde encontro a Verdade!
25/04/27 — Eu também sou Igreja.
16/05/27 — Liberdade não é fazer qualquer coisa.
30/05/27 — Na contramão do mundo: o jeito de Jesus.
Data a definir — Retiro da Eucaristia
13/06/27 — Qual é o meu chamado?
27/06/27 — Como descobrir o que Deus quer de mim?
11/07/27 — Meus dons têm um propósito.
18/07/27 — Comemoração de 1 ano do CDM (a definir)
25/07/27 — Eis-me aqui: minha vida é uma missão.
31/07 e 01/08/27 — Encontro Templo Vivo (Seminário)
10, 11 e 12/09/27 — Encontro fechado: Experiência de Oração (casa de encontro)
`;

describe("ler o cronograma colado", () => {
  const { encontros, erros } = lerCronograma(CRONOGRAMA_DO_CDM);
  const porTema = (tema: string) => encontros.find((e) => e.tema === tema)!;

  it("lê os 27 encontros do cartaz sem nenhum erro", () => {
    expect(erros).toEqual([]);
    expect(encontros).toHaveLength(27);
  });

  it("formação de domingo: data, tema com a pontuação da coordenação, sem destaque", () => {
    expect(encontros[0]).toMatchObject({
      data: "2026-09-06",
      dataFim: null,
      tema: "Quem sou eu de verdade?",
      complemento: null,
      destaque: false,
      icone: null,
    });
    expect(porTema("Minha melhor versão: quem Deus sonhou que eu fosse.").data).toBe("2026-10-04");
  });

  it("o que vem entre parênteses vira complemento, e o encontro vira destaque", () => {
    expect(porTema("Encontro Vocacional")).toMatchObject({
      data: "2026-10-10",
      complemento: "junto com a juventude",
      destaque: true,
    });
    expect(porTema("Comemoração de 1 ano do CDM")).toMatchObject({
      data: "2027-07-18",
      complemento: "a definir",
    });
  });

  it("datas de vários dias: dois, três, e atravessando o mês", () => {
    expect(porTema("Encontro da Essência")).toMatchObject({ data: "2027-03-06", dataFim: "2027-03-07" });
    expect(porTema("Encontro Templo Vivo")).toMatchObject({ data: "2027-07-31", dataFim: "2027-08-01" });
    expect(porTema("Encontro fechado: Experiência de Oração")).toMatchObject({
      data: "2027-09-10",
      dataFim: "2027-09-12",
      complemento: "casa de encontro",
    });
  });

  it("data a definir fica no mês do encontro anterior da lista", () => {
    expect(porTema("Confraternização CDM")).toMatchObject({ data: null, mesPrevisto: "2026-12", destaque: true });
    expect(porTema("Retiro da Eucaristia")).toMatchObject({ data: null, mesPrevisto: "2027-05" });
  });

  it("o ícone de cada destaque sai do tema — e 'comemoração' não vira 'oração'", () => {
    expect(porTema("Encontro Vocacional").icone).toBe("juventude");
    expect(encontros.filter((e) => e.tema === "Se Joga CDM").map((e) => e.icone)).toEqual(["fogo", "fogo"]);
    expect(porTema("Confraternização CDM").icone).toBe("confraternizacao");
    expect(porTema("Encontro da Essência").icone).toBe("coracao");
    expect(porTema("Retiro da Eucaristia").icone).toBe("eucaristia");
    expect(porTema("Comemoração de 1 ano do CDM").icone).toBe("bolo");
    expect(porTema("Encontro Templo Vivo").icone).toBe("igreja");
    expect(porTema("Encontro fechado: Experiência de Oração").icone).toBe("oracao");
    expect(palpiteDeIcone("Algo novo", null)).toBe("estrela");
  });
});

describe("o cronograma colado do jeito que vier", () => {
  it("tema quebrado em duas linhas, como sai de um cartaz, volta a ser um só", () => {
    const { encontros, erros } = lerCronograma(
      "20/09/26 — Meu jeito de ser: qualidades,\nlimites e temperamento\n04/10/26 — Minha melhor versão",
    );
    expect(erros).toEqual([]);
    expect(encontros.map((e) => e.tema)).toEqual([
      "Meu jeito de ser: qualidades, limites e temperamento",
      "Minha melhor versão",
    ]);
  });

  it("hífen com espaços, marcador de lista e ano de quatro dígitos também valem", () => {
    const { encontros, erros } = lerCronograma("• 06/09/2026 - Quem sou eu\n- 20/09 - Meu jeito de ser");
    expect(erros).toEqual([]);
    expect(encontros.map((e) => e.data)).toEqual(["2026-09-06", "2026-09-20"]);
  });

  it("sem ano, herda do anterior e vira o ano quando o mês volta", () => {
    const { encontros } = lerCronograma("06/12/26 — Advento\n31/01 — Sacramentos");
    expect(encontros[1]!.data).toBe("2027-01-31");
  });

  it("aponta a linha de cada erro, e não grava pela metade", () => {
    const { erros } = lerCronograma(
      "CRONOGRAMA CDM\n06/09/26 — Quem sou eu\n31/02/27 — Dia que não existe\n07/03/27\n01/03/27 e 20/03/27 — Dois colados",
    );
    expect(erros.map((e) => e.linha)).toEqual([1, 3, 4, 5]);
    expect(erros[0]!.motivo).toMatch(/começar com a data/);
    expect(erros[1]!.motivo).toMatch(/não existe/);
    expect(erros[2]!.motivo).toMatch(/Faltou o tema/);
    expect(erros[3]!.motivo).toMatch(/mais de um encontro/);
  });
});

describe("a ordem e as datas faladas", () => {
  const { encontros } = lerCronograma(CRONOGRAMA_DO_CDM);

  it("data a definir entra no fim do mês previsto, antes do mês seguinte", () => {
    const embaralhado = [...encontros].reverse();
    const temas = emOrdem(embaralhado).map((e) => e.tema);
    const confra = temas.indexOf("Confraternização CDM");
    expect(temas[confra - 1]).toBe("Batismo, Crisma, Confissão e Eucaristia: minha vida com Deus.");
    expect(temas[confra + 1]).toBe("Cura, amor e serviço: os outros sacramentos.");
    const retiro = temas.indexOf("Retiro da Eucaristia");
    expect(temas[retiro - 1]).toBe("Na contramão do mundo: o jeito de Jesus.");
    expect(temas[retiro + 1]).toBe("Qual é o meu chamado?");
  });

  it("o próximo é o de hoje, ou o que ainda está acontecendo", () => {
    expect(proximoEncontro(encontros, "2026-09-18")!.tema).toBe(
      "Meu jeito de ser: qualidades, limites e temperamento",
    );
    expect(proximoEncontro(encontros, "2026-09-20")!.data).toBe("2026-09-20");
    // Domingo do seminário de dois dias: ainda é ele.
    expect(proximoEncontro(encontros, "2027-03-07")!.tema).toBe("Encontro da Essência");
    // Data a definir nunca é "o próximo": não dá para ir.
    expect(proximoEncontro(encontros, "2026-12-07")!.tema).toBe("Cura, amor e serviço: os outros sacramentos.");
    expect(proximoEncontro(encontros, "2027-09-13")).toBeNull();
    expect(jaPassou({ data: null, dataFim: null }, "2030-01-01")).toBe(false);
  });

  it("diz as datas como gente diz", () => {
    expect(quando({ data: "2026-09-20", dataFim: null })).toBe("domingo, 20 de setembro");
    expect(quando({ data: "2027-03-06", dataFim: "2027-03-07" })).toBe("6 e 7 de março");
    expect(quando({ data: "2027-09-10", dataFim: "2027-09-12" })).toBe("10 a 12 de setembro");
    expect(quando({ data: "2027-07-31", dataFim: "2027-08-01" })).toBe("31 de julho a 1º de agosto");
    expect(quando({ data: null, dataFim: null })).toBe("Data a definir");
  });

  it("o ladrilho da lista e o mês de cada grupo", () => {
    expect(ladrilho({ data: "2026-10-10", dataFim: null })).toEqual({ dia: "10", mes: "out", semana: "sáb" });
    expect(ladrilho({ data: "2027-07-31", dataFim: "2027-08-01" })).toEqual({
      dia: "31–01",
      mes: "jul–ago",
      semana: "sáb–dom",
    });
    expect(ladrilho({ data: null, dataFim: null })).toBeNull();
    expect(mesDoCronograma({ data: null, mesPrevisto: "2026-12" })).toBe("dezembro de 2026");
  });
});
