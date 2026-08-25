"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getParoco, updatePriestProfile } from "@/server/modules/priests/service";
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

  // Quem é o pároco vem do papel, nunca do formulário: assim um id enviado
  // de fora não consegue reescrever o perfil de outro sacerdote.
  const paroco = await getParoco(parishId);
  if (!paroco) {
    return {
      error:
        "Nenhum pároco definido nesta paróquia. Defina o papel de Pároco em Membros e papéis primeiro.",
    };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Informe o título — por exemplo, Pároco." };
  if (title.length > 80) return { error: "O título ficou longo demais." };

  const bio = String(formData.get("bio") ?? "").trim();
  if (bio.length > LIMITE) return { error: "O texto passou do tamanho máximo." };

  try {
    const arquivo = formData.get("fotoFile");
    const enviada =
      arquivo instanceof File && arquivo.size > 0
        ? await uploadImagem(parishId, arquivo, "sacerdotes")
        : null;
    const photoUrl = enviada ?? String(formData.get("photoUrl") ?? "").trim();

    await updatePriestProfile(parishId, paroco.id, {
      title,
      bio: bio || null,
      photoUrl: photoUrl || null,
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/paroco");
  revalidatePath("/painel/paroco");
  revalidatePath("/comunidade");
  return { ok: "Perfil do pároco salvo." };
}
