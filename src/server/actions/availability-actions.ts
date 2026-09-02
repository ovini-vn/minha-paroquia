"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getOwnPriestProfile } from "@/server/modules/priests/service";
import { createAvailability, deleteAvailability } from "@/server/modules/availability/service";
import { definirOQueAtende } from "@/server/modules/priests/service";
import { createAvailabilityInputSchema } from "@/server/modules/availability/schema";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function createAvailabilityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, PERMISSIONS.AVAILABILITY_MANAGE);

  const priest = await getOwnPriestProfile(session.membership.parishId, session.userId);
  if (!priest) return { error: "Você precisa ter um perfil de sacerdote nesta paróquia." };

  try {
    const input = createAvailabilityInputSchema.parse({
      weekday: formData.get("weekday"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      type: formData.get("type") || "atendimento",
      slotMinutes: formData.get("slotMinutes") || 30,
    });

    await createAvailability({ ...input, parishId: session.membership.parishId, priestProfileId: priest.id });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Dados inválidos." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/eu/disponibilidade");
  return {};
}

/**
 * Marca o que o sacerdote atende. Caixas de seleção, lidas por PRESENÇA.
 *
 * Uma caixa desmarcada simplesmente não é enviada pelo navegador — por isso
 * a leitura é `=== "sim"` e não a comparação com "false". Já foi origem de
 * defeito neste repositório, quando dois campos com o mesmo nome faziam o
 * resultado depender da ordem de serialização.
 */
export async function definirOQueAtendeAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.AVAILABILITY_MANAGE);

  const priest = await getOwnPriestProfile(session.membership.parishId, session.userId);
  if (!priest) return;

  await definirOQueAtende(session.membership.parishId, priest.id, {
    ofereceAtendimento: formData.get("ofereceAtendimento") === "sim",
    ofereceConfissao: formData.get("ofereceConfissao") === "sim",
  });
  revalidatePath("/eu/disponibilidade");
  revalidatePath("/comunidade/sacerdotes");
}

export async function deleteAvailabilityAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, PERMISSIONS.AVAILABILITY_MANAGE);

  const priest = await getOwnPriestProfile(session.membership.parishId, session.userId);
  if (!priest) return;

  const id = formData.get("id") as string;
  await deleteAvailability(session.membership.parishId, id, priest.id);
  revalidatePath("/eu/disponibilidade");
}
