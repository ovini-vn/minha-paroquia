import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import {
  apagarSecao,
  criarPlano,
  criarSecao,
  definirPublicacao,
  editarSecao,
  listarPlanos,
  moverSecao,
  obterPlanoPublicado,
  temPlanoPublicado,
} from "@/server/modules/plano/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * O plano pastoral: o "por quê" do ano, escrito pela paróquia.
 *
 * O que estes testes protegem, além do caminho feliz: o plano de uma
 * paróquia não pode ser lido nem alterado por outra, e um plano em rascunho
 * não pode vazar para a tela do fiel. As duas coisas são silenciosas quando
 * quebram — ninguém recebe erro, só vê o que não devia.
 */
describe("plano pastoral", () => {
  let parishId: string;
  let outraParishId: string;
  let autorId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();

    const parish = await registerParish({ name: `Paróquia Plano ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const outra = await registerParish({ name: `Paróquia Vizinha Plano ${Date.now()}` });
    outraParishId = outra.id;
    parishIds.push(outra.id);

    const autor = await registerUser({
      fullName: "Secretária do Plano",
      email: `plano-${Date.now()}@test.comunidade.app`,
      password: "Senha@12345",
    });
    autorId = autor.id;
    userIds.push(autor.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ parishIds, userIds });
  });

  it("nasce como rascunho e não aparece para o fiel", async () => {
    const plano = await criarPlano({
      parishId,
      createdBy: autorId,
      ano: 2031,
      titulo: "Plano pastoral 2031",
      introducao: "Por que a paróquia faz o que faz.",
    });

    expect(plano.publicado).toBe(false);
    expect(await obterPlanoPublicado(parishId)).toBeNull();
    expect(await temPlanoPublicado(parishId)).toBe(false);
  });

  it("não publica um plano sem seção — o fiel veria um título e mais nada", async () => {
    const plano = (await listarPlanos(parishId)).find((p) => p.ano === 2031)!;
    await expect(definirPublicacao(parishId, plano.id, true)).rejects.toThrow(/ao menos uma seção/i);
  });

  it("as seções entram na ordem em que são escritas", async () => {
    const plano = (await listarPlanos(parishId)).find((p) => p.ano === 2031)!;
    await criarSecao({ parishId, planoId: plano.id, titulo: "Nosso objetivo", corpo: "Caminhar juntos." });
    await criarSecao({
      parishId,
      planoId: plano.id,
      rotulo: "Eixo 1",
      titulo: "Comunhão",
      corpo: "Ser uma Igreja do encontro.",
    });
    await criarSecao({ parishId, planoId: plano.id, titulo: "Prioridades", corpo: "GBR e juventudes." });

    const lido = (await listarPlanos(parishId)).find((p) => p.ano === 2031)!;
    expect(lido.secoes.map((s) => s.titulo)).toEqual(["Nosso objetivo", "Comunhão", "Prioridades"]);
    expect(lido.secoes[1]?.rotulo).toBe("Eixo 1");
  });

  it("mover troca de lugar com a vizinha, e na ponta não faz nada", async () => {
    const plano = (await listarPlanos(parishId)).find((p) => p.ano === 2031)!;
    const [primeira, segunda] = plano.secoes;

    await moverSecao(parishId, segunda!.id, "cima");
    let lido = (await listarPlanos(parishId)).find((p) => p.ano === 2031)!;
    expect(lido.secoes.map((s) => s.titulo)).toEqual(["Comunhão", "Nosso objetivo", "Prioridades"]);

    // "Comunhão" agora é a primeira: subir de novo é um clique sem efeito, e
    // não um erro.
    await moverSecao(parishId, segunda!.id, "cima");
    lido = (await listarPlanos(parishId)).find((p) => p.ano === 2031)!;
    expect(lido.secoes.map((s) => s.titulo)).toEqual(["Comunhão", "Nosso objetivo", "Prioridades"]);

    await moverSecao(parishId, primeira!.id, "cima");
    lido = (await listarPlanos(parishId)).find((p) => p.ano === 2031)!;
    expect(lido.secoes.map((s) => s.titulo)).toEqual(["Nosso objetivo", "Comunhão", "Prioridades"]);
  });

  it("publicado, é o que o fiel lê — e volta a sumir se virar rascunho", async () => {
    const plano = (await listarPlanos(parishId)).find((p) => p.ano === 2031)!;

    await definirPublicacao(parishId, plano.id, true);
    const publicado = await obterPlanoPublicado(parishId);
    expect(publicado?.ano).toBe(2031);
    expect(publicado?.secoes).toHaveLength(3);
    expect(await temPlanoPublicado(parishId)).toBe(true);

    await definirPublicacao(parishId, plano.id, false);
    expect(await obterPlanoPublicado(parishId)).toBeNull();

    await definirPublicacao(parishId, plano.id, true);
  });

  it("o fiel lê o plano MAIS RECENTE que está publicado", async () => {
    /*
     * Em janeiro a paróquia ainda escreve o plano novo. Mostrar tela vazia
     * porque o ano virou apagaria o rumo que ainda vale — por isso a regra é
     * "o mais recente publicado", e não "o do ano corrente".
     */
    const novo = await criarPlano({
      parishId,
      createdBy: autorId,
      ano: 2032,
      titulo: "Plano pastoral 2032",
    });
    await criarSecao({ parishId, planoId: novo.id, titulo: "Rumo novo", corpo: "Ainda em revisão." });

    expect((await obterPlanoPublicado(parishId))?.ano).toBe(2031);

    await definirPublicacao(parishId, novo.id, true);
    expect((await obterPlanoPublicado(parishId))?.ano).toBe(2032);

    await definirPublicacao(parishId, novo.id, false);
  });

  it("um ano só tem um plano", async () => {
    await expect(
      criarPlano({ parishId, createdBy: autorId, ano: 2031, titulo: "Outro 2031" }),
    ).rejects.toThrow(/já tem um plano/i);
  });

  it("o plano de uma paróquia não existe para a outra", async () => {
    expect(await obterPlanoPublicado(outraParishId)).toBeNull();
    expect(await listarPlanos(outraParishId)).toHaveLength(0);

    const meu = (await listarPlanos(parishId)).find((p) => p.ano === 2031)!;

    // Mesmo com o id em mãos, a vizinha não alcança: a resposta é a mesma
    // que a pessoa veria se o plano tivesse sido apagado.
    await expect(definirPublicacao(outraParishId, meu.id, false)).rejects.toThrow(/não encontrado/i);
    await expect(apagarSecao(outraParishId, meu.secoes[0]!.id)).rejects.toThrow(/não encontrad/i);
    await expect(
      editarSecao({
        parishId: outraParishId,
        secaoId: meu.secoes[0]!.id,
        titulo: "Invadido",
        corpo: "Não deveria entrar.",
      }),
    ).rejects.toThrow(/não encontrad/i);

    // E o plano continua como estava.
    const depois = (await listarPlanos(parishId)).find((p) => p.ano === 2031)!;
    expect(depois.publicado).toBe(true);
    expect(depois.secoes[0]?.titulo).toBe("Nosso objetivo");
  });
});
