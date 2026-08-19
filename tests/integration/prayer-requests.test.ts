import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import {
  createPrayerRequest,
  listMyPrayerRequests,
  listCommunityPrayerRequests,
  listPrivatePrayerRequests,
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

  it("um pedido 'comunidade' aparece no mural, mas não na lista privada", async () => {
    await createPrayerRequest({
      parishId,
      userId: fielId,
      contentText: "Peço orações pela cura de um amigo",
      visibility: "comunidade",
      isAnonymous: false,
    });

    const community = await listCommunityPrayerRequests(parishId);
    expect(community.some((r) => r.contentText === "Peço orações pela cura de um amigo")).toBe(true);

    const privateList = await listPrivatePrayerRequests(parishId);
    expect(privateList.some((r) => r.contentText === "Peço orações pela cura de um amigo")).toBe(false);
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
