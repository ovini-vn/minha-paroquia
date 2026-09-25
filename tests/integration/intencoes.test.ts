import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { createInvitation, acceptInvitation } from "@/server/modules/invitations/service";
import {
  confirmarIntencao,
  intencoesDoPainel,
  minhasIntencoes,
  pedirIntencao,
  registrarNoBalcao,
  retirarMeuPedido,
  rolDaMissa,
} from "@/server/modules/intencoes/service";
import { withTenantContext } from "@/server/db/tenant-context";
import { cleanupTenantData } from "../helpers/cleanup";

/**
 * Intenção de missa: o fiel pede, a secretaria confere, o rol sai na
 * ordem de leitura. Sem valor em nenhum ponto do caminho.
 */
describe("intenções de missa", () => {
  const stamp = Date.now();
  const userIds: string[] = [];
  const parishIds: string[] = [];
  let parishId: string;
  let outraParishId: string;
  let ana: string;
  let secretaria: string;
  let missaFutura: string;
  let missaPassada: string;
  let missaDeOutra: string;
  const agora = new Date("2026-10-01T12:00:00Z");

  const conta = async (nome: string, apelido: string, paroquia: string) => {
    const u = await registerUser({ fullName: nome, email: `${apelido}-in-${stamp}@test.comunidade.app`, password: "SenhaForte123" });
    userIds.push(u.id);
    const convite = await createInvitation({ parishId: paroquia, createdBy: u.id, type: "link", role: "FIEL" });
    await acceptInvitation({ code: convite.code, userId: u.id });
    return u.id;
  };

  const missa = (paroquia: string, por: string, quando: string) =>
    withTenantContext(paroquia, (tx) =>
      tx.celebration.create({ data: { parishId: paroquia, createdBy: por, startsAt: new Date(quando) } }),
    ).then((c) => c.id);

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const p = await registerParish({ name: `Par Intencoes ${stamp}` });
    const o = await registerParish({ name: `Par Outra Intencoes ${stamp}` });
    parishId = p.id;
    outraParishId = o.id;
    parishIds.push(p.id, o.id);
    ana = await conta("Ana Pede Intencao", "ana", parishId);
    secretaria = await conta("Sonia Da Secretaria", "sonia", parishId);
    const bia = await conta("Bia De Outra", "bia", outraParishId);
    missaFutura = await missa(parishId, secretaria, "2026-10-04T12:00:00Z");
    missaPassada = await missa(parishId, secretaria, "2026-09-27T12:00:00Z");
    missaDeOutra = await missa(outraParishId, bia, "2026-10-04T12:00:00Z");
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("o pedido do fiel fica aguardando e não entra no rol", async () => {
    await pedirIntencao(parishId, ana, { celebrationId: missaFutura, tipo: "sufragio", texto: "  João   da Silva " }, agora);
    const minhas = await minhasIntencoes(parishId, ana, agora);
    expect(minhas).toHaveLength(1);
    expect(minhas[0]).toMatchObject({ texto: "João da Silva", estado: "pedida" });
    expect((await rolDaMissa(parishId, missaFutura))!.total).toBe(0);

    const { pedidas } = await intencoesDoPainel(parishId, agora);
    expect(pedidas.map((i) => i.pedidoPor?.fullName)).toEqual(["Ana Pede Intencao"]);
  });

  it("recusa missa que já passou, missa de outra paróquia e tipo inventado", async () => {
    await expect(
      pedirIntencao(parishId, ana, { celebrationId: missaPassada, tipo: "saude", texto: "Maria" }, agora),
    ).rejects.toThrow(/já aconteceu/);
    await expect(
      pedirIntencao(parishId, ana, { celebrationId: missaDeOutra, tipo: "saude", texto: "Maria" }, agora),
    ).rejects.toThrow(/Escolha uma missa/);
    await expect(
      pedirIntencao(parishId, ana, { celebrationId: missaFutura, tipo: "com_valor", texto: "Maria" }, agora),
    ).rejects.toThrow(/tipo/);
  });

  it("conferido pela secretaria, entra no rol na ordem de leitura", async () => {
    const [pedido] = await minhasIntencoes(parishId, ana, agora);
    await confirmarIntencao(parishId, pedido!.id, secretaria);
    // Conferir duas vezes não soma nada.
    await expect(confirmarIntencao(parishId, pedido!.id, secretaria)).rejects.toThrow(/já foi conferida/);

    await registrarNoBalcao(parishId, secretaria, { celebrationId: missaFutura, tipo: "saude", texto: "Dona Cida", pedidoPorNome: "Filha" }, agora);
    await registrarNoBalcao(parishId, secretaria, { celebrationId: missaFutura, tipo: "setimo_dia", texto: "Pedro Alves" }, agora);

    const rol = (await rolDaMissa(parishId, missaFutura))!;
    expect(rol.total).toBe(3);
    // Sétimo dia antes de "pelas almas", e os vivos por último.
    expect(rol.grupos.map((g) => g.tipo)).toEqual(["setimo_dia", "sufragio", "saude"]);
  });

  it("o fiel retira o próprio pedido só enquanto não foi conferido", async () => {
    const novo = await pedirIntencao(parishId, ana, { celebrationId: missaFutura, tipo: "aniversario", texto: "Lucas, 10 anos" }, agora);
    await retirarMeuPedido(parishId, ana, novo.id);
    const [conferido] = (await minhasIntencoes(parishId, ana, agora)).filter((i) => i.estado === "confirmada");
    await expect(retirarMeuPedido(parishId, ana, conferido!.id)).rejects.toThrow(/já foi conferido/);
  });
});
