"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession, requirePermission, podeAlcancar } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getOwnPriestProfile } from "@/server/modules/priests/service";
import { apagarPost, createPost, editarPost } from "@/server/modules/posts/service";
import { createPostInputSchema, editarPostSchema } from "@/server/modules/posts/schema";
import { AppError, ForbiddenError } from "@/server/shared/errors";

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

    await createPost({
      ...input,
      parishId: session.membership.parishId,
      priestProfileId: priest?.id ?? null,
      createdBy: session.userId,
    });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/inicio");
  revalidatePath("/comunidade");
  redirect("/comunidade");
}

/**
 * Quem está mexendo, do ponto de vista da Palavra.
 *
 * `podeAlcancar` e não `permissions.includes`: é a regra única de "esta
 * pessoa alcança isto?", e usar a versão curta aqui faria a tela e a guarda
 * divergirem — que é exatamente o defeito que ela existe para impedir.
 */
function quemEstaMexendo(session: Awaited<ReturnType<typeof requireSession>>) {
  return {
    userId: session.userId,
    administraPalavra: podeAlcancar(session, PERMISSIONS.POSTS_MANAGE),
  };
}

export async function editarPostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  try {
    const input = editarPostSchema.parse({
      postId: formData.get("postId"),
      contentText: formData.get("contentText") || undefined,
      mediaUrl: formData.get("mediaUrl") || undefined,
    });
    await editarPost({
      ...input,
      parishId: session.membership.parishId,
      quem: quemEstaMexendo(session),
    });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof ForbiddenError) {
      return { error: "Esta publicação é de outra pessoa." };
    }
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/inicio");
  revalidatePath("/comunidade");
  return {};
}

export async function apagarPostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  try {
    await apagarPost(
      session.membership.parishId,
      String(formData.get("postId") ?? ""),
      quemEstaMexendo(session),
    );
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: "Esta publicação é de outra pessoa." };
    }
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/inicio");
  revalidatePath("/comunidade");
  return {};
}
