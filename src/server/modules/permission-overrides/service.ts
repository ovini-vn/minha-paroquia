import { withTenantContext } from "@/server/db/tenant-context";
import type { PermissionCode } from "@/server/auth/rbac";

export function listOverrides(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.permissionOverride.findMany({
      where: { parishId },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
  );
}

/** Concede ou revoga uma permissão específica para um usuário, por cima do que o papel dele já dá. */
export function setOverride(
  parishId: string,
  userId: string,
  permissionCode: PermissionCode,
  granted: boolean,
  grantedBy: string,
) {
  return withTenantContext(parishId, (tx) =>
    tx.permissionOverride.upsert({
      where: { userId_permissionCode: { userId, permissionCode } },
      update: { granted, grantedBy },
      create: { parishId, userId, permissionCode, granted, grantedBy },
    }),
  );
}

/** Remove o override — o usuário volta a depender só das permissões do próprio papel. */
export function removeOverride(parishId: string, userId: string, permissionCode: PermissionCode) {
  return withTenantContext(parishId, (tx) =>
    tx.permissionOverride.deleteMany({ where: { parishId, userId, permissionCode } }),
  );
}
