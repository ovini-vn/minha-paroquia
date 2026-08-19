import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureRolesAndPermissionsSeeded } from "@/server/auth/seed-rbac";
import { registerParish } from "@/server/modules/parishes/service";
import { registerUser } from "@/server/modules/users/service";
import { setOverride, removeOverride, listOverrides } from "@/server/modules/permission-overrides/service";
import { PERMISSIONS } from "@/server/auth/rbac";
import { cleanupTenantData } from "../helpers/cleanup";

describe("permission_overrides: delegação fina (P2)", () => {
  let parishId: string;
  let paroco: string;
  let coordenador: string;
  const userIds: string[] = [];
  const parishIds: string[] = [];

  beforeAll(async () => {
    await ensureRolesAndPermissionsSeeded();
    const parish = await registerParish({ name: `Paróquia Permissões ${Date.now()}` });
    parishId = parish.id;
    parishIds.push(parish.id);

    const parocoUser = await registerUser({
      fullName: "Pároco Permissões",
      email: `paroco-permissoes-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    const coordenadorUser = await registerUser({
      fullName: "Coordenador Permissões",
      email: `coordenador-permissoes-${Date.now()}@test.comunidade.app`,
      password: "SenhaForte123",
    });
    paroco = parocoUser.id;
    coordenador = coordenadorUser.id;
    userIds.push(parocoUser.id, coordenadorUser.id);
  });

  afterAll(async () => {
    await cleanupTenantData({ userIds, parishIds });
  });

  it("concede um override e registra quem concedeu", async () => {
    const override = await setOverride(parishId, coordenador, PERMISSIONS.CATEQUESE_MANAGE, true, paroco);
    expect(override.granted).toBe(true);
    expect(override.grantedBy).toBe(paroco);

    const overrides = await listOverrides(parishId);
    expect(overrides.some((o) => o.userId === coordenador && o.permissionCode === PERMISSIONS.CATEQUESE_MANAGE)).toBe(
      true,
    );
  });

  it("reaplicar o override para a mesma pessoa/permissão atualiza em vez de duplicar", async () => {
    await setOverride(parishId, coordenador, PERMISSIONS.LITURGIA_MANAGE, true, paroco);
    await setOverride(parishId, coordenador, PERMISSIONS.LITURGIA_MANAGE, false, paroco);

    const overrides = await listOverrides(parishId);
    const matches = overrides.filter((o) => o.userId === coordenador && o.permissionCode === PERMISSIONS.LITURGIA_MANAGE);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.granted).toBe(false);
  });

  it("remover um override tira ele da lista", async () => {
    await setOverride(parishId, coordenador, PERMISSIONS.AVISOS_MANAGE, true, paroco);
    await removeOverride(parishId, coordenador, PERMISSIONS.AVISOS_MANAGE);

    const overrides = await listOverrides(parishId);
    expect(overrides.some((o) => o.userId === coordenador && o.permissionCode === PERMISSIONS.AVISOS_MANAGE)).toBe(
      false,
    );
  });
});
