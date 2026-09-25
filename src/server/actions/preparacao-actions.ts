"use server";

import { revalidatePath } from "next/cache";
import type { SacramentType } from "@prisma/client";
import { requirePermission, requireSession } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { salvarPreparacao } from "@/server/modules/preparacao/service";
import { AppError } from "@/server/shared/errors";

export type PreparacaoState = { error?: string; ok?: string };

export async function salvarPreparacaoAction(_prev: PreparacaoState, formData: FormData): Promise<PreparacaoState> {
  const session = await requireSession();
  requirePermission(session, PERMISSIONS.SACRAMENTS_VALIDATE);
  try {
    await salvarPreparacao(session.membership!.parishId, String(formData.get("tipo") ?? "") as SacramentType, {
      orientacao: String(formData.get("orientacao") ?? ""),
      documentos: String(formData.get("documentos") ?? ""),
      encontros: String(formData.get("encontros") ?? ""),
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  revalidatePath("/painel/preparacao");
  revalidatePath("/preparacao/batismo");
  revalidatePath("/preparacao/casamento");
  return { ok: "Salvo. As famílias já veem a orientação nova." };
}
