"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { updateParishParoco } from "@/server/modules/parishes/service";
import { uploadImagem } from "@/server/modules/uploads/service";
import { AppError } from "@/server/shared/errors";

export type ParocoState = { error?: string; ok?: string };

const LIMITE = 20_000;

export async function salvarParocoAction(
  _prev: ParocoState,
  formData: FormData,
): Promise<ParocoState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.DASHBOARD_PARISH_VIEW);

  const parishId = session.membership.parishId;

  const parocoNome = String(formData.get("parocoNome") ?? "").trim();
  if (parocoNome.length > 120) return { error: "O nome ficou longo demais." };

  const parocoTitulo = String(formData.get("parocoTitulo") ?? "").trim();
  if (parocoTitulo.length > 80) return { error: "O título ficou longo demais." };

  const parocoHistoria = String(formData.get("parocoHistoria") ?? "").trim();
  if (parocoHistoria.length > LIMITE) return { error: "O texto passou do tamanho máximo." };

  try {
    // Arquivo enviado ganha do link digitado: quem acabou de escolher uma
    // foto quer aquela foto.
    const arquivo = formData.get("fotoFile");
    const enviada =
      arquivo instanceof File && arquivo.size > 0
        ? await uploadImagem(parishId, arquivo, "paroco")
        : null;
    const parocoFotoUrl = enviada ?? String(formData.get("parocoFotoUrl") ?? "").trim();

    await updateParishParoco(parishId, {
      parocoNome: parocoNome || null,
      parocoTitulo: parocoTitulo || null,
      parocoHistoria: parocoHistoria || null,
      parocoFotoUrl: parocoFotoUrl || null,
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/paroco");
  revalidatePath("/painel/paroco");
  revalidatePath("/comunidade");
  return { ok: "Apresentação do pároco salva." };
}
