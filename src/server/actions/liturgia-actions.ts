"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  upsertAvailability,
  deleteAvailability,
  createSchedule,
  removeSchedule,
  confirmMySchedule,
} from "@/server/modules/liturgia/service";
import { createAvailabilityInputSchema, createScheduleInputSchema } from "@/server/modules/liturgia/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function upsertAvailabilityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  try {
    const weekdayPref = formData.get("weekdayPref");
    const input = createAvailabilityInputSchema.parse({
      roleType: formData.get("roleType"),
      weekdayPref: weekdayPref ? weekdayPref : undefined,
      notes: formData.get("notes") || undefined,
    });

    await upsertAvailability({ ...input, parishId: session.membership.parishId, userId: session.userId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/servir/liturgia");
  return {};
}

export async function deleteAvailabilityAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;

  const id = formData.get("id") as string;
  await deleteAvailability(session.membership.parishId, id, session.userId);
  revalidatePath("/servir/liturgia");
}

export async function createScheduleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.LITURGIA_MANAGE);

  const celebrationId = formData.get("celebrationId") as string;

  try {
    const input = createScheduleInputSchema.parse({
      roleType: formData.get("roleType"),
      userId: formData.get("userId"),
    });

    await createSchedule(session.membership.parishId, celebrationId, input);
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel/liturgia");
  return {};
}

export async function removeScheduleAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.LITURGIA_MANAGE);

  const id = formData.get("id") as string;
  await removeSchedule(session.membership.parishId, id);
  revalidatePath("/painel/liturgia");
}

export async function confirmScheduleAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;

  const id = formData.get("id") as string;
  await confirmMySchedule(session.membership.parishId, id, session.userId);
  revalidatePath("/servir/liturgia");
}
