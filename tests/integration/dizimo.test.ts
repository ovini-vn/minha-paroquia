import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { withTenantContext } from "@/server/db/tenant-context";
import { setContribution, listContributionsForPeriod, listMyContributions } from "@/server/modules/dizimo/service";
import { cleanupTenantData } from "../helpers/cleanup";

describe("dízimo: registro de participação por período, sem valores", () => {
  let parishId: string;
  let fielId: string;
  let secretariaId: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Dízimo ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const fiel = await registerUser({
      fullName: "Fiel Dízimo",
      email: `fiel-dizimo-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const secretaria = await registerUser({
      fullName: "Secretaria Dízimo",
      email: `secretaria-dizimo-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    fielId = fiel.id;
    secretariaId = secretaria.id;
    userIds.push(fiel.id, secretaria.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("marcar contribuição duas vezes no mesmo período não duplica", async () => {
    await setContribution(parishId, { userId: fielId, period: "2026-08", contributed: true }, secretariaId);
    await setContribution(parishId, { userId: fielId, period: "2026-08", contributed: true }, secretariaId);

    const rows = await withTenantContext(parishId, (tx) =>
      tx.titheParticipation.findMany({ where: { userId: fielId, period: "2026-08" } }),
    );
    expect(rows).toHaveLength(1);
  });

  it("desmarcar remove o registro do período", async () => {
    await setContribution(parishId, { userId: fielId, period: "2026-09", contributed: true }, secretariaId);
    await setContribution(parishId, { userId: fielId, period: "2026-09", contributed: false }, secretariaId);

    const rows = await withTenantContext(parishId, (tx) =>
      tx.titheParticipation.findMany({ where: { userId: fielId, period: "2026-09" } }),
    );
    expect(rows).toHaveLength(0);
  });

  it("nunca registra valor monetário — só presença de participação", async () => {
    await setContribution(parishId, { userId: fielId, period: "2026-10", contributed: true }, secretariaId);

    const [row] = await listContributionsForPeriod(parishId, "2026-10");
    expect(row).toBeDefined();
    expect(row).not.toHaveProperty("amount");
    expect(row).not.toHaveProperty("value");
  });

  it("o próprio fiel enxerga seu histórico de participação", async () => {
    const history = await listMyContributions(parishId, fielId);
    const periods = history.map((h) => h.period);
    expect(periods).toContain("2026-08");
    expect(periods).toContain("2026-10");
    expect(periods).not.toContain("2026-09");
  });
});
