"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireSession } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  apagarIntencao,
  confirmarIntencao,
  pedirIntencao,
  registrarNoBalcao,
  retirarMeuPedido,
} from "@/server/modules/intencoes/service";
import { AppError } from "@/server/shared/errors";

export type IntencaoState = { error?: string; ok?: string };

function campos(formData: FormData) {
  return {
    celebrationId: String(formData.get("celebrationId") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    texto: String(formData.get("texto") ?? ""),
  };
}

function atualizar() {
  revalidatePath("/intencoes");
  revalidatePath("/painel/intencoes");
}

/** O fiel pede uma intenção pelo app. */
export async function pedirIntencaoAction(_prev: IntencaoState, formData: FormData): Promise<IntencaoState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  try {
    await pedirIntencao(session.membership.parishId, session.userId, campos(formData));
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  atualizar();
  return { ok: "Pedido enviado. A secretaria confere e põe no rol da missa." };
}

export async function retirarMeuPedidoAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  await retirarMeuPedido(session.membership.parishId, session.userId, String(formData.get("intencaoId") ?? ""));
  atualizar();
}

/** A secretaria registra no balcão — já entra no rol. */
export async function registrarNoBalcaoAction(_prev: IntencaoState, formData: FormData): Promise<IntencaoState> {
  const session = await requireSession();
  requirePermission(session, PERMISSIONS.AGENDA_MANAGE);
  try {
    await registrarNoBalcao(session.membership!.parishId, session.userId, {
      ...campos(formData),
      pedidoPorNome: String(formData.get("pedidoPorNome") ?? ""),
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  atualizar();
  return { ok: "Intenção registrada no rol." };
}

export async function confirmarIntencaoAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  requirePermission(session, PERMISSIONS.AGENDA_MANAGE);
  try {
    await confirmarIntencao(session.membership!.parishId, String(formData.get("intencaoId") ?? ""), session.userId);
  } catch (error) {
    // Outra pessoa da secretaria conferiu antes: nada a fazer.
    if (!(error instanceof AppError)) throw error;
  }
  atualizar();
}

export async function apagarIntencaoAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  requirePermission(session, PERMISSIONS.AGENDA_MANAGE);
  await apagarIntencao(session.membership!.parishId, String(formData.get("intencaoId") ?? ""));
  atualizar();
}
