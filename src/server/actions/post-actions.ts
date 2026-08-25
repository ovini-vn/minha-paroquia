"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getOwnPriestProfile } from "@/server/modules/priests/service";
import { createPost } from "@/server/modules/posts/service";
import { createPostInputSchema } from "@/server/modules/posts/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function createPostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.POSTS_CREATE);

  // Quem é clero assina o próprio post. Quem não é — secretaria,
  // administrador — publica em nome do pároco cadastrado na paróquia, e o
  // post fica sem perfil de sacerdote. A permissão acima já disse quem pode.
  const priest = await getOwnPriestProfile(session.membership.parishId, session.userId);

  try {
    const input = createPostInputSchema.parse({
      mediaType: formData.get("mediaType") || "texto",
      contentText: formData.get("contentText") || undefined,
      mediaUrl: formData.get("mediaUrl") || undefined,
    });

    await createPost({ ...input, parishId: session.membership.parishId, priestProfileId: priest?.id ?? null });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/inicio");
  revalidatePath("/comunidade");
  redirect("/comunidade");
}
