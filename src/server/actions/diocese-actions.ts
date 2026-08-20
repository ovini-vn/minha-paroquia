"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requirePlatformAdmin, requireDioceseAccess } from "@/server/auth/guards";
import {
  createDiocese,
  setParishDiocese,
  assignDioceseMember,
  removeDioceseMember,
} from "@/server/modules/dioceses/service";
import { AppError } from "@/server/shared/errors";
import type { DioceseRole } from "@prisma/client";

export type ActionState = { error?: string; ok?: boolean };

/**
 * Criar dioceses e vincular paróquias a elas é operação de PLATAFORMA, não
 * de diocese: quem decide o mapa eclesiástico do sistema é o administrador.
 * Um bispo não pode anexar paróquias à própria diocese.
 */
export async function createDioceseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  requirePlatformAdmin(session);

  try {
    await createDiocese({
      name: (formData.get("name") as string) ?? "",
      state: formData.get("state") as string | null,
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/plataforma/dioceses");
  revalidatePath("/diocese");
  return { ok: true };
}

export async function setParishDioceseAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  requirePlatformAdmin(session);

  const parishId = formData.get("parishId") as string;
  const raw = formData.get("dioceseId") as string | null;
  const dioceseId = raw && raw !== "" ? raw : null;

  await setParishDiocese(parishId, dioceseId);
  revalidatePath("/plataforma/dioceses");
  revalidatePath("/diocese");
}

/**
 * Vincular alguém a uma diocese exige acesso À DIOCESE — o que inclui o
 * próprio bispo (pode nomear um administrador diocesano) e o admin da
 * plataforma. Não é operação exclusiva de plataforma.
 */
export async function assignDioceseMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const dioceseId = formData.get("dioceseId") as string;
  requireDioceseAccess(session, dioceseId);

  const role = (formData.get("role") as string) === "ADMINISTRADOR_DIOCESANO"
    ? "ADMINISTRADOR_DIOCESANO"
    : "BISPO";

  try {
    await assignDioceseMember(dioceseId, (formData.get("email") as string) ?? "", role as DioceseRole);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/plataforma/dioceses");
  revalidatePath(`/diocese/${dioceseId}`);
  return { ok: true };
}

export async function removeDioceseMemberAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const dioceseId = formData.get("dioceseId") as string;
  requireDioceseAccess(session, dioceseId);

  await removeDioceseMember(dioceseId, formData.get("userId") as string);
  revalidatePath("/plataforma/dioceses");
  revalidatePath(`/diocese/${dioceseId}`);
}
