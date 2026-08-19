"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  registerMassParticipation,
  registerSacrament,
  registerConfession,
  setSacramentValidation,
} from "@/server/modules/caminhada/service";
import {
  registerMassParticipationInputSchema,
  registerSacramentInputSchema,
  registerConfessionInputSchema,
} from "@/server/modules/caminhada/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function registerMassParticipationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  try {
    const input = registerMassParticipationInputSchema.parse({
      participatedAt: formData.get("participatedAt"),
      reflectionText: formData.get("reflectionText") || undefined,
    });

    await registerMassParticipation({ ...input, parishId: session.membership.parishId, userId: session.userId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/caminhada");
  redirect("/caminhada");
}

export async function registerSacramentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  try {
    const priestProfileId = formData.get("priestProfileId");
    const input = registerSacramentInputSchema.parse({
      type: formData.get("type"),
      date: formData.get("date"),
      location: formData.get("location") || undefined,
      priestProfileId: priestProfileId ? priestProfileId : undefined,
      note: formData.get("note") || undefined,
    });

    await registerSacrament({ ...input, parishId: session.membership.parishId, userId: session.userId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/caminhada");
  redirect("/caminhada");
}

export async function registerConfessionAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;

  const input = registerConfessionInputSchema.parse({ date: formData.get("date") });
  await registerConfession({ ...input, parishId: session.membership.parishId, userId: session.userId });
  revalidatePath("/caminhada");
}

export async function setSacramentValidationAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.SACRAMENTS_VALIDATE);

  const id = formData.get("id") as string;
  const validated = formData.get("validated") === "true";
  await setSacramentValidation(session.membership.parishId, id, validated, session.userId);
  revalidatePath("/painel/sacramentos");
}
