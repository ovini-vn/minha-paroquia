import { describe, expect, it } from "vitest";
import { montarCaminhada, proximoRito } from "@/lib/caminhada-da-catequese";

const TEMAS = [
  { id: "t1", ordem: 1, titulo: "Deus é Pai", descricao: null },
  { id: "t2", ordem: 2, titulo: "Jesus nos ensina a rezar", descricao: "Livro, p. 16" },
  { id: "t3", ordem: 3, titulo: "O pão da vida", descricao: null },
];

const HOJE = new Date("2026-08-31T12:00:00.000Z");
const dia = (d: string) => new Date(`${d}T12:00:00.000Z`);

describe("a caminhada que a família vê", () => {
  it("marca como concluído o que a turma já deu, e aponta o próximo", () => {
    const caminhada = montarCaminhada(
      TEMAS,
      [
        { id: "e1", date: dia("2026-08-03"), itinerarioTemaId: "t1" },
        { id: "e2", date: dia("2026-08-10"), itinerarioTemaId: "t2" },
      ],
      new Map([
        ["e1", true],
        ["e2", false],
      ]),
      HOJE,
    );

    expect(caminhada.passos.map((p) => p.estado)).toEqual(["concluido", "concluido", "atual"]);
    expect(caminhada.concluidos).toBe(2);
    expect(caminhada.previstos).toBe(3);
    expect(caminhada.proximo?.titulo).toBe("O pão da vida");
    expect(caminhada.passos[0]?.presente).toBe(true);
    expect(caminhada.passos[1]?.presente).toBe(false);
  });

  it("encontro marcado para o futuro NÃO conta como dado", () => {
    // Senão a família veria "2 de 3" antes de a aula acontecer, e o próximo
    // passo apontaria para depois do que ainda vem.
    const caminhada = montarCaminhada(
      TEMAS,
      [
        { id: "e1", date: dia("2026-08-03"), itinerarioTemaId: "t1" },
        { id: "e2", date: dia("2026-09-20"), itinerarioTemaId: "t2" },
      ],
      new Map(),
      HOJE,
    );

    expect(caminhada.concluidos).toBe(1);
    expect(caminhada.proximo?.titulo).toBe("Jesus nos ensina a rezar");
  });

  it("sem chamada lançada, a presença fica em NULO — não vira falta", () => {
    // Transformar "não sabemos" em "faltou" seria acusar a criança de uma
    // falha do registro.
    const caminhada = montarCaminhada(
      TEMAS,
      [{ id: "e1", date: dia("2026-08-03"), itinerarioTemaId: "t1" }],
      new Map(),
      HOJE,
    );
    expect(caminhada.passos[0]?.estado).toBe("concluido");
    expect(caminhada.passos[0]?.presente).toBeNull();
  });

  it("tema repetido vale pelo encontro mais recente", () => {
    const caminhada = montarCaminhada(
      TEMAS,
      [
        { id: "e1", date: dia("2026-08-03"), itinerarioTemaId: "t1" },
        { id: "e2", date: dia("2026-08-17"), itinerarioTemaId: "t1" },
      ],
      new Map([
        ["e1", false],
        ["e2", true],
      ]),
      HOJE,
    );

    expect(caminhada.concluidos).toBe(1);
    expect(caminhada.passos[0]?.data).toEqual(dia("2026-08-17"));
    expect(caminhada.passos[0]?.presente).toBe(true);
  });

  it("se a turma pulou um tema, o pulado é o próximo passo", () => {
    // E isso é o certo: ele é mesmo o próximo a acontecer. Apontar para o
    // último dado responderia uma pergunta que ninguém fez.
    const caminhada = montarCaminhada(
      TEMAS,
      [
        { id: "e1", date: dia("2026-08-03"), itinerarioTemaId: "t1" },
        { id: "e3", date: dia("2026-08-17"), itinerarioTemaId: "t3" },
      ],
      new Map(),
      HOJE,
    );

    expect(caminhada.passos.map((p) => p.estado)).toEqual(["concluido", "atual", "concluido"]);
    expect(caminhada.proximo?.titulo).toBe("Jesus nos ensina a rezar");
  });

  it("caminhada terminada não tem próximo", () => {
    const caminhada = montarCaminhada(
      TEMAS,
      TEMAS.map((t, i) => ({ id: `e${i}`, date: dia("2026-08-03"), itinerarioTemaId: t.id })),
      new Map(),
      HOJE,
    );
    expect(caminhada.proximo).toBeNull();
    expect(caminhada.concluidos).toBe(3);
  });

  it("encontro sem tema não move a caminhada", () => {
    // Um encontro lançado sem conteúdo não pode fazer a família achar que a
    // turma andou.
    const caminhada = montarCaminhada(
      TEMAS,
      [{ id: "e1", date: dia("2026-08-03"), itinerarioTemaId: null }],
      new Map(),
      HOJE,
    );
    expect(caminhada.concluidos).toBe(0);
    expect(caminhada.proximo?.titulo).toBe("Deus é Pai");
  });
});

describe("o próximo rito", () => {
  it("é o agendado mais próximo que ainda não aconteceu", () => {
    const rito = proximoRito(
      [
        { id: "r1", name: "Entrega do Pai-Nosso", scheduledAt: dia("2026-07-05"), completedAt: dia("2026-07-05") },
        { id: "r2", name: "Entrega do Credo", scheduledAt: dia("2026-10-04"), completedAt: null },
        { id: "r3", name: "Apresentação à comunidade", scheduledAt: dia("2026-09-13"), completedAt: null },
      ],
      HOJE,
    );
    expect(rito?.name).toBe("Apresentação à comunidade");
  });

  it("rito sem data marcada não é anunciado como próximo", () => {
    // Anunciar como próximo algo sem dia é o jeito de a família perguntar
    // "quando?" e ninguém saber responder.
    const rito = proximoRito(
      [{ id: "r1", name: "Entrega do Credo", scheduledAt: null, completedAt: null }],
      HOJE,
    );
    expect(rito).toBeNull();
  });

  it("rito já concluído não volta como próximo", () => {
    const rito = proximoRito(
      [{ id: "r1", name: "Entrega do Credo", scheduledAt: dia("2026-09-13"), completedAt: dia("2026-09-13") }],
      HOJE,
    );
    expect(rito).toBeNull();
  });
});
