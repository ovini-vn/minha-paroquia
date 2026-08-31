import { describe, expect, it } from "vitest";
import {
  classificar,
  diasComMissaDeRotina,
  localDoDetalhe,
  minutosDoDetalhe,
} from "../../scripts/importar-calendario";

/**
 * O importador do calendário pastoral decide o que NÃO entra, e isso apaga
 * informação de uma paróquia de verdade. As três decisões testadas aqui são
 * as que custam caro se estiverem erradas.
 *
 * As datas foram conferidas no calendário de 2026, não geradas pelo próprio
 * código — testar contra a própria saída não prova nada.
 */

/** "Missa Sexta, toda sexta, 19h30" — a grade real da Nossa Senhora de Fátima. */
const missaSexta = {
  type: "missa",
  title: "Missa Sexta",
  frequency: "semanal" as const,
  weekday: 5,
  weekOfMonth: null,
  timeMinutes: 1170,
  startsOn: new Date(Date.UTC(2026, 0, 1)),
  endsOn: null,
};

const adoracaoSabado = {
  type: "adoracao",
  title: "Adoração ao Santíssimo",
  frequency: "mensal" as const,
  weekday: 6,
  weekOfMonth: 5,
  timeMinutes: 960,
  startsOn: new Date(Date.UTC(2026, 0, 1)),
  endsOn: null,
};

describe("dias em que a paróquia já tem missa", () => {
  it("marca as sextas-feiras a partir de hoje", () => {
    const dias = diasComMissaDeRotina([missaSexta], 2026, new Date(Date.UTC(2026, 7, 31)));

    // 4 de setembro de 2026 é sexta-feira, e é o dia em que o calendário
    // marca "Missa do Apostolado de Oração" sem hora.
    expect(dias.has("2026-09-04")).toBe(true);
    expect(dias.has("2026-12-04")).toBe(true);
  });

  it("não marca o que já passou — a rotina não gera para trás", () => {
    const dias = diasComMissaDeRotina([missaSexta], 2026, new Date(Date.UTC(2026, 7, 31)));

    // 2 de janeiro e 7 de agosto de 2026 são sextas, mas anteriores a hoje:
    // apagá-las deixaria buraco no histórico da paróquia.
    expect(dias.has("2026-01-02")).toBe(false);
    expect(dias.has("2026-08-07")).toBe(false);
  });

  it("ignora rotina que não é missa", () => {
    const dias = diasComMissaDeRotina([adoracaoSabado], 2026, new Date(Date.UTC(2026, 7, 31)));

    // 26 de setembro é o último sábado. A Adoração acontece nele, mas
    // adoração não é missa e não pode calar uma missa marcada no calendário.
    expect(dias.has("2026-09-26")).toBe(false);
    expect(dias.size).toBe(0);
  });

  it("não marca dia da semana em que não há rotina de missa", () => {
    const dias = diasComMissaDeRotina([missaSexta], 2026, new Date(Date.UTC(2026, 7, 31)));

    // 24 de outubro é sábado e 5 de novembro é quinta. Numa paróquia que só
    // tem missa às sextas, as duas missas especiais do calendário ficam.
    expect(dias.has("2026-10-24")).toBe(false);
    expect(dias.has("2026-11-05")).toBe(false);
  });
});

describe("o campo solto de detalhe da fonte", () => {
  it("lê a hora quando há uma", () => {
    expect(minutosDoDetalhe("Mãe Admirável, 16h")).toBe(960);
    expect(minutosDoDetalhe("9h30")).toBe(570);
    expect(minutosDoDetalhe("19h30")).toBe(1170);
  });

  it("não inventa hora onde a fonte não deu", () => {
    expect(minutosDoDetalhe("1º dia")).toBeNull();
    expect(minutosDoDetalhe("31 anos")).toBeNull();
    expect(minutosDoDetalhe(undefined)).toBeNull();
  });

  it("só chama de LUGAR o que vem antes de uma hora", () => {
    expect(localDoDetalhe("Mãe Admirável, 16h")).toBe("Mãe Admirável");
    expect(localDoDetalhe("Paróquia S. Luís Gonzaga, 14h")).toBe("Paróquia S. Luís Gonzaga");
  });

  it("nota não é endereço", () => {
    // Vinte das trinta variações do arquivo são assim. Sem esta regra, a
    // agenda mostrava "Tríduo da Mãe Admirável · 1º dia" no espaço onde se
    // procura onde a missa é.
    expect(localDoDetalhe("1º dia")).toBeNull();
    expect(localDoDetalhe("31 anos")).toBeNull();
    expect(localDoDetalhe("até 4 de setembro")).toBeNull();
    expect(localDoDetalhe("para retirada")).toBeNull();
    expect(localDoDetalhe("Centro Juvenil Vocacional")).toBeNull();
  });
});

describe("o que é celebração e o que é evento", () => {
  it("missa é missa, esteja na gaveta que estiver", () => {
    /*
     * A categoria da fonte serve ao filtro da página impressa e não diz o
     * que a coisa é. Estas três missas estão em "Juventude e IAM" e em
     * "GBR e setores"; indo pela categoria, entrariam como evento — sem
     * tratamento litúrgico e escapando da regra que evita duas missas no
     * mesmo dia.
     */
    expect(classificar({ t: "Missa dos coroinhas na Catedral", c: "juv", m: "15h" })).toEqual({
      tipo: "celebracao",
      ct: "missa",
    });
    expect(classificar({ t: "Missa no setor 7", c: "gbr" })).toEqual({
      tipo: "celebracao",
      ct: "missa",
    });
    expect(classificar({ t: "Missa de aniversário da IAM", c: "juv", m: "31 anos" })).toEqual({
      tipo: "celebracao",
      ct: "missa",
    });
  });

  it("continua reconhecendo missa pela categoria", () => {
    expect(classificar({ t: "Missa na Colina", c: "mis" })).toEqual({
      tipo: "celebracao",
      ct: "missa",
    });
  });

  it("não confunde com o que só começa parecido", () => {
    // "Missão" e "Missionária" não são missas, e a regra casa pelo título.
    expect(classificar({ t: "Missão Jovem", c: "juv" }).tipo).toBe("evento");
    expect(classificar({ t: "Gincana Missionária", c: "juv" }).tipo).toBe("evento");
  });

  it("curso e retiro não são atos litúrgicos", () => {
    expect(classificar({ t: "Curso de Batismo", c: "sac" }).tipo).toBe("evento");
    expect(classificar({ t: "Retiro do Clero", c: "cle" }).tipo).toBe("evento");
  });
});
