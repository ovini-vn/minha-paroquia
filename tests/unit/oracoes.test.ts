import { describe, expect, it } from "vitest";
import {
  roteiroDaMisericordia,
  roteiroDoDiaDaNovena,
  roteiroDoRosario,
  roteiroDoTerco,
  type Roteiro,
} from "@/lib/oracoes/roteiros";
import { MISTERIOS, ORDEM_DO_ROSARIO, misteriosDoDia } from "@/lib/oracoes/misterios";
import { NOVENAS } from "@/lib/oracoes/novenas";
import * as TEXTOS from "@/lib/oracoes/textos";
import { findBook } from "@/lib/bible-books";

/**
 * As orações guiadas.
 *
 * O que estes testes protegem é o que a pessoa não tem como conferir
 * rezando: que o terço tem as contas certas. Um terço com nove Ave-Marias
 * numa dezena, ou um mistério trocado, passaria despercebido por quem está
 * aprendendo — que é justamente quem o app quer ensinar.
 */

const quantas = (r: Roteiro, titulo: string) => r.passos.filter((p) => p.oracao.titulo === titulo).length;

describe("terço", () => {
  const terco = roteiroDoTerco("dolorosos");

  it("tem início, cinco dezenas de dez Ave-Marias e final", () => {
    // 3 no início + 5 × 10 nas dezenas
    expect(quantas(terco, "Ave-Maria")).toBe(53);
    // 1 no início + 1 por dezena
    expect(quantas(terco, "Pai-Nosso")).toBe(6);
    expect(quantas(terco, "Creio")).toBe(1);
    expect(quantas(terco, "Salve-Rainha")).toBe(1);
    // o Glória do início, e o Glória com o Ó meu Jesus ao fim de cada dezena
    expect(quantas(terco, "Glória")).toBe(1);
    expect(quantas(terco, "Glória e Ó meu Jesus")).toBe(5);
  });

  it("cada dezena começa pelo Pai-Nosso e conta as Ave-Marias de 1 a 10", () => {
    for (let d = 1; d <= 5; d++) {
      const daDezena = terco.passos.filter((p) => p.id.startsWith(`dezena-${d}-`));
      expect(daDezena[0]?.oracao.titulo).toBe("Pai-Nosso");
      expect(daDezena.slice(1, 11).map((p) => p.contador)).toEqual(
        Array.from({ length: 10 }, (_, i) => `${i + 1}ª Ave-Maria de 10`),
      );
      expect(daDezena.every((p) => p.parte === `${d}ª dezena de 5`)).toBe(true);
    }
  });

  it("os mistérios da dezena são os do conjunto escolhido, na ordem", () => {
    const titulos = [1, 2, 3, 4, 5].map((d) => terco.passos.find((p) => p.id === `dezena-${d}-pai-nosso`)?.misterio?.titulo);
    expect(titulos).toEqual(MISTERIOS.dolorosos.map((m) => m.titulo));
  });

  it("em todo passo há exatamente uma conta acesa", () => {
    for (const p of terco.passos) {
      expect(p.contas.filter((c) => c.estado === "atual")).toHaveLength(1);
    }
  });

  it("a conta acesa anda uma a uma pelas Ave-Marias da dezena", () => {
    const aves = terco.passos.filter((p) => p.id.startsWith("dezena-2-ave-"));
    aves.forEach((p, i) => {
      const acesa = p.contas.findIndex((c) => c.estado === "atual");
      expect(acesa).toBe(i + 1); // a conta 0 é a grande, do Pai-Nosso
      expect(p.contas.slice(0, acesa).every((c) => c.estado === "feita")).toBe(true);
    });
  });

  it("não repete identificador de passo — é a chave para retomar", () => {
    const ids = terco.passos.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("mistérios do dia", () => {
  it("seguem a distribuição de João Paulo II", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(misteriosDoDia)).toEqual([
      "gloriosos", // domingo
      "gozosos", // segunda
      "dolorosos", // terça
      "gloriosos", // quarta
      "luminosos", // quinta
      "dolorosos", // sexta
      "gozosos", // sábado
    ]);
  });

  it("cada mistério aponta para um capítulo que existe na Bíblia do app", () => {
    for (const conjunto of ORDEM_DO_ROSARIO) {
      expect(MISTERIOS[conjunto]).toHaveLength(5);
      for (const m of MISTERIOS[conjunto]) {
        const livro = findBook(m.biblia.livro);
        expect(livro, `${m.titulo}: livro ${m.biblia.livro}`).toBeDefined();
        expect(m.biblia.capitulo).toBeLessThanOrEqual(livro!.chapters);
      }
    }
  });
});

describe("rosário", () => {
  const rosario = roteiroDoRosario();

  it("são vinte dezenas, os quatro conjuntos na ordem", () => {
    expect(quantas(rosario, "Ave-Maria")).toBe(3 + 20 * 10);
    expect(quantas(rosario, "Glória e Ó meu Jesus")).toBe(20);
    const conjuntosNaOrdem = rosario.passos
      .filter((p) => p.id.endsWith("-pai-nosso") && p.misterio)
      .map((p) => p.id.split("-")[0]);
    expect(conjuntosNaOrdem).toEqual(ORDEM_DO_ROSARIO.flatMap((c) => Array(5).fill(c)));
  });

  it("a parte diz a dezena de 20 e o conjunto", () => {
    const vigesima = rosario.passos.find((p) => p.id === "gloriosos-5-pai-nosso");
    expect(vigesima?.parte).toBe("20ª dezena de 20 · Mistérios Gloriosos");
  });
});

describe("terço da misericórdia", () => {
  const misericordia = roteiroDaMisericordia();

  it("cinco Eterno Pai, cinquenta 'Pela sua dolorosa Paixão' e três Deus Santo", () => {
    expect(quantas(misericordia, "Eterno Pai")).toBe(5);
    expect(quantas(misericordia, "Pela sua dolorosa Paixão")).toBe(50);
    expect(quantas(misericordia, "Deus Santo")).toBe(3);
    expect(quantas(misericordia, "Creio")).toBe(1);
  });
});

describe("novenas", () => {
  it("as quatro têm nove dias, cada um com meditação e leitura que existe", () => {
    expect(NOVENAS.map((n) => n.slug)).toEqual([
      "nossa-senhora-de-fatima",
      "nossa-senhora-aparecida",
      "divino-espirito-santo",
      "sao-jose",
    ]);
    for (const n of NOVENAS) {
      expect(n.dias, n.slug).toHaveLength(9);
      for (const d of n.dias) {
        expect(d.meditacao.length, `${n.slug}: ${d.tema}`).toBeGreaterThan(150);
        const livro = findBook(d.biblia.livro);
        expect(livro, `${n.slug}: ${d.tema} → ${d.biblia.livro}`).toBeDefined();
        expect(d.biblia.capitulo).toBeLessThanOrEqual(livro!.chapters);
      }
    }
  });

  it("o dia da novena acende a conta do dia entre as nove", () => {
    const fatima = NOVENAS[0]!;
    const dia4 = roteiroDoDiaDaNovena(fatima, 4);
    for (const p of dia4.passos) {
      expect(p.contas).toHaveLength(9);
      expect(p.contas.findIndex((c) => c.estado === "atual")).toBe(3);
      expect(p.parte).toBe("Dia 4 de 9");
    }
    expect(dia4.passos.map((p) => p.oracao.titulo)).toContain("Pai-Nosso");
    expect(dia4.passos.find((p) => p.id === "meditacao")?.oracao.titulo).toBe(fatima.dias[3]!.tema);
    expect(dia4.conclusao.titulo).toBe("Dia 4 rezado");
    expect(roteiroDoDiaDaNovena(fatima, 9).conclusao.titulo).toBe("Novena concluída");
  });

  it("não inventa dia que não existe", () => {
    expect(() => roteiroDoDiaDaNovena(NOVENAS[0]!, 10)).toThrow();
  });
});

describe("vocabulário", () => {
  it("nenhum texto de oração usa as palavras que o app não usa", () => {
    /*
     * Numa paróquia nada é devido. As palavras abaixo fazem a pessoa pensar
     * em conta a pagar — e numa tela de oração seriam ainda piores.
     */
    const proibidas = /cobr|fatura|boleto|devedor|inadimpl|em aberto|vencid/i;
    const todos = [
      ...Object.values(TEXTOS).map((o) => `${o.titulo} ${o.texto}`),
      ...ORDEM_DO_ROSARIO.flatMap((c) => MISTERIOS[c].map((m) => `${m.titulo} ${m.contemplar}`)),
      ...NOVENAS.flatMap((n) => [
        n.descricao,
        n.quando,
        n.oracaoInicial.texto,
        n.oracaoFinal.texto,
        ...n.dias.map((d) => `${d.tema} ${d.meditacao}`),
      ]),
    ];
    for (const t of todos) expect(t).not.toMatch(proibidas);
  });
});
