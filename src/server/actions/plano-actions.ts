"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requirePermission, requireSession } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  apagarPlano,
  apagarSecao,
  criarPlano,
  criarSecao,
  definirPublicacao,
  editarPlano,
  editarSecao,
  moverSecao,
} from "@/server/modules/plano/service";
import {
  criarPlanoSchema,
  criarSecaoSchema,
  editarPlanoSchema,
  editarSecaoSchema,
} from "@/server/modules/plano/schema";
import { AppError, ForbiddenError } from "@/server/shared/errors";

export type ActionState = { error?: string; ok?: boolean };

/**
 * Quem pode escrever o plano, e a paróquia em que está.
 *
 * Repetido em toda ação de propósito: a guarda mora no servidor, e uma tela
 * que esconde o botão não é guarda nenhuma — o formulário continua sendo
 * enviável por quem souber o endereço.
 */
async function exigirQuemEscreve() {
  const session = await requireSession();
  requirePermission(session, PERMISSIONS.PLANO_MANAGE);
  if (!session.membership) throw new ForbiddenError();
  return { parishId: session.membership.parishId, userId: session.userId };
}

/** Traduz o erro para quem está na tela, sem vazar detalhe de banco. */
function comoErro(erro: unknown): ActionState {
  if (erro instanceof ZodError) {
    return { error: erro.issues[0]?.message ?? "Confira os campos." };
  }
  if (erro instanceof AppError) return { error: erro.message };
  throw erro;
}

function recarregar() {
  revalidatePath("/painel/plano");
  revalidatePath("/plano");
}

export async function criarPlanoAction(
  _estado: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { parishId, userId } = await exigirQuemEscreve();
    const dados = criarPlanoSchema.parse({
      ano: formData.get("ano"),
      titulo: formData.get("titulo"),
      introducao: formData.get("introducao") || undefined,
    });
    await criarPlano({ ...dados, parishId, createdBy: userId });
    recarregar();
    return { ok: true };
  } catch (erro) {
    return comoErro(erro);
  }
}

export async function editarPlanoAction(
  _estado: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { parishId } = await exigirQuemEscreve();
    const dados = editarPlanoSchema.parse({
      planoId: formData.get("planoId"),
      ano: formData.get("ano"),
      titulo: formData.get("titulo"),
      introducao: formData.get("introducao") || undefined,
    });
    await editarPlano({ ...dados, parishId });
    recarregar();
    return { ok: true };
  } catch (erro) {
    return comoErro(erro);
  }
}

export async function criarSecaoAction(
  _estado: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { parishId } = await exigirQuemEscreve();
    const dados = criarSecaoSchema.parse({
      planoId: formData.get("planoId"),
      rotulo: formData.get("rotulo") || undefined,
      titulo: formData.get("titulo"),
      corpo: formData.get("corpo"),
    });
    await criarSecao({ ...dados, parishId });
    recarregar();
    return { ok: true };
  } catch (erro) {
    return comoErro(erro);
  }
}

/**
 * Salvar ou apagar a seção, no mesmo formulário.
 *
 * Apagar por engano ao mirar em "salvar" é o acidente que a separação de
 * botões evita — por isso o botão de apagar fica afastado, e não porque a
 * ação seja diferente.
 */
export async function editarSecaoAction(
  _estado: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { parishId } = await exigirQuemEscreve();
    const secaoId = String(formData.get("secaoId") ?? "");

    if (formData.get("apagar") === "sim") {
      await apagarSecao(parishId, secaoId);
      recarregar();
      return { ok: true };
    }

    const dados = editarSecaoSchema.parse({
      secaoId,
      rotulo: formData.get("rotulo") || undefined,
      titulo: formData.get("titulo"),
      corpo: formData.get("corpo"),
    });
    await editarSecao({ ...dados, parishId });
    recarregar();
    return { ok: true };
  } catch (erro) {
    return comoErro(erro);
  }
}

export async function moverSecaoAction(formData: FormData): Promise<void> {
  const { parishId } = await exigirQuemEscreve();
  const direcao = formData.get("direcao") === "cima" ? "cima" : "baixo";
  await moverSecao(parishId, String(formData.get("secaoId") ?? ""), direcao);
  recarregar();
}

export async function definirPublicacaoAction(formData: FormData): Promise<void> {
  const { parishId } = await exigirQuemEscreve();
  await definirPublicacao(
    parishId,
    String(formData.get("planoId") ?? ""),
    formData.get("publicado") === "sim",
  );
  recarregar();
}

export async function apagarPlanoAction(
  _estado: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { parishId } = await exigirQuemEscreve();
    const planoId = String(formData.get("planoId") ?? "");
    const confirmacao = String(formData.get("confirmacao") ?? "").trim();
    const ano = String(formData.get("ano") ?? "").trim();

    // Digitar o ANO obriga a pessoa a ter olhado qual plano está apagando.
    // "Tem certeza?" se clica no automático; isto, não.
    if (confirmacao !== ano) {
      return { error: `Digite ${ano} para confirmar a exclusão.` };
    }

    await apagarPlano(parishId, planoId);
    recarregar();
    return { ok: true };
  } catch (erro) {
    return comoErro(erro);
  }
}
