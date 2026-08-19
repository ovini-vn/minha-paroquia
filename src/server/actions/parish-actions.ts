"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { updateOwnParishProfile } from "@/server/modules/parishes/service";
import { updateParishProfileInputSchema } from "@/server/modules/parishes/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function updateParishProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.DASHBOARD_PARISH_VIEW);

  try {
    const input = updateParishProfileInputSchema.parse({
      address: formData.get("address") || undefined,
      phone: formData.get("phone") || undefined,
      description: formData.get("description") || undefined,
      logoUrl: formData.get("logoUrl") || undefined,
    });

    await updateOwnParishProfile(session.membership.parishId, input);
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel");
  revalidatePath("/comunidade");
  return {};
}
