import { afterEach, describe, expect, it } from "vitest";
import {
  consumirTentativa,
  limparTentativas,
  limparJanelasVencidas,
  textoDeEspera,
} from "@/server/auth/rate-limit";
import { prisma } from "@/server/db/prisma";

/**
 * O limite existe porque o Argon2 é caro de propósito: sem ele, cada
 * tentativa de senha consome memória e CPU do servidor. O que importa
 * testar é que ele conta certo sob repetição e que não pune quem acertou.
 */
describe("limite de tentativas", () => {
  const chaves: string[] = [];
  const novaChave = (nome: string) => {
    const c = `teste:${nome}:${Date.now()}:${Math.random()}`;
    chaves.push(c);
    return c;
  };

  afterEach(async () => {
    if (chaves.length) await prisma.rateLimit.deleteMany({ where: { chave: { in: chaves } } });
  });

  it("deixa passar até o limite e barra o seguinte", async () => {
    const chave = novaChave("basico");

    for (let i = 1; i <= 3; i++) {
      const r = await consumirTentativa(chave, 3, 60_000);
      expect(r.permitido, `tentativa ${i} deveria passar`).toBe(true);
    }

    const quarta = await consumirTentativa(chave, 3, 60_000);
    expect(quarta.permitido).toBe(false);
    if (quarta.permitido) return;
    expect(quarta.segundosParaTentar).toBeGreaterThan(0);
    expect(quarta.segundosParaTentar).toBeLessThanOrEqual(60);
  });

  it("continua barrando enquanto a janela não vence", async () => {
    const chave = novaChave("insiste");
    for (let i = 0; i < 5; i++) await consumirTentativa(chave, 2, 60_000);

    const r = await consumirTentativa(chave, 2, 60_000);
    expect(r.permitido).toBe(false);
  });

  it("acertar a senha zera o contador", async () => {
    // Quem errou três vezes e lembrou na quarta não pode ficar com o
    // contador cheio para a próxima sessão legítima.
    const chave = novaChave("acertou");
    for (let i = 0; i < 3; i++) await consumirTentativa(chave, 3, 60_000);

    await limparTentativas(chave);

    const depois = await consumirTentativa(chave, 3, 60_000);
    expect(depois.permitido).toBe(true);
  });

  it("janela vencida recomeça a contagem", async () => {
    const chave = novaChave("vencida");
    // Janela de 1ms: já nasce vencida na chamada seguinte.
    await consumirTentativa(chave, 1, 1);
    await consumirTentativa(chave, 1, 1);
    await new Promise((ok) => setTimeout(ok, 20));

    const nova = await consumirTentativa(chave, 1, 60_000);
    expect(nova.permitido).toBe(true);
  });

  it("chaves diferentes não interferem entre si", async () => {
    // É o que separa "limitar uma conta" de "limitar todo mundo".
    const a = novaChave("conta-a");
    const b = novaChave("conta-b");

    for (let i = 0; i < 4; i++) await consumirTentativa(a, 2, 60_000);
    expect((await consumirTentativa(a, 2, 60_000)).permitido).toBe(false);
    expect((await consumirTentativa(b, 2, 60_000)).permitido).toBe(true);
  });

  it("a poda remove só o que já venceu", async () => {
    const vencida = novaChave("podar");
    const viva = novaChave("manter");
    await consumirTentativa(vencida, 5, 1);
    await consumirTentativa(viva, 5, 60_000);
    await new Promise((ok) => setTimeout(ok, 20));

    await limparJanelasVencidas(new Date());

    expect(await prisma.rateLimit.findUnique({ where: { chave: vencida } })).toBeNull();
    expect(await prisma.rateLimit.findUnique({ where: { chave: viva } })).not.toBeNull();
  });

  it("a espera é dita em palavras, não em segundos", async () => {
    expect(textoDeEspera(30)).toBe("um minuto");
    expect(textoDeEspera(60)).toBe("um minuto");
    expect(textoDeEspera(300)).toBe("5 minutos");
  });
});
