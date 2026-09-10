import { describe, expect, it } from "vitest";
import { estruturarLeituras } from "@/server/modules/liturgia/vatican-news-service";

/**
 * O feed do Vatican News manda a liturgia do dia como uma pilha de
 * fragmentos — 86 num dia comum — porque o lecionário quebra a linha no
 * ritmo de quem proclama em voz alta. A tela mostrava os 86 como parágrafos
 * separados, e uma frase virava três blocos afastados.
 *
 * Estes casos NÃO são inventados: cada um é um dia real dos quinze que o
 * feed guardava em 10/09/2026, e cada um quebrou uma regra que eu tinha
 * escrito antes de olhar. Ficam aqui porque a próxima regra ingênua vai
 * quebrar do mesmo jeito.
 */
describe("as leituras do dia viradas blocos", () => {
  it("separa a leitura do Evangelho e monta a citação (10/09)", () => {
    const blocos = estruturarLeituras([
      "Leitura da Primeira Carta de São Paulo aos Coríntios",
      "8,1b-7.11-13",
      "Irmãos,",
      "o conhecimento incha,",
      "a caridade é que constrói.",
      "Proclamação do Evangelho de Jesus Cristo segundo Lucas",
      "6,27-38",
      "Naquele tempo, disse Jesus a seus discípulos:",
      "Amai os vossos inimigos",
    ]);

    expect(blocos.map((b) => b.tipo)).toEqual(["leitura", "evangelho"]);
    expect(blocos[0]!.referencia).toBe("8,1b-7.11-13");
    expect(blocos[0]!.linhas).toHaveLength(3);

    // "Lucas 6,27-38" — o que um católico reconhece de relance, e o mesmo
    // jeito que o pároco escreve o título do vídeo dele.
    expect(blocos[1]!.citacao).toBe("Lucas 6,27-38");
    expect(blocos[1]!.linhas[0]).toBe("Naquele tempo, disse Jesus a seus discípulos:");
  });

  it('"Primeira Leitura" solto não vira uma leitura vazia (06/09)', () => {
    /*
     * Em dois dos quinze dias o feed põe o rótulo da seção numa linha e o
     * cabeçalho de verdade na seguinte. Tratados como dois cabeçalhos, o
     * dia renderiza duas leituras onde existe uma — a primeira delas sem
     * texto nenhum.
     */
    const blocos = estruturarLeituras([
      "Primeira Leitura",
      "Leitura da Profecia de Ezequiel",
      "33,7-9",
      "Assim diz o Senhor:",
      "Segunda Leitura",
      "Leitura da Carta de São Paulo aos Romanos",
      "13,8-10",
      "Irmãos,",
    ]);

    expect(blocos).toHaveLength(2);
    expect(blocos[0]!.rotulo).toBe("Leitura da Profecia de Ezequiel");
    expect(blocos[0]!.referencia).toBe("33,7-9");
    expect(blocos[1]!.rotulo).toBe("Leitura da Carta de São Paulo aos Romanos");
  });

  it("a reflexão pode ter vários parágrafos, e a assinatura fica com ela (31/08)", () => {
    /*
     * O dia que derrubou a regra "a reflexão é o último parágrafo": ali ela
     * tem quatro, e o último é só "(Papa Francisco, Angelus de ...)", com
     * 50 caracteres. Pela regra antiga, os três parágrafos de comentário
     * ficariam dentro do Evangelho e a assinatura viraria um verso.
     */
    const prosa = "Naquele dia, em Nazaré, Jesus confronta os seus interlocutores com uma escolha sobre a sua identidade e a sua missão, e pede que reconheçam nele o ungido do Senhor.";
    const maisProsa = "O evangelista conta-nos que os nazarenos não reconheceram em Jesus o ungido do Senhor, porque pensavam que o conheciam desde sempre e não esperavam mais nada dele.";

    const blocos = estruturarLeituras([
      "Proclamação do Evangelho de Jesus Cristo segundo Lucas",
      "4,16-30",
      "Naquele tempo,",
      "veio Jesus à cidade de Nazaré,",
      prosa,
      maisProsa,
      "(Papa Francisco, Angelus de 26 de janeiro de 2025)",
    ]);

    expect(blocos.map((b) => b.tipo)).toEqual(["evangelho", "reflexao"]);
    expect(blocos[0]!.linhas).toEqual(["Naquele tempo,", "veio Jesus à cidade de Nazaré,"]);
    expect(blocos[1]!.linhas).toHaveLength(3);
    expect(blocos[1]!.linhas[2]).toContain("Papa Francisco");
  });

  it('"Salmon gerou Booz" é um verso, não um salmo (08/09)', () => {
    /*
     * A genealogia de Mateus, lida na festa da Natividade de Nossa
     * Senhora. Uma regra por prefixo — "começa com Salmo" — casaria com
     * este verso e abriria um cabeçalho falso no meio da leitura.
     */
    const blocos = estruturarLeituras([
      "Proclamação do Evangelho de Jesus Cristo segundo Mateus",
      "1,1-16.18-23",
      "Abraão gerou Isaac.",
      "Salmon gerou Booz, cuja mãe era Raab.",
      "Booz gerou Obed, cuja mãe era Rute.",
    ]);

    expect(blocos).toHaveLength(1);
    expect(blocos[0]!.tipo).toBe("evangelho");
    expect(blocos[0]!.linhas).toContain("Salmon gerou Booz, cuja mãe era Raab.");
  });

  it('"Início da Primeira Carta..." também abre uma leitura (27/08)', () => {
    const blocos = estruturarLeituras([
      "Início da Primeira Carta de São Paulo aos Coríntios",
      "1,1-9",
      "Paulo, chamado a ser apóstolo de Jesus Cristo",
    ]);

    expect(blocos).toHaveLength(1);
    expect(blocos[0]!.tipo).toBe("leitura");
    expect(blocos[0]!.linhas).toHaveLength(1);
  });

  it("formato desconhecido devolve o texto, não um erro", () => {
    /*
     * O feed é de outra gente e pode mudar sem avisar. Quando mudar, o
     * fiel tem que continuar lendo a liturgia do dia — sem os cabeçalhos,
     * que é uma perda pequena perto de uma tela vazia.
     */
    const blocos = estruturarLeituras(["uma linha qualquer", "outra linha qualquer"]);

    expect(blocos).toHaveLength(1);
    expect(blocos[0]!.linhas).toEqual(["uma linha qualquer", "outra linha qualquer"]);
  });

  it("sem leituras, não inventa bloco nenhum", () => {
    expect(estruturarLeituras([])).toEqual([]);
  });
});
