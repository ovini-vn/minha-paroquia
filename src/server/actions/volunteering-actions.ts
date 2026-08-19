"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession } from "@/server/auth/guards";
import { upsertVolunteerProfile } from "@/server/modules/volunteering/service";
import { upsertVolunteerProfileInputSchema } from "@/server/modules/volunteering/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function upsertVolunteerProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  try {
    const input = upsertVolunteerProfileInputSchema.parse({
      hasTime: formData.get("hasTime") === "on",
      timeAreas: formData.getAll("timeAreas"),
      hasTalent: formData.get("hasTalent") === "on",
      talents: formData.getAll("talents"),
      wantsToServe: formData.get("wantsToServe") === "on",
      serviceAreas: formData.getAll("serviceAreas"),
      availabilityNote: formData.get("availabilityNote") || undefined,
      freeText: formData.get("freeText") || undefined,
    });

    await upsertVolunteerProfile({ ...input, parishId: session.membership.parishId, userId: session.userId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/servir");
  redirect("/servir");
}
