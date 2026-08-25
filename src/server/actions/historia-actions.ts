"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { updateParishHistoria } from "@/server/modules/parishes/service";
import { uploadImagem } from "@/server/modules/uploads/service";
import { AppError } from "@/server/shared/errors";

export type HistoriaState = { error?: string; ok?: string };

/** Um memorial é longo, mas não é um livro: o limite existe para o dia em
 *  que alguém colar a internet inteira na caixa de texto. */
const LIMITE = 60_000;

export async function salvarHistoriaAction(
  _prev: HistoriaState,
  formData: FormData,
): Promise<HistoriaState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.DASHBOARD_PARISH_VIEW);

  const historia = String(formData.get("historia") ?? "").trim();
  if (historia.length > LIMITE) {
    return { error: "O texto passou do tamanho máximo. Divida a história em partes." };
  }

  try {
    // Arquivo enviado ganha do link digitado: quem acabou de escolher uma
    // foto quer aquela foto, não a que já estava no campo.
    const arquivo = formData.get("fotoFile");
    const enviada =
      arquivo instanceof File && arquivo.size > 0
        ? await uploadImagem(session.membership.parishId, arquivo, "historia")
        : null;
    const fotoUrl = enviada ?? String(formData.get("fotoUrl") ?? "").trim();

    await updateParishHistoria(session.membership.parishId, {
      historia: historia || null,
      historiaFotoUrl: fotoUrl || null,
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/historia");
  revalidatePath("/painel/historia");
  revalidatePath("/comunidade");
  return { ok: "História salva." };
}
