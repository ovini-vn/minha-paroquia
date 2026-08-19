import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { registerMassParticipation, getReflectionAggregate } from "@/server/modules/caminhada/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("minha caminhada: agregação de reflexões preserva privacidade", () => {
  let parishId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Caminhada ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("não libera o agregado quando há poucas participações (evita expor indivíduo por dedução)", async () => {
    const fiel = await registerUser({
      fullName: "Fiel Solo",
      email: `fiel-solo-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    userIds.push(fiel.id);

    await registerMassParticipation({
      parishId,
      userId: fiel.id,
      participatedAt: new Date(),
      reflectionText: "Aprendi algo",
    });

    const aggregate = await getReflectionAggregate(parishId);
    expect(aggregate.available).toBe(false);
  });

  it("libera o agregado (só números, nunca texto) quando atinge o mínimo de participações", async () => {
    const fiéis = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        registerUser({
          fullName: `Fiel Grupo ${i}`,
          email: `fiel-grupo-${i}-${Date.now()}@test.comunidade.app`,
          password: "SenhaForte123",
        }),
      ),
    );
    userIds.push(...fiéis.map((f) => f.id));

    for (const [i, fiel] of fiéis.entries()) {
      await registerMassParticipation({
        parishId,
        userId: fiel.id,
        participatedAt: new Date(),
        reflectionText: i < 3 ? "Uma reflexão qualquer" : undefined,
      });
    }

    const aggregate = await getReflectionAggregate(parishId);
    expect(aggregate.available).toBe(true);
    if (aggregate.available) {
      expect(aggregate.total).toBeGreaterThanOrEqual(5);
      expect(typeof aggregate.rate).toBe("number");
      expect(aggregate).not.toHaveProperty("reflectionText");
    }
  });
});
