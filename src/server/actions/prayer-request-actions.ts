"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession } from "@/server/auth/guards";
import { createPrayerRequest } from "@/server/modules/prayer-requests/service";
import { createPrayerRequestInputSchema } from "@/server/modules/prayer-requests/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function createPrayerRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  try {
    const input = createPrayerRequestInputSchema.parse({
      contentText: formData.get("contentText"),
      visibility: formData.get("visibility") || "padre",
      isAnonymous: formData.get("isAnonymous") === "on",
    });

    await createPrayerRequest({ ...input, parishId: session.membership.parishId, userId: session.userId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/comunidade/oracao");
  return {};
}
