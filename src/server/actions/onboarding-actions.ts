"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import { expressGroupInterest } from "@/server/modules/pastorais/service";
import { joinParishAsPending } from "@/server/modules/parishes/service";
import { AppError } from "@/server/shared/errors";

/**
 * Marca as boas-vindas como vistas e leva para o Início.
 *
 * Grava mesmo quando a pessoa pula: o objetivo é não perguntar duas vezes,
 * não é obrigar a responder.
 */
export async function concluirBoasVindasAction(): Promise<void> {
  const session = await requireSession();

  // prisma direto, sem contexto de tenant: é a própria linha de users da
  // pessoa autenticada, e users não é tabela de paróquia.
  await prisma.user.update({
    where: { id: session.userId },
    data: { onboardedAt: new Date() },
  });

  revalidatePath("/", "layout");
  redirect("/inicio");
}

/**
 * Interesse na pastoral escolhida no terceiro passo.
 *
 * Separado de concluirBoasVindas porque falhar aqui não pode impedir a
 * pessoa de entrar: se a pastoral tiver sido encerrada entre a tela abrir
 * e o toque, ela entra do mesmo jeito e o interesse simplesmente não é
 * registrado.
 */
export async function entrarNaPastoralAction(groupId: string): Promise<void> {
  const session = await requireSession();
  if (!session.membership || !groupId) return;

  try {
    // Dispara a notificação ao responsável, como qualquer outro interesse —
    // é o que faz alguém de carne e osso procurar quem acabou de chegar.
    await expressGroupInterest(session.membership.parishId, groupId, session.userId);
  } catch (error) {
    console.error("Interesse em pastoral nas boas-vindas falhou:", error);
  }
}

export type JoinState = { error?: string };

/**
 * A pessoa escolhe a paróquia e entra na hora, como pendente.
 *
 * Não há aprovação prévia de propósito: quem quer só ver o horário da missa
 * não deve esperar ninguém. A secretaria confirma depois, e é a confirmação
 * que libera enxergar as outras pessoas.
 */
export async function entrarNaParoquiaAction(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const session = await requireSession();
  const parishId = formData.get("parishId") as string;
  if (!parishId) return { error: "Escolha uma paróquia." };

  try {
    await joinParishAsPending(parishId, session.userId);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/", "layout");
  redirect("/bem-vindo");
}
