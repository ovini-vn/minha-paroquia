import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { withTenantContext } from "@/server/db/tenant-context";
import {
  cancelarContribuicao,
  confirmarRecebimentoDoPix,
  criarFinalidade,
  gerarPixDeContribuicao,
  lancarContribuicao,
  listarContribuicoes,
  listarFinalidades,
  listarMinhasContribuicoes,
  listarPixAguardando,
  obterPix,
} from "@/server/modules/contribuicao/service";
import { listContributionsForPeriod } from "@/server/modules/dizimo/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * As contribuições: o único módulo do app que lida com dinheiro.
 *
 * O que estes testes protegem, em ordem de gravidade:
 *
 *  - a contribuição de uma paróquia não existe para a outra;
 *  - o mesmo código não vira contribuição duas vezes;
 *  - a finalidade NUNCA é adivinhada — ou veio do código, ou alguém digitou;
 *  - cancelar não apaga: deixa o registro de que houve e foi desfeito;
 *  - o dízimo continua sem valor na Pastoral do Dízimo, e ganha só a marca
 *    de participação.
 */
describe("contribuições", () => {
  let parishId: string;
  let outraParishId: string;
  let fielId: string;
  let secretariaId: string;
  let dizimoId: string;
  let obrasId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  const emUmDia = new Date("2026-09-15T00:00:00.000Z");

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();

    const parish = await registerParish({ name: `Paróquia Contrib ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const outra = await registerParish({ name: `Paróquia Vizinha Contrib ${Date.now()}` });
    outraParishId = outra.id;
    parishIds.push(outra.id);

    const fiel = await registerUser({
      fullName: "Maria Contribuinte",
      email: `maria-contrib-${Date.now()}@test.comunidade.app`,
      password: "Senha@12345",
    });
    const secretaria = await registerUser({
      fullName: "Secretária",
      email: `sec-contrib-${Date.now()}@test.comunidade.app`,
      password: "Senha@12345",
    });
    fielId = fiel.id;
    secretariaId = secretaria.id;
    userIds.push(fiel.id, secretaria.id);

    // Sem chave PIX não há como gerar código — é o primeiro passo da paróquia.
    await withTenantContext(parishId, (tx) =>
      tx.donationSettings.create({
        data: { parishId, pixKey: "43999998888", pixKeyType: "telefone" },
      }),
    );

    const dizimo = await criarFinalidade({ parishId, nome: "Dízimo", icone: "igreja", ehDizimo: true });
    const obras = await criarFinalidade({ parishId, nome: "Obras", icone: "obras", ehDizimo: false });
    dizimoId = dizimo.id;
    obrasId = obras.id;
  });

  afterAll(async () => {
    await cleanupTenantData({ parishIds, userIds });
  });

  it("só uma finalidade pode ser a do dízimo", async () => {
    await expect(
      criarFinalidade({ parishId, nome: "Outro dízimo", icone: "igreja", ehDizimo: true }),
    ).rejects.toThrow(/já é a finalidade do dízimo/i);
  });

  it("o código gerado carrega o identificador e o valor", async () => {
    const pix = await gerarPixDeContribuicao({
      parishId,
      userId: fielId,
      finalidadeId: obrasId,
      valor: 15000,
    });

    expect(pix.identificador).toMatch(/^MP\d{2}[A-Z0-9]{9}$/);
    expect(pix.brcode).toContain(pix.identificador);
    expect(pix.brcode).toContain("5406150.00");
    // A chave de telefone entra na forma canônica, e não como foi digitada.
    expect(pix.brcode).toContain("+5543999998888");
    expect(pix.estado).toBe("aguardando");
  });

  it("a doação espontânea não precisa de finalidade cadastrada", async () => {
    const pix = await gerarPixDeContribuicao({
      parishId,
      userId: fielId,
      finalidadeId: undefined,
      valor: 5000,
    });
    expect(pix.finalidadeId).toBeNull();
    expect(pix.brcode).toContain(pix.identificador);
  });

  it("sem valor, o código sai sem valor — e o fiel escolhe no banco", async () => {
    const pix = await gerarPixDeContribuicao({
      parishId,
      userId: fielId,
      finalidadeId: dizimoId,
      valor: null,
    });
    expect(pix.centavos).toBeNull();
    expect(pix.brcode).not.toContain("5406");
  });

  it("confirmar o recebimento cria a contribuição e fecha o código", async () => {
    const pix = await gerarPixDeContribuicao({
      parishId,
      userId: fielId,
      finalidadeId: obrasId,
      valor: 7500,
    });

    await confirmarRecebimentoDoPix({
      parishId,
      pixId: pix.id,
      centavos: null,
      recebidaEm: emUmDia,
      confirmadaPor: secretariaId,
    });

    const depois = await obterPix(parishId, pix.id, fielId);
    expect(depois.estado).toBe("recebida");

    const minhas = await listarMinhasContribuicoes(parishId, fielId);
    const registrada = minhas.find((c) => c.pixId === pix.id);
    expect(registrada?.centavos).toBe(7500);
    expect(registrada?.forma).toBe("pix_identificado");
    // A finalidade veio do código, e não de alguém adivinhando.
    expect(registrada?.finalidadeId).toBe(obrasId);
  });

  it("o mesmo código não vira contribuição duas vezes", async () => {
    const pix = await gerarPixDeContribuicao({
      parishId,
      userId: fielId,
      finalidadeId: obrasId,
      valor: 1000,
    });
    const confirmar = () =>
      confirmarRecebimentoDoPix({
        parishId,
        pixId: pix.id,
        centavos: null,
        recebidaEm: emUmDia,
        confirmadaPor: secretariaId,
      });

    await confirmar();
    await expect(confirmar()).rejects.toThrow(/já foi confirmada/i);
  });

  it("código sem valor exige que a secretaria diga quanto entrou", async () => {
    const pix = await gerarPixDeContribuicao({
      parishId,
      userId: fielId,
      finalidadeId: obrasId,
      valor: null,
    });

    await expect(
      confirmarRecebimentoDoPix({
        parishId,
        pixId: pix.id,
        centavos: null,
        recebidaEm: emUmDia,
        confirmadaPor: secretariaId,
      }),
    ).rejects.toThrow(/quanto entrou/i);

    const ok = await confirmarRecebimentoDoPix({
      parishId,
      pixId: pix.id,
      centavos: 3300,
      recebidaEm: emUmDia,
      confirmadaPor: secretariaId,
    });
    expect(ok.centavos).toBe(3300);
  });

  it("dízimo confirmado marca a participação do mês, e SEM valor", async () => {
    const pix = await gerarPixDeContribuicao({
      parishId,
      userId: fielId,
      finalidadeId: dizimoId,
      valor: 20000,
    });
    await confirmarRecebimentoDoPix({
      parishId,
      pixId: pix.id,
      centavos: null,
      recebidaEm: emUmDia,
      confirmadaPor: secretariaId,
    });

    const participacoes = await listContributionsForPeriod(parishId, "2026-09");
    const linha = participacoes.find((p) => p.userId === fielId);
    expect(linha).toBeDefined();
    /*
     * A decisão antiga continua de pé: a Pastoral do Dízimo registra QUEM
     * participou, e não quanto deu. O valor vive na contribuição, que é
     * pergunta da tesouraria.
     */
    expect(linha).not.toHaveProperty("amount");
    expect(linha).not.toHaveProperty("centavos");
  });

  it("o que chega em envelope ou dinheiro se lança à mão", async () => {
    await lancarContribuicao({
      parishId,
      finalidadeId: obrasId,
      userId: fielId,
      valor: 5000,
      recebidaEm: emUmDia,
      forma: "envelope",
      registradaPor: secretariaId,
    });

    const todas = await listarContribuicoes(parishId);
    expect(todas.some((c) => c.forma === "envelope" && c.centavos === 5000)).toBe(true);
  });

  it("a coleta da missa não tem nome, e isso é legítimo", async () => {
    const c = await lancarContribuicao({
      parishId,
      finalidadeId: undefined,
      userId: undefined,
      valor: 42350,
      recebidaEm: emUmDia,
      forma: "dinheiro",
      registradaPor: secretariaId,
    });
    expect(c.userId).toBeNull();
    expect(c.finalidadeId).toBeNull();
  });

  it("cancelar não apaga: deixa o registro e devolve o código à espera", async () => {
    const pix = await gerarPixDeContribuicao({
      parishId,
      userId: fielId,
      finalidadeId: obrasId,
      valor: 999,
    });
    const c = await confirmarRecebimentoDoPix({
      parishId,
      pixId: pix.id,
      centavos: null,
      recebidaEm: emUmDia,
      confirmadaPor: secretariaId,
    });

    await cancelarContribuicao(parishId, c.id);

    // Sai do relatório...
    const listadas = await listarContribuicoes(parishId);
    expect(listadas.some((x) => x.id === c.id)).toBe(false);

    // ...mas a linha continua lá, marcada.
    const guardada = await withTenantContext(parishId, (tx) =>
      tx.contribuicao.findUnique({ where: { id: c.id }, select: { cancelada: true } }),
    );
    expect(guardada?.cancelada).toBe(true);

    // E o código volta a poder ser confirmado, porque o engano foi nosso.
    const voltou = await obterPix(parishId, pix.id, fielId);
    expect(voltou.estado).toBe("aguardando");
  });

  it("o dinheiro de uma paróquia não existe para a outra", async () => {
    const daqui = await gerarPixDeContribuicao({
      parishId,
      userId: fielId,
      finalidadeId: obrasId,
      valor: 100,
    });

    expect(await listarFinalidades(outraParishId)).toHaveLength(0);
    expect(await listarContribuicoes(outraParishId)).toHaveLength(0);
    expect(await listarPixAguardando(outraParishId)).toHaveLength(0);

    // Mesmo com o id em mãos: o formulário é do navegador de quem envia.
    await expect(obterPix(outraParishId, daqui.id, fielId)).rejects.toThrow(/não encontrad/i);
    await expect(
      confirmarRecebimentoDoPix({
        parishId: outraParishId,
        pixId: daqui.id,
        centavos: 100,
        recebidaEm: emUmDia,
        confirmadaPor: secretariaId,
      }),
    ).rejects.toThrow(/não encontrad/i);

    // E uma finalidade de fora não entra numa contribuição daqui.
    await expect(
      lancarContribuicao({
        parishId: outraParishId,
        finalidadeId: obrasId,
        userId: undefined,
        valor: 100,
        recebidaEm: emUmDia,
        forma: "dinheiro",
        registradaPor: secretariaId,
      }),
    ).rejects.toThrow(/não encontrad/i);
  });

  it("o código de uma pessoa não é de outra", async () => {
    const meu = await gerarPixDeContribuicao({
      parishId,
      userId: fielId,
      finalidadeId: obrasId,
      valor: 100,
    });
    await expect(obterPix(parishId, meu.id, secretariaId)).rejects.toThrow(/não encontrad/i);
  });
});
