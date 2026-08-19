"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { createInvitation, revokeInvitation } from "@/server/modules/invitations/service";
import { createInvitationInputSchema } from "@/server/modules/invitations/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function createInvitationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia para criar convites." };
  requirePermission(session, PERMISSIONS.INVITATIONS_CREATE);

  try {
    const expiresInDaysRaw = formData.get("expiresInDays");
    const input = createInvitationInputSchema.parse({
      type: formData.get("type") || "link",
      role: formData.get("role") || "FIEL",
      expiresInDays: expiresInDaysRaw ? Number(expiresInDaysRaw) : undefined,
    });

    await createInvitation({ ...input, parishId: session.membership.parishId, createdBy: session.userId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel");
  return {};
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.INVITATIONS_CREATE);

  const id = formData.get("id") as string;
  await revokeInvitation(session.membership.parishId, id);
  revalidatePath("/painel");
}
