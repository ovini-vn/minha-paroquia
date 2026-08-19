"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS, isFullAdmin } from "@/server/auth/rbac";
import {
  createGroup,
  enrollFamilyMember,
  createSession,
  recordAttendance,
  createRite,
  completeRite,
} from "@/server/modules/catequese/service";
import { createGroupInputSchema, createSessionInputSchema, createRiteInputSchema } from "@/server/modules/catequese/schema";
import { AppError } from "@/server/shared/errors";
import type { SessionContext } from "@/server/auth/session";

export type ActionState = { error?: string };

/** CATEQUESE_MANAGE enxerga tudo; só CATEQUESE_TEACH fica restrito à própria turma — mesmo padrão de Servir. */
function catechistScope(session: SessionContext): string | undefined {
  return isFullAdmin(session.membership!.roleCode) ? undefined : session.userId;
}

export async function createGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.CATEQUESE_MANAGE);

  try {
    const catechistUserId = formData.get("catechistUserId");
    const input = createGroupInputSchema.parse({
      name: formData.get("name"),
      year: formData.get("year"),
      catechistUserId: catechistUserId ? catechistUserId : undefined,
    });

    await createGroup({ ...input, parishId: session.membership.parishId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel/catequese");
  return {};
}

export async function enrollFamilyMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.CATEQUESE_MANAGE);

  const groupId = formData.get("groupId") as string;
  const familyMemberId = formData.get("familyMemberId") as string;
  if (!familyMemberId) return { error: "Escolha um dependente." };

  try {
    await enrollFamilyMember(session.membership.parishId, groupId, familyMemberId);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/painel/catequese/${groupId}`);
  return {};
}

export async function createSessionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  if (!session.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE) && !session.permissions.includes(PERMISSIONS.CATEQUESE_TEACH)) {
    return { error: "Você não tem permissão para isso." };
  }

  const groupId = formData.get("groupId") as string;

  try {
    const input = createSessionInputSchema.parse({
      date: formData.get("date"),
      topic: formData.get("topic") || undefined,
    });

    await createSession(session.membership.parishId, groupId, input, catechistScope(session));
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/eu/catequese/${groupId}`);
  return {};
}

export async function recordAttendanceAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  if (!session.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE) && !session.permissions.includes(PERMISSIONS.CATEQUESE_TEACH)) {
    return;
  }

  const sessionId = formData.get("sessionId") as string;
  const groupId = formData.get("groupId") as string;
  const enrollmentIds = formData.getAll("enrollmentId") as string[];
  const entries = enrollmentIds.map((enrollmentId) => ({
    enrollmentId,
    present: formData.get(`present_${enrollmentId}`) === "on",
  }));

  await recordAttendance(session.membership.parishId, sessionId, entries);
  revalidatePath(`/eu/catequese/${groupId}`);
}

export async function createRiteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  if (!session.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE) && !session.permissions.includes(PERMISSIONS.CATEQUESE_TEACH)) {
    return { error: "Você não tem permissão para isso." };
  }

  const enrollmentId = formData.get("enrollmentId") as string;

  try {
    const input = createRiteInputSchema.parse({
      name: formData.get("name"),
      scheduledAt: formData.get("scheduledAt") || undefined,
    });

    await createRite(session.membership.parishId, enrollmentId, input);
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/eu/catequese");
  return {};
}

export async function completeRiteAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  if (!session.permissions.includes(PERMISSIONS.CATEQUESE_MANAGE) && !session.permissions.includes(PERMISSIONS.CATEQUESE_TEACH)) {
    return;
  }

  const riteId = formData.get("riteId") as string;
  await completeRite(session.membership.parishId, riteId);
  revalidatePath("/eu/catequese");
}
