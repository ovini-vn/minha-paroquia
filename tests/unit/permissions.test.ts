import { describe, expect, it } from "vitest";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/server/auth/rbac";
import type { SessionContext } from "@/server/auth/session";

function fakeSession(roleCode: keyof typeof ROLE_PERMISSIONS): SessionContext {
  return {
    userId: "00000000-0000-0000-0000-000000000000",
    email: "teste@comunidade.app",
    fullName: "Sessão de Teste",
    isPlatformAdmin: false,
    membership: null,
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
});
