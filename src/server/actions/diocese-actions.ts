"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { redirect } from "next/navigation";
import { requireSession, requirePlatformAdmin, requireDioceseAccess } from "@/server/auth/guards";
import { focarParoquia, sairDoFoco } from "@/server/auth/foco-da-plataforma";
import {
  createDiocese,
  setParishDiocese,
  assignDioceseMember,
  removeDioceseMember,
} from "@/server/modules/dioceses/service";
import { criarParoquia } from "@/server/modules/parishes/service";
import { criarPrimeiroAcesso } from "@/server/modules/implantacao/service";
import { enderecoDoApp } from "@/server/http/endereco-do-app";
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

/**
 * Abrir uma paróquia nova no app. Operação de plataforma, como a diocese:
 * é quem administra o sistema que decide o mapa eclesiástico dele.
 */
export async function createParishAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  requirePlatformAdmin(session);

  try {
    await criarParoquia({
      name: (formData.get("name") as string) ?? "",
      city: (formData.get("city") as string) ?? "",
      state: (formData.get("state") as string) ?? "",
      dioceseId: (formData.get("dioceseId") as string) || null,
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    throw error;
  }

  revalidatePath("/plataforma/dioceses");
  revalidatePath("/diocese");
  revalidatePath("/escolher-paroquia");
  return { ok: true };
}

/**
 * Abrir o painel de uma paróquia sem mudar de vínculo (ver
 * auth/foco-da-plataforma.ts). Só administrador da plataforma.
 */
export async function abrirPainelDaParoquiaAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  requirePlatformAdmin(session);

  const parishId = formData.get("parishId") as string;
  if (parishId) await focarParoquia(parishId);

  revalidatePath("/", "layout");
  redirect("/painel");
}

export async function sairDoFocoAction(): Promise<void> {
  await sairDoFoco();
  revalidatePath("/", "layout");
  redirect("/plataforma/dioceses");
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
  await requireDioceseAccess(session, dioceseId);

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
  await requireDioceseAccess(session, dioceseId);

  await removeDioceseMember(dioceseId, formData.get("userId") as string);
  revalidatePath("/plataforma/dioceses");
  revalidatePath(`/diocese/${dioceseId}`);
}

export type PrimeiroAcessoState = {
  error?: string;
  link?: string;
  nome?: string;
  expiraEm?: string;
  jaTinhaConta?: boolean;
};

/**
 * O primeiro acesso de quem vai administrar uma paróquia (ver
 * modules/implantacao). O link volta na tela para ser copiado e mandado —
 * o e-mail da plataforma ainda não tem domínio verificado.
 */
export async function criarPrimeiroAcessoAction(
  _prev: PrimeiroAcessoState,
  formData: FormData,
): Promise<PrimeiroAcessoState> {
  const session = await requireSession();
  requirePlatformAdmin(session);

  try {
    const acesso = await criarPrimeiroAcesso({
      parishId: String(formData.get("parishId") ?? ""),
      nome: String(formData.get("nome") ?? ""),
      email: String(formData.get("email") ?? ""),
      papel: String(formData.get("papel") ?? ""),
      criadoPor: session.userId,
    });
    return {
      link: `${await enderecoDoApp()}${acesso.caminho}`,
      nome: acesso.nome,
      expiraEm: acesso.expiraEm.toISOString(),
      jaTinhaConta: acesso.jaTinhaConta,
    };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}
