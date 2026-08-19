// Import relativo (não "@/...") de propósito: este módulo é usado tanto pelo
// seed (rodado via tsx, que não resolve os path aliases do tsconfig) quanto
// pelos testes (rodados via Vitest, que resolve).
import { prisma } from "../db/prisma";
import { PERMISSIONS, ROLE_CODES, ROLE_NAMES, ROLE_PERMISSIONS } from "./rbac";

/** Idempotente — pode rodar toda vez que o seed ou os testes iniciarem. */
export async function ensureRolesAndPermissionsSeeded(): Promise<void> {
  for (const code of ROLE_CODES) {
    await prisma.role.upsert({
      where: { code },
      update: { name: ROLE_NAMES[code] },
      create: { code, name: ROLE_NAMES[code] },
    });
  }

  for (const code of Object.values(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code },
    });
  }

  for (const code of ROLE_CODES) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code } });
    for (const permissionCode of ROLE_PERMISSIONS[code]) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permissionCode } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
}
