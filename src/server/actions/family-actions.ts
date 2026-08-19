"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession } from "@/server/auth/guards";
import { createFamilyMember } from "@/server/modules/family/service";
import { createFamilyMemberInputSchema } from "@/server/modules/family/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function createFamilyMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  try {
    const input = createFamilyMemberInputSchema.parse({
      fullName: formData.get("fullName"),
      relationship: formData.get("relationship"),
      birthDate: formData.get("birthDate") || undefined,
    });

    await createFamilyMember({ ...input, parishId: session.membership.parishId, responsibleUserId: session.userId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/eu/familia");
  return {};
}
