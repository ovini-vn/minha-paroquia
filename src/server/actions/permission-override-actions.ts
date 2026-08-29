"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS, type PermissionCode } from "@/server/auth/rbac";
import { setOverride, removeOverride } from "@/server/modules/permission-overrides/service";

export type ActionState = { error?: string };

const VALID_CODES = new Set<string>(Object.values(PERMISSIONS));

export async function setOverrideAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.PERMISSION_OVERRIDES_MANAGE);

  const userId = formData.get("userId") as string;
  const permissionCode = formData.get("permissionCode") as string;
  const granted = formData.get("granted") === "true";
  if (!userId || !VALID_CODES.has(permissionCode)) return { error: "Dados inválidos." };

  await setOverride(session.membership.parishId, userId, permissionCode as PermissionCode, granted, session.userId);

  revalidatePath("/painel/permissoes");
  return {};
}

export async function removeOverrideAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.PERMISSION_OVERRIDES_MANAGE);

  const userId = formData.get("userId") as string;
  const permissionCode = formData.get("permissionCode") as string;
  if (!userId || !VALID_CODES.has(permissionCode)) return;

  await removeOverride(
    session.membership.parishId,
    userId,
    permissionCode as PermissionCode,
    session.userId,
  );
  revalidatePath("/painel/permissoes");
}
