import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import {
  publishLiturgy,
  getLiturgyForDate,
  listUpcomingLiturgy,
} from "@/server/modules/liturgia/liturgy-of-the-day-service";
import { withTenantContext } from "@/server/db/tenant-context";
import { cleanupTenantData } from "../helpers/cleanup";

describe("leituras do dia publicadas pela paróquia", () => {
  let parishAId: string;
  let parishBId: string;
  let parocoId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  const hoje = new Date("2026-08-20T14:30:00.000Z");

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const a = await registerParish({ name: `Paróquia Liturgia A ${Date.now()}` });
    const b = await registerParish({ name: `Paróquia Liturgia B ${Date.now()}` });
    parishAId = a.id;
    parishBId = b.id;
    parishIds.push(a.id, b.id);

    const paroco = await registerUser({
      fullName: "Pároco Liturgia",
      email: `paroco-liturgia-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    parocoId = paroco.id;
    userIds.push(paroco.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("publica as leituras e as devolve para o dia certo", async () => {
    await publishLiturgy(parishAId, parocoId, {
      date: hoje,
      gospelReference: "Mt 20, 1-16",
      gospelTitle: "Os trabalhadores da vinha",
      firstReading: "Is 55, 6-9",
      psalm: "Sl 144",
      reflection: "Onde eu ainda meço o amor de Deus pelo que acho que mereço?",
    });

    const found = await getLiturgyForDate(parishAId, hoje);
    expect(found?.gospelReference).toBe("Mt 20, 1-16");
    expect(found?.gospelTitle).toBe("Os trabalhadores da vinha");
    expect(found?.psalm).toBe("Sl 144");
  });

  it("a hora do dia não importa — é uma publicação por dia", async () => {
    // Mesma data civil, horas diferentes: precisa achar o mesmo registro.
    const outraHora = new Date("2026-08-20T23:50:00.000Z");
    const found = await getLiturgyForDate(parishAId, outraHora);
    expect(found?.gospelReference).toBe("Mt 20, 1-16");
  });

  it("publicar de novo no mesmo dia atualiza, em vez de duplicar", async () => {
    await publishLiturgy(parishAId, parocoId, {
      date: hoje,
      gospelReference: "Mt 20, 1-16a",
      reflection: "Reflexão corrigida.",
    });

    const found = await getLiturgyForDate(parishAId, hoje);
    expect(found?.gospelReference).toBe("Mt 20, 1-16a");
    expect(found?.reflection).toBe("Reflexão corrigida.");

    const todas = await withTenantContext(parishAId, (tx) =>
      tx.liturgyOfTheDay.findMany({ where: { parishId: parishAId } }),
    );
    expect(todas).toHaveLength(1);
  });

  it("rejeita publicar sem a referência do Evangelho", async () => {
    await expect(
      publishLiturgy(parishAId, parocoId, { date: hoje, gospelReference: "   " }),
    ).rejects.toThrow();
  });

  it("as leituras de uma paróquia não vazam para outra", async () => {
    const naOutra = await getLiturgyForDate(parishBId, hoje);
    expect(naOutra).toBeNull();

    const proximas = await listUpcomingLiturgy(parishBId, hoje);
    expect(proximas).toHaveLength(0);
  });
});
