import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { withTenantContext } from "@/server/db/tenant-context";
import {
  upsertAvailability,
  createSchedule,
  removeSchedule,
  deleteAvailability,
  confirmMySchedule,
} from "@/server/modules/liturgia/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("liturgia: disponibilidade, escala e escopo por usuário", () => {
  let parishId: string;
  let leitorAId: string;
  let leitorBId: string;
  let celebrationId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Liturgia ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const leitorA = await registerUser({
      fullName: "Leitor A",
      email: `leitor-a-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const leitorB = await registerUser({
      fullName: "Leitor B",
      email: `leitor-b-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    leitorAId = leitorA.id;
    leitorBId = leitorB.id;
    userIds.push(leitorA.id, leitorB.id);

    const celebration = await withTenantContext(parishId, (tx) =>
      tx.celebration.create({
        data: { parishId, type: "missa", startsAt: new Date(Date.now() + 86400000), createdBy: leitorA.id },
      }),
    );
    celebrationId = celebration.id;
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("declarar disponibilidade duas vezes para o mesmo papel atualiza em vez de duplicar", async () => {
    await upsertAvailability({ parishId, userId: leitorAId, roleType: "leitor", notes: "Manhãs" });
    await upsertAvailability({ parishId, userId: leitorAId, roleType: "leitor", notes: "Tardes" });

    const rows = await withTenantContext(parishId, (tx) =>
      tx.liturgicalAvailability.findMany({ where: { userId: leitorAId, roleType: "leitor" } }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.notes).toBe("Tardes");
  });

  it("rejeita escalar a mesma pessoa duas vezes para o mesmo papel na mesma celebração", async () => {
    await createSchedule(parishId, celebrationId, { roleType: "salmista", userId: leitorBId });
    await expect(
      createSchedule(parishId, celebrationId, { roleType: "salmista", userId: leitorBId }),
    ).rejects.toThrow();
  });

  it("não permite apagar disponibilidade de outro usuário", async () => {
    const availability = await upsertAvailability({ parishId, userId: leitorBId, roleType: "musica" });

    const resultAsOther = await deleteAvailability(parishId, availability.id, leitorAId);
    expect(resultAsOther.count).toBe(0);

    const resultAsOwner = await deleteAvailability(parishId, availability.id, leitorBId);
    expect(resultAsOwner.count).toBe(1);
  });

  it("não permite confirmar escala de outro usuário", async () => {
    const schedule = await createSchedule(parishId, celebrationId, { roleType: "acolhida", userId: leitorBId });

    const resultAsOther = await confirmMySchedule(parishId, schedule.id, leitorAId);
    expect(resultAsOther.count).toBe(0);

    const resultAsOwner = await confirmMySchedule(parishId, schedule.id, leitorBId);
    expect(resultAsOwner.count).toBe(1);

    await removeSchedule(parishId, schedule.id);
  });
});
