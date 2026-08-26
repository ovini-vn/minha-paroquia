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
  updateCelebrationSchedule,
} from "@/server/modules/celebrations/service";
import {
  createCelebrationInputSchema,
  createCelebrationScheduleInputSchema,
} from "@/server/modules/celebrations/schema";
import { createEvent, updateEvent, setEventStatus, deleteEvent } from "@/server/modules/events/service";
import { createEventInputSchema, updateEventInputSchema } from "@/server/modules/events/schema";
import { AppError } from "@/server/shared/errors";
import { uploadImagem } from "@/server/modules/uploads/service";

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

/**
 * Resolve o cartaz do evento: arquivo enviado tem prioridade sobre link
 * digitado. Se a pessoa fez as duas coisas, ela acabou de escolher um
 * arquivo — é o que ela quer.
 *
 * Devolve undefined quando não há nada, para o schema tratar como opcional.
 */
async function resolverCartaz(parishId: string, formData: FormData): Promise<string | undefined> {
  const arquivo = formData.get("imageFile");
  if (arquivo instanceof File && arquivo.size > 0) {
    return uploadImagem(parishId, arquivo, "eventos");
  }
  return (formData.get("imageUrl") as string) || undefined;
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
      imageUrl: await resolverCartaz(session.membership.parishId, formData),
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
      imageUrl: await resolverCartaz(session.membership.parishId, formData),
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

export async function updateCelebrationScheduleAction(
  _prev: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.AGENDA_MANAGE);

  const scheduleId = String(formData.get("scheduleId") ?? "");
  if (!scheduleId) return { error: "Repetição não informada." };

  let resultado: Awaited<ReturnType<typeof updateCelebrationSchedule>>;
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

    resultado = await updateCelebrationSchedule(session.membership.parishId, scheduleId, input);
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel/missas");
  revalidatePath("/painel/liturgia");
  revalidatePath("/painel");
  revalidatePath("/agenda");
  revalidatePath("/comunidade");
  revalidatePath("/inicio");

  // A mensagem diz o que aconteceu com as datas já na agenda: a secretaria
  // precisa saber se alguma ficou para trás no horário antigo.
  if (resultado.mantidasNoHorarioAntigo > 0) {
    const n = resultado.mantidasNoHorarioAntigo;
    return {
      ok: `Horário corrigido — ${resultado.criadas} ${resultado.criadas === 1 ? "data lançada" : "datas lançadas"}. ${n} ${n === 1 ? "data ficou" : "datas ficaram"} no horário antigo por ter escala ou participação registrada; ajuste ou cancele em Missas e celebrações.`,
    };
  }
  if (resultado.criadas > 0) {
    return {
      ok: `Horário corrigido — ${resultado.criadas} ${resultado.criadas === 1 ? "data refeita" : "datas refeitas"} na agenda.`,
    };
  }
  return {
    ok:
      resultado.atualizadas > 0
        ? `Corrigido — ${resultado.atualizadas} ${resultado.atualizadas === 1 ? "data atualizada" : "datas atualizadas"} na agenda.`
        : "Corrigido.",
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

/** Apagar de vez — para duplicata e teste, não para evento que já aconteceu. */
export async function excluirEventoAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.AGENDA_MANAGE);

  const id = formData.get("id") as string;
  if (!id) return;
  await deleteEvent(session.membership.parishId, id);

  revalidatePath("/painel/eventos");
  revalidatePath("/painel");
  revalidatePath("/agenda");
  revalidatePath("/comunidade");
  revalidatePath("/inicio");
}
