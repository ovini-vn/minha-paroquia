"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  updateOwnParishProfile,
  changeMemberRole,
} from "@/server/modules/parishes/service";
import { updateParishProfileInputSchema } from "@/server/modules/parishes/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function updateParishProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.DASHBOARD_PARISH_VIEW);

  try {
    // Campo vazio vai como "" e não como undefined: é assim que apagar um
    // dado passa a ser possível. Com undefined o Prisma ignora o campo, e o
    // valor antigo sobreviveria a uma tentativa de limpeza.
    const texto = (campo: string) => String(formData.get(campo) ?? "");
    const input = updateParishProfileInputSchema.parse({
      city: texto("city"),
      state: texto("state"),
      address: texto("address"),
      phone: texto("phone"),
      whatsapp: texto("whatsapp"),
      description: texto("description"),
      logoUrl: texto("logoUrl"),
      facebookUrl: texto("facebookUrl"),
      instagramUrl: texto("instagramUrl"),
    });

    await updateOwnParishProfile(session.membership.parishId, input);
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel");
  revalidatePath("/comunidade");
  revalidatePath("/contato");
  return {};
}

export type MemberActionState = { error?: string; ok?: string };

/**
 * Altera o papel de um membro.
 *
 * Guardado por PERMISSION_OVERRIDES_MANAGE, a mesma permissão de delegar
 * permissões — mudar papel é pelo menos tão poderoso quanto isso, e hoje só
 * o Pároco a tem.
 */
export async function changeMemberRoleAction(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.PERMISSION_OVERRIDES_MANAGE);

  const userId = formData.get("userId") as string;
  const roleCode = formData.get("roleCode") as string;
  const fullName = (formData.get("fullName") as string) || "A pessoa";
  if (!userId || !roleCode) return { error: "Dados incompletos." };

  try {
    await changeMemberRole(session.membership.parishId, userId, roleCode, session.userId);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel/membros");
  revalidatePath("/painel");
  revalidatePath("/catequese");
  return { ok: `Papel de ${fullName} atualizado.` };
}

