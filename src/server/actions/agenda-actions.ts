"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { createCelebration } from "@/server/modules/celebrations/service";
import { createCelebrationInputSchema } from "@/server/modules/celebrations/schema";
import { createEvent } from "@/server/modules/events/service";
import { createEventInputSchema } from "@/server/modules/events/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function createCelebrationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.AGENDA_MANAGE);

  try {
    const priestProfileId = formData.get("priestProfileId");
    const input = createCelebrationInputSchema.parse({
      type: formData.get("type") || "missa",
      title: formData.get("title") || undefined,
      startsAt: formData.get("startsAt"),
      location: formData.get("location") || undefined,
      priestProfileId: priestProfileId ? priestProfileId : undefined,
    });

    await createCelebration({ ...input, parishId: session.membership.parishId, createdBy: session.userId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel");
  revalidatePath("/comunidade");
  revalidatePath("/inicio");
  return {};
}

export async function createEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.AGENDA_MANAGE);

  try {
    const input = createEventInputSchema.parse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      startsAt: formData.get("startsAt"),
      location: formData.get("location") || undefined,
    });

    await createEvent({ ...input, parishId: session.membership.parishId, createdBy: session.userId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel");
  revalidatePath("/comunidade");
  return {};
}
