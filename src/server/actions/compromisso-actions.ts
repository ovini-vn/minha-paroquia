"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/guards";
import { responderEncontro, responderEvento } from "@/server/modules/compromissos/service";
import { AppError } from "@/server/shared/errors";

export type RespostaState = { error?: string; vai?: boolean };

/** "Vou" ou "não posso" num encontro do grupo. */
export async function responderEncontroAction(_prev: RespostaState, formData: FormData): Promise<RespostaState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  const vai = formData.get("vai") === "sim";
  try {
    const groupId = await responderEncontro(
      session.membership.parishId,
      session.userId,
      String(formData.get("alvoId") ?? ""),
      vai,
    );
    revalidatePath(`/comunidade/pastorais/${groupId}`);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  revalidatePath("/eu/compromissos");
  return { vai };
}

/** "Vou" ou "não posso" num evento da paróquia. */
export async function responderEventoAction(_prev: RespostaState, formData: FormData): Promise<RespostaState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  const vai = formData.get("vai") === "sim";
  try {
    await responderEvento(session.membership.parishId, session.userId, String(formData.get("alvoId") ?? ""), vai);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  revalidatePath("/agenda");
  revalidatePath("/painel/eventos");
  return { vai };
}
