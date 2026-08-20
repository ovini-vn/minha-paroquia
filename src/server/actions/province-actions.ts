"use server";

import { revalidatePath } from "next/cache";
import {
  requireSession,
  requirePlatformAdmin,
  requireProvinceAccess,
} from "@/server/auth/guards";
import {
  createProvince,
  setDioceseProvince,
  setArchdiocese,
  assignProvinceMember,
  removeProvinceMember,
  grantNationalScope,
  revokeNationalScope,
} from "@/server/modules/provinces/service";
import { AppError } from "@/server/shared/errors";
import type { ProvinceRole, NationalRole } from "@prisma/client";

export type ActionState = { error?: string; ok?: boolean };

/** Desenhar o mapa eclesiástico é operação de plataforma. */
export async function createProvinceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  requirePlatformAdmin(session);

  try {
    await createProvince({ name: (formData.get("name") as string) ?? "" });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/plataforma/estrutura");
  revalidatePath("/nacional");
  return { ok: true };
}

export async function setDioceseProvinceAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  requirePlatformAdmin(session);

  const raw = formData.get("provinceId") as string | null;
  await setDioceseProvince(formData.get("dioceseId") as string, raw && raw !== "" ? raw : null);

  revalidatePath("/plataforma/estrutura");
  revalidatePath("/nacional");
}

export async function setArchdioceseAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  requirePlatformAdmin(session);

  await setArchdiocese(formData.get("dioceseId") as string);
  revalidatePath("/plataforma/estrutura");
  revalidatePath("/nacional");
}

/**
 * Vincular alguém a uma província exige acesso À PROVÍNCIA — o que inclui o
 * próprio arcebispo (pode nomear um administrador provincial) e o admin da
 * plataforma.
 */
export async function assignProvinceMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const provinceId = formData.get("provinceId") as string;
  requireProvinceAccess(session, provinceId);

  const role =
    (formData.get("role") as string) === "ADMINISTRADOR_PROVINCIAL"
      ? "ADMINISTRADOR_PROVINCIAL"
      : "ARCEBISPO_METROPOLITA";

  try {
    await assignProvinceMember(provinceId, (formData.get("email") as string) ?? "", role as ProvinceRole);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/plataforma/estrutura");
  revalidatePath(`/provincia/${provinceId}`);
  return { ok: true };
}

export async function removeProvinceMemberAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const provinceId = formData.get("provinceId") as string;
  requireProvinceAccess(session, provinceId);

  await removeProvinceMember(provinceId, formData.get("userId") as string);
  revalidatePath("/plataforma/estrutura");
  revalidatePath(`/provincia/${provinceId}`);
}

/**
 * Escopo nacional só pode ser concedido pelo admin da plataforma. É o acesso
 * mais amplo do sistema — não delegamos essa concessão a nenhum outro nível.
 */
export async function grantNationalScopeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  requirePlatformAdmin(session);

  const role =
    (formData.get("role") as string) === "PRESIDENTE_CNBB"
      ? "PRESIDENTE_CNBB"
      : "OBSERVADOR_NACIONAL";

  try {
    await grantNationalScope((formData.get("email") as string) ?? "", role as NationalRole);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/plataforma/estrutura");
  return { ok: true };
}

export async function revokeNationalScopeAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  requirePlatformAdmin(session);

  await revokeNationalScope(formData.get("userId") as string);
  revalidatePath("/plataforma/estrutura");
}
