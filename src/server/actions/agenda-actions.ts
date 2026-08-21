"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  createCelebration,
  createCelebrationSchedule,
  deactivateCelebrationSchedule,
  setCelebrationCanceled,
} from "@/server/modules/celebrations/service";
import {
  createCelebrationInputSchema,
  createCelebrationScheduleInputSchema,
} from "@/server/modules/celebrations/schema";
import { createEvent, updateEvent, setEventStatus } from "@/server/modules/events/service";
import { createEventInputSchema, updateEventInputSchema } from "@/server/modules/events/schema";
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

export async function updateEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.AGENDA_MANAGE);

  const id = formData.get("id") as string;

  try {
    const input = updateEventInputSchema.parse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      startsAt: formData.get("startsAt"),
      location: formData.get("location") || undefined,
    });

    await updateEvent(session.membership.parishId, id, input);
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel/eventos");
  revalidatePath("/painel");
  revalidatePath("/comunidade");
  redirect("/painel/eventos");
}

export async function setEventStatusAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.AGENDA_MANAGE);

  const id = formData.get("id") as string;
  const status = formData.get("status") as "published" | "archived";
  await setEventStatus(session.membership.parishId, id, status);

  revalidatePath("/painel/eventos");
  revalidatePath("/painel");
  revalidatePath("/comunidade");
}

export type ScheduleActionState = { error?: string; ok?: string };

/**
 * Cria a regra de repetição e já materializa as próximas ocorrências.
 *
 * Devolve quantas foram criadas em vez de só "salvou": a diferença entre
 * "criei a regra" e "as missas já estão na agenda" é justamente o que a
 * secretaria precisa enxergar para confiar no recurso.
 */
export async function createCelebrationScheduleAction(
  _prev: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.AGENDA_MANAGE);

  let criadas = 0;
  try {
    const priestProfileId = formData.get("priestProfileId");
    const weekOfMonth = formData.get("weekOfMonth");
    const endsOn = formData.get("endsOn");

    const input = createCelebrationScheduleInputSchema.parse({
      type: formData.get("type") || "missa",
      title: formData.get("title") || undefined,
      location: formData.get("location") || undefined,
      priestProfileId: priestProfileId ? priestProfileId : undefined,
      frequency: formData.get("frequency"),
      weekday: formData.get("weekday"),
      weekOfMonth: weekOfMonth ? weekOfMonth : undefined,
      timeMinutes: formData.get("timeMinutes"),
      startsOn: formData.get("startsOn"),
      endsOn: endsOn ? endsOn : undefined,
    });

    const resultado = await createCelebrationSchedule({
      ...input,
      parishId: session.membership.parishId,
      createdBy: session.userId,
    });
    criadas = resultado.criadas;
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel/liturgia");
  revalidatePath("/painel");
  revalidatePath("/agenda");
  revalidatePath("/comunidade");
  revalidatePath("/inicio");

  return {
    ok:
      criadas === 0
        ? "Repetição criada. Nenhuma data caiu no período à frente ainda."
        : `Repetição criada — ${criadas} ${criadas === 1 ? "data lançada" : "datas lançadas"} na agenda.`,
  };
}

export async function deactivateCelebrationScheduleAction(
  _prev: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.AGENDA_MANAGE);

  const scheduleId = formData.get("scheduleId") as string;
  if (!scheduleId) return { error: "Repetição não informada." };

  let resultado: { removidas: number; mantidas: number };
  try {
    resultado = await deactivateCelebrationSchedule(session.membership.parishId, scheduleId);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel/liturgia");
  revalidatePath("/painel");
  revalidatePath("/agenda");
  revalidatePath("/comunidade");
  revalidatePath("/inicio");

  // Diz o que ficou de pé, e por quê — senão parece que a desativação
  // funcionou pela metade.
  return {
    ok:
      resultado.mantidas > 0
        ? `Repetição encerrada. ${resultado.removidas} data(s) futura(s) removida(s); ${resultado.mantidas} continuam na agenda porque já têm escala ou presença registrada.`
        : `Repetição encerrada. ${resultado.removidas} data(s) futura(s) removida(s).`,
  };
}

/** Cancela ou reabre UMA data — "neste feriado não vai ter". */
export async function toggleCelebrationCanceledAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.AGENDA_MANAGE);

  const id = formData.get("celebrationId") as string;
  const canceled = formData.get("canceled") === "true";
  if (!id) return;

  await setCelebrationCanceled(session.membership.parishId, id, canceled);

  revalidatePath("/painel/liturgia");
  revalidatePath("/painel");
  revalidatePath("/agenda");
  revalidatePath("/comunidade");
  revalidatePath("/inicio");
}
