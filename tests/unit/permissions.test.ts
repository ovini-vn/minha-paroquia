import { describe, expect, it } from "vitest";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS, ROLE_PERMISSIONS, computeEffectivePermissions } from "@/server/auth/rbac";
import type { SessionContext } from "@/server/auth/session";

function fakeSession(roleCode: keyof typeof ROLE_PERMISSIONS): SessionContext {
  return {
    userId: "00000000-0000-0000-0000-000000000000",
    email: "teste@comunidade.app",
    fullName: "Sessão de Teste",
    isPlatformAdmin: false,
    themePreference: "default",
    membership: null,
    dioceses: [],
    provinces: [],
    national: null,
    permissions: ROLE_PERMISSIONS[roleCode],
  };
}

describe("controle básico de permissões", () => {
  it("PAROCO pode criar convites", () => {
    expect(() => requirePermission(fakeSession("PAROCO"), PERMISSIONS.INVITATIONS_CREATE)).not.toThrow();
  });

  it("SECRETARIA pode ver o dashboard da paróquia", () => {
    expect(() => requirePermission(fakeSession("SECRETARIA"), PERMISSIONS.DASHBOARD_PARISH_VIEW)).not.toThrow();
  });

  it("FIEL não pode criar convites", () => {
    expect(() => requirePermission(fakeSession("FIEL"), PERMISSIONS.INVITATIONS_CREATE)).toThrow();
  });

  it("CATEQUISTA não pode ver o dashboard da paróquia", () => {
    expect(() => requirePermission(fakeSession("CATEQUISTA"), PERMISSIONS.DASHBOARD_PARISH_VIEW)).toThrow();
  });

  it("só PAROCO pode delegar permissões — nem Secretaria concede a si mesma", () => {
    expect(() => requirePermission(fakeSession("PAROCO"), PERMISSIONS.PERMISSION_OVERRIDES_MANAGE)).not.toThrow();
    expect(() => requirePermission(fakeSession("SECRETARIA"), PERMISSIONS.PERMISSION_OVERRIDES_MANAGE)).toThrow();
  });
});

describe("delegação fina — computeEffectivePermissions", () => {
  it("um override concedido dá uma permissão que o papel não tem", () => {
    const result = computeEffectivePermissions(ROLE_PERMISSIONS.COORDENADOR_PASTORAL, [
      { permissionCode: PERMISSIONS.CATEQUESE_MANAGE, granted: true },
    ]);
    expect(result).toContain(PERMISSIONS.CATEQUESE_MANAGE);
  });

  it("um override revogado tira uma permissão que o papel normalmente tem", () => {
    const result = computeEffectivePermissions(ROLE_PERMISSIONS.PAROCO, [
      { permissionCode: PERMISSIONS.LITURGIA_MANAGE, granted: false },
    ]);
    expect(result).not.toContain(PERMISSIONS.LITURGIA_MANAGE);
    expect(result).toContain(PERMISSIONS.DIZIMO_MANAGE);
  });

  it("sem overrides, a permissão efetiva é exatamente a do papel", () => {
    const result = computeEffectivePermissions(ROLE_PERMISSIONS.CATEQUISTA, []);
    expect(result).toEqual(ROLE_PERMISSIONS.CATEQUISTA);
  });
});
