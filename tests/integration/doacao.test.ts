import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerParish } from "@/server/modules/parishes/service";
import {
  upsertDonationSettings,
  getDonationSettings,
  createPurpose,
  updatePurpose,
  deletePurpose,
  setPurposeActive,
  listPurposesForFiel,
  listPurposesForAdmin,
  createInitiative,
  listInitiativesForFiel,
  moverItem,
} from "@/server/modules/doacao/service";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * Dado financeiro de uma paróquia não pode aparecer para outra — nem por um
 * `where` esquecido, nem por um id enviado de fora no formulário.
 */
describe("área de doação", () => {
  let paroquiaA: string;
  let paroquiaB: string;
  const parishIds: string[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    const [a, b] = await Promise.all([
      registerParish({ name: `Doacao A ${stamp}` }),
      registerParish({ name: `Doacao B ${stamp}` }),
    ]);
    paroquiaA = a.id;
    paroquiaB = b.id;
    parishIds.push(a.id, b.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds: [], parishIds });
  });

  it("guarda e devolve a chave PIX da paróquia", async () => {
    await upsertDonationSettings(paroquiaA, {
      pixKey: "11.222.333/0001-81",
      pixKeyType: "cnpj",
      pixPayload: "00020126...",
      dizimoAtivo: true,
      dizimoTitulo: null,
      dizimoTexto: null,
      dizimoCtaLabel: null,
      dizimoCtaTipo: "whatsapp",
      dizimoCtaValor: "43999990000",
    });

    const settings = await getDonationSettings(paroquiaA);
    expect(settings?.pixKey).toBe("11.222.333/0001-81");
    expect(settings?.dizimoCtaTipo).toBe("whatsapp");
  });

  it("salvar de novo atualiza, em vez de criar uma segunda linha", async () => {
    await upsertDonationSettings(paroquiaA, {
      pixKey: "paroquia@exemplo.org",
      pixKeyType: "email",
      pixPayload: null,
      dizimoAtivo: false,
      dizimoTitulo: null,
      dizimoTexto: null,
      dizimoCtaLabel: null,
      dizimoCtaTipo: null,
      dizimoCtaValor: null,
    });

    const settings = await getDonationSettings(paroquiaA);
    expect(settings?.pixKey).toBe("paroquia@exemplo.org");
    expect(settings?.dizimoAtivo).toBe(false);
  });

  it("a chave de uma paróquia não vaza para a outra", async () => {
    expect(await getDonationSettings(paroquiaB)).toBeNull();
  });

  it("cada nova finalidade entra no fim da fila", async () => {
    await createPurpose(paroquiaA, { title: "Primeira", description: "d", icon: "igreja", finalidadeId: null });
    await createPurpose(paroquiaA, { title: "Segunda", description: "d", icon: "caridade", finalidadeId: null });
    await createPurpose(paroquiaA, { title: "Terceira", description: "d", icon: "obras", finalidadeId: null });

    const lista = await listPurposesForAdmin(paroquiaA);
    expect(lista.map((p) => p.title)).toEqual(["Primeira", "Segunda", "Terceira"]);
  });

  it("subir troca de lugar com o vizinho, sem mexer no resto", async () => {
    const antes = await listPurposesForAdmin(paroquiaA);
    await moverItem(paroquiaA, "donationPurpose", antes[2]!.id, "cima");

    const depois = await listPurposesForAdmin(paroquiaA);
    expect(depois.map((p) => p.title)).toEqual(["Primeira", "Terceira", "Segunda"]);
  });

  it("subir o primeiro não faz nada — e não dá erro na cara de quem clicou", async () => {
    const antes = await listPurposesForAdmin(paroquiaA);
    await moverItem(paroquiaA, "donationPurpose", antes[0]!.id, "cima");

    const depois = await listPurposesForAdmin(paroquiaA);
    expect(depois.map((p) => p.title)).toEqual(antes.map((p) => p.title));
  });

  it("o fiel só vê o que está ativo; o painel vê tudo", async () => {
    const lista = await listPurposesForAdmin(paroquiaA);
    await setPurposeActive(paroquiaA, lista[0]!.id, false);

    const doFiel = await listPurposesForFiel(paroquiaA);
    const doPainel = await listPurposesForAdmin(paroquiaA);

    // Sem isso, desativar seria o mesmo que apagar: não haveria como reativar.
    expect(doPainel).toHaveLength(3);
    expect(doFiel).toHaveLength(2);
    expect(doFiel.some((p) => p.id === lista[0]!.id)).toBe(false);
  });

  it("uma paróquia NÃO edita a finalidade da outra, mesmo sabendo o id", async () => {
    const daParoquiaA = (await listPurposesForAdmin(paroquiaA))[0]!;

    // É o ataque possível: o id vem do formulário, e o formulário é do
    // navegador de quem envia.
    await updatePurpose(paroquiaB, daParoquiaA.id, {
      title: "INVADIDO",
      description: "x",
      icon: "igreja",
      finalidadeId: null,
    });

    const depois = await listPurposesForAdmin(paroquiaA);
    expect(depois.find((p) => p.id === daParoquiaA.id)?.title).not.toBe("INVADIDO");
  });

  it("nem apaga a da outra", async () => {
    const daParoquiaA = (await listPurposesForAdmin(paroquiaA))[0]!;
    await deletePurpose(paroquiaB, daParoquiaA.id);

    const depois = await listPurposesForAdmin(paroquiaA);
    expect(depois.some((p) => p.id === daParoquiaA.id)).toBe(true);
  });

  it("a lista de uma paróquia nunca traz item da outra", async () => {
    await createPurpose(paroquiaB, { title: "Só da B", description: "d", icon: "igreja", finalidadeId: null });

    const daA = await listPurposesForAdmin(paroquiaA);
    const daB = await listPurposesForAdmin(paroquiaB);

    expect(daA.every((p) => p.parishId === paroquiaA)).toBe(true);
    expect(daB.map((p) => p.title)).toEqual(["Só da B"]);
  });

  it("iniciativa guarda período e categoria", async () => {
    await createInitiative(paroquiaA, {
      title: "Obra dos hidrantes",
      description: "Adequação do sistema de hidrantes.",
      imageUrl: null,
      icon: "obras",
      category: "obras",
      // Sem caminho para contribuir: a iniciativa que só informa é o normal.
      finalidadeId: null,
      startsOn: new Date("2026-07-01T00:00:00.000Z"),
      endsOn: new Date("2026-12-20T00:00:00.000Z"),
    });

    const [iniciativa] = await listInitiativesForFiel(paroquiaA);
    expect(iniciativa?.category).toBe("obras");
    expect(iniciativa?.startsOn?.toISOString().slice(0, 10)).toBe("2026-07-01");
  });
});
