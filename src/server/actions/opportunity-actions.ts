"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS, isFullAdmin } from "@/server/auth/rbac";
import {
  createOpportunity,
  closeOpportunity,
  expressInterest,
  updateInterestStatus,
} from "@/server/modules/opportunities/service";
import { createOpportunityInputSchema, updateInterestStatusInputSchema } from "@/server/modules/opportunities/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function createOpportunityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.OPPORTUNITIES_MANAGE);

  try {
    const input = createOpportunityInputSchema.parse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      startsAt: formData.get("startsAt") || undefined,
    });

    await createOpportunity({ ...input, parishId: session.membership.parishId, createdBy: session.userId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel/servir");
  revalidatePath("/servir");
  return {};
}

export async function closeOpportunityAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.OPPORTUNITIES_MANAGE);

  const id = formData.get("id") as string;
  const createdByOnly = isFullAdmin(session.membership.roleCode) ? undefined : session.userId;
  await closeOpportunity(session.membership.parishId, id, createdByOnly);
  revalidatePath("/painel/servir");
  revalidatePath("/servir");
}

export async function expressInterestAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;

  const opportunityId = formData.get("opportunityId") as string;
  await expressInterest(session.membership.parishId, opportunityId, session.userId);
  revalidatePath("/servir");
}

export async function updateInterestStatusAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.OPPORTUNITIES_MANAGE);

  const parsed = updateInterestStatusInputSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const createdByOnly = isFullAdmin(session.membership.roleCode) ? undefined : session.userId;
  await updateInterestStatus(session.membership.parishId, parsed.data.id, parsed.data.status, createdByOnly);
  revalidatePath("/painel/servir");
}
