import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import {
  registerSacrament,
  setSacramentValidation,
  listSacramentsForValidation,
} from "@/server/modules/caminhada/service";
import { listMyNotifications } from "@/server/modules/notifications/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("validação de sacramentos: escopo por paróquia e notificação ao fiel", () => {
  let parishAId: string;
  let parishBId: string;
  let fielId: string;
  let secretariaId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parishA = await registerParish({ name: `Paróquia Sacramentos A ${Date.now()}` });
    const parishB = await registerParish({ name: `Paróquia Sacramentos B ${Date.now()}` });
    parishAId = parishA.id;
    parishBId = parishB.id;
    parishIds.push(parishA.id, parishB.id);

    const fiel = await registerUser({
      fullName: "Fiel Sacramentos",
      email: `fiel-sacramentos-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const secretaria = await registerUser({
      fullName: "Secretaria Sacramentos",
      email: `secretaria-sacramentos-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    fielId = fiel.id;
    secretariaId = secretaria.id;
    userIds.push(fiel.id, secretaria.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("valida um sacramento autodeclarado, registra quem validou e notifica o fiel", async () => {
    const sacrament = await registerSacrament({
      parishId: parishAId,
      userId: fielId,
      type: "batismo",
      date: new Date("1998-04-12"),
    });
    expect(sacrament.status).toBe("self_reported");

    const result = await setSacramentValidation(parishAId, sacrament.id, true, secretariaId);
    expect(result.count).toBe(1);

    const [validated] = await listSacramentsForValidation(parishAId);
    expect(validated?.status).toBe("validated");
    expect(validated?.validatedBy).toBe(secretariaId);
    expect(validated?.validatedAt).not.toBeNull();

    const notifications = await listMyNotifications(parishAId, fielId);
    expect(notifications.some((n) => n.title === "Sacramento validado")).toBe(true);
  });

  it("reverter a validação volta para self_reported e limpa validatedBy/validatedAt", async () => {
    const sacrament = await registerSacrament({
      parishId: parishAId,
      userId: fielId,
      type: "crisma",
      date: new Date("2010-06-01"),
    });
    await setSacramentValidation(parishAId, sacrament.id, true, secretariaId);

    await setSacramentValidation(parishAId, sacrament.id, false, secretariaId);

    const all = await listSacramentsForValidation(parishAId);
    const reverted = all.find((s) => s.id === sacrament.id);
    expect(reverted?.status).toBe("self_reported");
    expect(reverted?.validatedBy).toBeNull();
    expect(reverted?.validatedAt).toBeNull();
  });

  it("não valida um sacramento de outra paróquia mesmo sabendo o id", async () => {
    const sacrament = await registerSacrament({
      parishId: parishAId,
      userId: fielId,
      type: "matrimonio",
      date: new Date("2020-01-01"),
    });

    const result = await setSacramentValidation(parishBId, sacrament.id, true, secretariaId);
    expect(result.count).toBe(0);
  });
});
