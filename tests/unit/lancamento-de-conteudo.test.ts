import { describe, expect, it } from "vitest";
import {
  DIAS_ATE_ATRASAR,
  resumirLancamento,
  situacaoDoEncontro,
  temConteudo,
} from "@/lib/lancamento-de-conteudo";

/**
 * O aviso de conteúdo não lançado, pedido pela catequista.
 *
 * As datas aqui são absolutas de propósito, e escolhidas na faixa em que o
 * dia de Brasília e o de UTC discordam — entre 21h e a meia-noite. É o mesmo
 * cuidado que o horário das missas e a saudação do Início já exigiram: uma
 * conta de dias feita no fuso do servidor sai certa em São Paulo e errada em
 * produção.
 */
describe("aviso de conteúdo não lançado", () => {
  // 20/08/2026 às 22h em Brasília (21/08 01:00 UTC).
  const encontroDe20 = new Date("2026-08-21T01:00:00.000Z");

  function emDia(diaBrasilia: string) {
    // 22h de Brasília do dia informado.
    const partes = diaBrasilia.split("-").map(Number);
    return new Date(Date.UTC(partes[0]!, partes[1]! - 1, partes[2]! + 1, 1, 0, 0));
  }

  const semConteudo = { id: "e1", date: encontroDe20 };

  it("encontro com tema escolhido está em dia", () => {
    const comTema = { ...semConteudo, itinerarioTemaId: "t1" };
    expect(temConteudo(comTema)).toBe(true);
    expect(situacaoDoEncontro(comTema, emDia("2026-09-30"))).toBe("em_dia");
  });

  it("encontro com texto livre está em dia, mesmo sem tema", () => {
    const comTexto = { ...semConteudo, topic: "Visita à capela" };
    expect(situacaoDoEncontro(comTexto, emDia("2026-09-30"))).toBe("em_dia");
  });

  it("texto só de espaços não conta como conteúdo", () => {
    expect(temConteudo({ ...semConteudo, topic: "   " })).toBe(false);
  });

  it("encontro que ainda não aconteceu nunca é cobrado", () => {
    // Cobrar conteúdo de aula que não foi dada é o ruído que ensina a
    // ignorar o aviso.
    expect(situacaoDoEncontro(semConteudo, emDia("2026-08-18"))).toBe("em_dia");
  });

  it("no mesmo dia do encontro já fica pendente, e não atrasado", () => {
    expect(situacaoDoEncontro(semConteudo, emDia("2026-08-20"))).toBe("pendente");
  });

  it("seis dias depois ainda é pendente", () => {
    expect(situacaoDoEncontro(semConteudo, emDia("2026-08-26"))).toBe("pendente");
  });

  it("no sétimo dia vira atrasado", () => {
    expect(DIAS_ATE_ATRASAR).toBe(7);
    expect(situacaoDoEncontro(semConteudo, emDia("2026-08-27"))).toBe("atrasado");
  });

  it("o resumo separa pendente de atrasado e aponta o mais antigo", () => {
    const hoje = emDia("2026-08-30");
    const resumo = resumirLancamento(
      [
        { id: "antigo", date: new Date("2026-08-13T01:00:00.000Z") }, // 12/08
        { id: "recente", date: new Date("2026-08-29T01:00:00.000Z") }, // 28/08
        { id: "dado", date: encontroDe20, topic: "Os sacramentos" },
        { id: "futuro", date: new Date("2026-09-06T01:00:00.000Z") },
      ],
      hoje,
    );

    expect(resumo.atrasados).toBe(1);
    expect(resumo.pendentes).toBe(1);
    // O aviso cita o mais antigo: "3 encontros pendentes" manda a pessoa
    // procurar quais; a data manda ela direto ao lugar.
    expect(resumo.maisAntigo?.id).toBe("antigo");
    expect(resumo.maisAntigo?.dias).toBe(18);
  });

  it("turma em dia não gera aviso nenhum", () => {
    const resumo = resumirLancamento(
      [{ id: "a", date: encontroDe20, itinerarioTemaId: "t1" }],
      emDia("2026-09-30"),
    );
    expect(resumo).toEqual({ pendentes: 0, atrasados: 0, maisAntigo: null });
  });
});
