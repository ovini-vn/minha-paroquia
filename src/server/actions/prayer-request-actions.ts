"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { createPrayerRequest, moderatePrayerRequest } from "@/server/modules/prayer-requests/service";
import { createPrayerRequestInputSchema } from "@/server/modules/prayer-requests/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function createPrayerRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  try {
    const input = createPrayerRequestInputSchema.parse({
      contentText: formData.get("contentText"),
      visibility: formData.get("visibility") || "padre",
      isAnonymous: formData.get("isAnonymous") === "on",
    });

    await createPrayerRequest({ ...input, parishId: session.membership.parishId, userId: session.userId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/comunidade/oracao");
  return {};
}

/**
 * Aprovar ou recusar um pedido do mural.
 *
 * Guardado por permissão própria, e não pelo papel: assim o pároco pode
 * delegar isso a quem ele quiser em Delegar permissões, sem entregar junto
 * o resto do painel.
 */
export async function moderarPedidoDeOracaoAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.PRAYER_REQUESTS_MODERATE);

  const id = String(formData.get("id") ?? "");
  const decisao = formData.get("decisao");
  if (!id || (decisao !== "aprovar" && decisao !== "recusar")) return;

  await moderatePrayerRequest(
    session.membership.parishId,
    id,
    decisao === "aprovar" ? "aprovado" : "recusado",
    session.userId,
  );

  revalidatePath("/comunidade/oracao");
  revalidatePath("/painel/oracao");
  revalidatePath("/painel");
}
