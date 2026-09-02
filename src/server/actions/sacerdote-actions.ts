"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  apagarHorarioDoSacerdote,
  apagarSacerdoteSemConta,
  cadastrarSacerdoteSemConta,
  criarHorarioDoSacerdote,
  definirOQueAtendeSemConta,
} from "@/server/modules/priests/service";
import { createAvailabilityInputSchema } from "@/server/modules/availability/schema";
import { AppError } from "@/server/shared/errors";
import { ZodError } from "zod";

export type ActionState = { error?: string; ok?: string };

/*
 * Permissão de CONVIDAR, e não uma nova.
 *
 * É a mesma operação do ponto de vista da paróquia — pôr um sacerdote na
 * comunidade —, e quem convida já é quem faz isso hoje pelo vínculo
 * "Sacerdote". Criar um código de permissão só para este caso obrigaria a
 * conceder mais uma coisa a quem já pode fazer a versão com conta.
 */
function telasQueMudam() {
  revalidatePath("/painel");
  revalidatePath("/painel/sacerdotes", "layout");
  revalidatePath("/comunidade");
  revalidatePath("/comunidade/sacerdotes");
}

export async function cadastrarSacerdoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.INVITATIONS_CREATE);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Escreva o nome do sacerdote." };

  try {
    await cadastrarSacerdoteSemConta(session.membership.parishId, {
      nome,
      title: String(formData.get("title") ?? "").trim() || "Sacerdote",
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  telasQueMudam();
  return { ok: `${nome} agora aparece em "Falar com um sacerdote".` };
}

/**
 * O que um sacerdote sem conta atende, definido pela secretaria.
 *
 * Caixas lidas por PRESENÇA (`=== "sim"`): uma caixa desmarcada não é
 * enviada pelo navegador, e comparar com "false" nunca acertaria.
 */
export async function definirOQueAtendeSemContaAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.INVITATIONS_CREATE);

  try {
    await definirOQueAtendeSemConta(
      session.membership.parishId,
      String(formData.get("id") ?? ""),
      {
        ofereceAtendimento: formData.get("ofereceAtendimento") === "sim",
        ofereceConfissao: formData.get("ofereceConfissao") === "sim",
      },
    );
  } catch {
    return;
  }

  telasQueMudam();
}

/**
 * A secretaria publica um horário POR um sacerdote sem conta.
 *
 * Reusa o schema de "Minha disponibilidade" — o mesmo formulário nas duas
 * mãos precisa aceitar exatamente os mesmos valores, senão a secretaria
 * consegue gravar uma janela que o padre não conseguiria.
 *
 * Quem confere que ele realmente não tem conta é o serviço, e não esta
 * função: a regra tem de morar onde o dado é escrito.
 */
export async function criarHorarioDoSacerdoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.INVITATIONS_CREATE);

  const priestProfileId = String(formData.get("priestProfileId") ?? "");
  if (!priestProfileId) return { error: "Sacerdote não informado." };

  try {
    const janela = createAvailabilityInputSchema.parse({
      weekday: formData.get("weekday"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      type: formData.get("type") ?? "atendimento",
      slotMinutes: formData.get("slotMinutes") ?? 30,
    });
    await criarHorarioDoSacerdote(session.membership.parishId, priestProfileId, janela);
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  telasQueMudam();
  return {};
}

export async function apagarHorarioDoSacerdoteAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.INVITATIONS_CREATE);

  try {
    await apagarHorarioDoSacerdote(
      session.membership.parishId,
      String(formData.get("priestProfileId") ?? ""),
      String(formData.get("id") ?? ""),
    );
  } catch {
    return;
  }

  telasQueMudam();
}

export async function apagarSacerdoteAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.INVITATIONS_CREATE);

  try {
    await apagarSacerdoteSemConta(session.membership.parishId, String(formData.get("id") ?? ""));
  } catch {
    // Silencioso de propósito: o serviço recusa apagar quem tem conta, e a
    // tela nem oferece o botão nesse caso. Chegar aqui é tentativa fora do
    // caminho, não erro que o usuário precise ler.
    return;
  }

  telasQueMudam();
}
