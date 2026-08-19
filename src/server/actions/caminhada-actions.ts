"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession } from "@/server/auth/guards";
import {
  registerMassParticipation,
  registerSacrament,
  registerConfession,
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
