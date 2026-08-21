"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireSession } from "@/server/auth/guards";
import {
  createFamilyMember,
  addGuardian,
  removeGuardian,
  removeFamilyMember,
} from "@/server/modules/family/service";
import { createFamilyMemberInputSchema } from "@/server/modules/family/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function createFamilyMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  try {
    const input = createFamilyMemberInputSchema.parse({
      fullName: formData.get("fullName"),
      relationship: formData.get("relationship"),
      birthDate: formData.get("birthDate") || undefined,
    });

    await createFamilyMember({ ...input, parishId: session.membership.parishId, responsibleUserId: session.userId });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/eu/familia");
  return {};
}

export async function addGuardianAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  const familyMemberId = formData.get("familyMemberId") as string;
  const userId = formData.get("userId") as string;
  if (!userId) return { error: "Escolha uma pessoa." };

  try {
    await addGuardian(session.membership.parishId, familyMemberId, userId, session.userId);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/eu/familia/${familyMemberId}`);
  return {};
}

export async function removeGuardianAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;

  const familyMemberId = formData.get("familyMemberId") as string;
  const userId = formData.get("userId") as string;

  try {
    await removeGuardian(session.membership.parishId, familyMemberId, userId, session.userId);
  } catch (error) {
    if (error instanceof AppError) return; // último guardião ou não-guardião tentando remover — botão nem deveria aparecer
    throw error;
  }
  revalidatePath(`/eu/familia/${familyMemberId}`);
}

/**
 * Exclui o cadastro do dependente.
 *
 * Devolve o erro em vez de redirecionar quando o serviço recusa (dependente
 * matriculado na catequese): a pessoa precisa LER o motivo, senão fica
 * apertando um botão que não faz nada.
 */
export async function removeFamilyMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  const familyMemberId = formData.get("familyMemberId") as string;
  if (!familyMemberId) return { error: "Dependente não informado." };

  try {
    await removeFamilyMember(session.membership.parishId, familyMemberId, session.userId);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/eu/familia");
  // Fora do try: redirect() sinaliza jogando uma exceção, e um catch acima
  // a engoliria como se fosse falha.
  redirect("/eu/familia");
}
