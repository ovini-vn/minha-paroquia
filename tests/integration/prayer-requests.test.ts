import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import {
  createPrayerRequest,
  listMyPrayerRequests,
  listCommunityPrayerRequests,
  listPrivatePrayerRequests,
  listPendingPrayerRequests,
  moderatePrayerRequest,
} from "@/server/modules/prayer-requests/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("pedidos de oração: visibilidade padre vs comunidade, e anonimato", () => {
  let parishId: string;
  let fielId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Oração ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const fiel = await registerUser({
      fullName: "Fiel Oração",
      email: `fiel-oracao-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    fielId = fiel.id;
    userIds.push(fiel.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("um pedido 'padre' não aparece no mural da comunidade", async () => {
    await createPrayerRequest({
      parishId,
      userId: fielId,
      contentText: "Peço orações pela minha família",
      visibility: "padre",
      isAnonymous: false,
    });

    const community = await listCommunityPrayerRequests(parishId);
    expect(community.some((r) => r.contentText === "Peço orações pela minha família")).toBe(false);

    const privateList = await listPrivatePrayerRequests(parishId);
    expect(privateList.some((r) => r.contentText === "Peço orações pela minha família")).toBe(true);
  });

  it("um pedido 'comunidade' NÃO vai ao mural antes de ser aprovado", async () => {
    // O mural é lido pela comunidade inteira e o campo é texto livre:
    // alguém da paróquia olha antes.
    const texto = "Peço orações pela cura de um amigo";
    await createPrayerRequest({
      parishId,
      userId: fielId,
      contentText: texto,
      visibility: "comunidade",
      isAnonymous: false,
    });

    const antes = await listCommunityPrayerRequests(parishId);
    expect(antes.some((r) => r.contentText === texto)).toBe(false);

    const fila = await listPendingPrayerRequests(parishId);
    const pedido = fila.find((r) => r.contentText === texto);
    expect(pedido).toBeDefined();

    await moderatePrayerRequest(parishId, pedido!.id, "aprovado", fielId);

    const depois = await listCommunityPrayerRequests(parishId);
    expect(depois.some((r) => r.contentText === texto)).toBe(true);

    // Continua fora da lista privada: aprovar não muda para quem é.
    const privateList = await listPrivatePrayerRequests(parishId);
    expect(privateList.some((r) => r.contentText === texto)).toBe(false);
  });

  it("recusado não aparece no mural nem volta para a fila", async () => {
    const texto = "Pedido que a paróquia decidiu não publicar";
    await createPrayerRequest({
      parishId,
      userId: fielId,
      contentText: texto,
      visibility: "comunidade",
      isAnonymous: false,
    });
    const fila = await listPendingPrayerRequests(parishId);
    const pedido = fila.find((r) => r.contentText === texto)!;

    await moderatePrayerRequest(parishId, pedido.id, "recusado", fielId);

    expect((await listCommunityPrayerRequests(parishId)).some((r) => r.contentText === texto)).toBe(
      false,
    );
    expect((await listPendingPrayerRequests(parishId)).some((r) => r.contentText === texto)).toBe(
      false,
    );
  });

  it("pedido ao padre já nasce aprovado — moderar o que é dirigido a ele seria circular", async () => {
    const texto = "Pedido direto ao sacerdote";
    await createPrayerRequest({
      parishId,
      userId: fielId,
      contentText: texto,
      visibility: "padre",
      isAnonymous: false,
    });

    expect((await listPrivatePrayerRequests(parishId)).some((r) => r.contentText === texto)).toBe(
      true,
    );
    // E não entope a fila de moderação, que é só do mural.
    expect((await listPendingPrayerRequests(parishId)).some((r) => r.contentText === texto)).toBe(
      false,
    );
  });

  it("pedido anônimo nunca expõe o nome de quem pediu, nem no mural nem na lista privada", async () => {
    await createPrayerRequest({
      parishId,
      userId: fielId,
      contentText: "Pedido anônimo comunidade",
      visibility: "comunidade",
      isAnonymous: true,
    });
    await createPrayerRequest({
      parishId,
      userId: fielId,
      contentText: "Pedido anônimo padre",
      visibility: "padre",
      isAnonymous: true,
    });

    const naFila = await listPendingPrayerRequests(parishId);
    const aprovar = naFila.find((r) => r.contentText === "Pedido anônimo comunidade")!;
    // Quem modera VÊ o nome: precisa saber de quem veio para decidir. O
    // anonimato vale na exibição ao mural.
    expect(aprovar.requester.fullName).toBe("Fiel Oração");
    await moderatePrayerRequest(parishId, aprovar.id, "aprovado", fielId);

    const community = await listCommunityPrayerRequests(parishId);
    const communityItem = community.find((r) => r.contentText === "Pedido anônimo comunidade");
    expect(communityItem?.requesterName).toBeNull();

    const privateList = await listPrivatePrayerRequests(parishId);
    const privateItem = privateList.find((r) => r.contentText === "Pedido anônimo padre");
    expect(privateItem?.requesterName).toBeNull();
  });

  it("o próprio fiel enxerga todos os pedidos que enviou, independente da visibilidade", async () => {
    const mine = await listMyPrayerRequests(parishId, fielId);
    expect(mine.length).toBeGreaterThanOrEqual(4);
  });
});
