import { describe, expect, it } from "vitest";
import {
  acompanhar,
  inicioDaProxima,
  normalizarPalavras,
  palavrasDaOracao,
  parecidas,
  terminou,
} from "@/lib/oracoes/acompanhar-voz";
import { AVE_MARIA, CREIO, GLORIA, OFERECIMENTO_DO_TERCO, O_MEU_JESUS, PAI_NOSSO } from "@/lib/oracoes/textos";

/**
 * O terço rezado pela voz, sem microfone: as frases abaixo imitam o que o
 * reconhecimento do navegador devolve — sem pontuação, com palavras
 * trocadas, engolidas e repetidas.
 */
const esperadas = (texto: string) => palavrasDaOracao(texto).esperadas;
const ouvir = (frase: string) => normalizarPalavras(frase);

describe("acompanhar a oração pela voz", () => {
  it("normaliza como a tela mostra e como o reconhecimento devolve", () => {
    expect(normalizarPalavras("Ó meu Jesus, perdoai-nos, livrai-nos")).toEqual(["o", "meu", "jesus", "perdoai", "nos", "livrai", "nos"]);
    const { exibidas, esperadas: lista } = palavrasDaOracao("Ave Maria,\n\ncheia de graça");
    expect(lista).toEqual(["ave", "maria", "cheia", "de", "graca"]);
    expect(exibidas.filter((p) => !p.espaco).map((p) => [p.texto, p.de, p.ate])).toEqual([
      ["Ave", 0, 1],
      ["Maria,", 1, 2],
      ["cheia", 2, 3],
      ["de", 3, 4],
      ["graça", 4, 5],
    ]);
  });

  it("aceita uma letra trocada em palavra longa, mas não em palavra curta", () => {
    expect(parecidas("bendita", "bendito")).toBe(true);
    expect(parecidas("pecadores", "pecadoras")).toBe(true);
    expect(parecidas("no", "nos")).toBe(false);
    expect(parecidas("de", "e")).toBe(false);
  });

  it("uma Ave-Maria inteira chega ao fim, mesmo com erros de reconhecimento", () => {
    const ave = esperadas(AVE_MARIA.texto);
    const ouvido = ouvir(
      "ave maria cheia de graça o senhor é com vosco bendita sois vós entre as mulheres e bendito é o fruto do vosso ventre jesus santa maria mãe de deus rogai por nós pecadores agora e na hora da nossa morte amém",
    );
    const andamento = acompanhar(ave, ouvido);
    expect(terminou(ave, andamento)).toBe("sim");
  });

  it("sem o Amém, que se perde por ser dito baixo, fica 'quase' — e a tela espera uma pausa maior", () => {
    const ave = esperadas(AVE_MARIA.texto);
    const ouvido = ouvir(
      "ave maria cheia de graça o senhor é convosco bendita sois vós entre as mulheres e bendito é o fruto do vosso ventre jesus santa maria mãe de deus rogai por nós pecadores agora e na hora da nossa morte",
    );
    expect(terminou(ave, acompanhar(ave, ouvido))).toBe("quase");
  });

  it("orações sem Amém terminam nas próprias últimas palavras", () => {
    const jesus = esperadas(O_MEU_JESUS.texto);
    const ouvido = ouvir(
      "ó meu jesus perdoai nos livrai nos do fogo do inferno levai as almas todas para o céu e socorrei principalmente as que mais precisarem",
    );
    expect(terminou(jesus, acompanhar(jesus, ouvido))).toBe("sim");

    const oferecimento = esperadas(OFERECIMENTO_DO_TERCO.texto);
    const ouvidoOferecimento = ouvir(OFERECIMENTO_DO_TERCO.texto);
    expect(terminou(oferecimento, acompanhar(oferecimento, ouvidoOferecimento))).toBe("sim");
  });

  it("em dupla, o fim some: até duas palavras podem faltar numa oração longa", () => {
    const ave = esperadas(AVE_MARIA.texto);
    const semAsDuasUltimas = ouvir(
      "ave maria cheia de graça o senhor é convosco bendita sois vós entre as mulheres e bendito é o fruto do vosso ventre jesus santa maria mãe de deus rogai por nós pecadores agora e na hora da nossa",
    );
    expect(terminou(ave, acompanhar(ave, semAsDuasUltimas))).toBe("quase");
  });

  it("dizer só as últimas palavras não termina a oração", () => {
    const jesus = esperadas(O_MEU_JESUS.texto);
    const andamento = acompanhar(jesus, ouvir("as que mais precisarem"));
    expect(terminou(jesus, andamento)).toBe("nao");
  });

  it("o anúncio do mistério antes do Pai-Nosso não adianta a oração", () => {
    const pai = esperadas(PAI_NOSSO.texto);
    const andamento = acompanhar(pai, ouvir("primeiro mistério doloroso a agonia de jesus no horto das oliveiras"));
    expect(andamento.posicao).toBe(0);
    const depois = acompanhar(pai, ouvir("pai nosso que estais nos céus santificado seja"), andamento);
    expect(depois.posicao).toBeGreaterThanOrEqual(6);
  });

  it("continua de onde parou quando o reconhecimento reinicia no meio", () => {
    const gloria = esperadas(GLORIA.texto);
    const primeira = acompanhar(gloria, ouvir("glória ao pai ao filho e ao espírito santo"));
    const segunda = acompanhar(gloria, ouvir("assim como era no princípio agora e sempre amém"), primeira);
    expect(terminou(gloria, segunda)).toBe("sim");
  });

  it("acha o começo da próxima oração, para quando o fim se perdeu", () => {
    const ave = esperadas(AVE_MARIA.texto);
    expect(inicioDaProxima(ouvir("na hora da nossa ave maria cheia de graça"), ave)).toBe(4);
    // Duas das três primeiras, no fim do que foi ouvido até agora, já bastam.
    expect(inicioDaProxima(ouvir("nossa morte ave maria"), ave)).toBe(2);
    // Uma palavra de fora no meio é tolerada.
    expect(inicioDaProxima(ouvir("pai é nosso que estais"), esperadas(PAI_NOSSO.texto))).toBe(0);
    expect(inicioDaProxima(ouvir("santa maria mãe de deus"), ave)).toBe(-1);
    expect(inicioDaProxima(ouvir("creio em deus pai"), esperadas(CREIO.texto))).toBe(0);
  });

  it("guarda onde a oração passou da metade, para a busca da próxima começar dali", () => {
    const ave = esperadas(AVE_MARIA.texto);
    const ouvido = ouvir("ave maria cheia de graça o senhor é convosco bendita sois vós entre as mulheres e bendito é o fruto do vosso ventre jesus santa maria");
    const andamento = acompanhar(ave, ouvido);
    expect(andamento.metadeEm).not.toBeNull();
    // Antes da metade, o "ave maria" do começo não pode ser tomado pela próxima.
    expect(inicioDaProxima(ouvido.slice((andamento.metadeEm ?? 0) + 1), ave)).toBe(-1);
  });
});
