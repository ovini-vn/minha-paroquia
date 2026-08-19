"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { requireSession } from "@/server/auth/guards";
import {
  createAppointment,
  updateAppointmentStatus,
  cancelOwnAppointment,
} from "@/server/modules/appointments/service";
import { createAppointmentInputSchema, updateAppointmentStatusInputSchema } from "@/server/modules/appointments/schema";
import { getOwnPriestProfile } from "@/server/modules/priests/service";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string };

export async function createAppointmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };

  try {
    const priestProfileId = z.string().uuid().parse(formData.get("priestProfileId"));
    const input = createAppointmentInputSchema.parse({
      category: formData.get("category"),
      scheduledAt: formData.get("scheduledAt"),
    });

    await createAppointment({
      ...input,
      parishId: session.membership.parishId,
      priestProfileId,
      fielUserId: session.userId,
    });
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Escolha um horário e categoria." };
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/eu/atendimentos");
  redirect("/eu/atendimentos");
}

export async function updateAppointmentStatusAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;

  const priest = await getOwnPriestProfile(session.membership.parishId, session.userId);
  if (!priest) return;

  const parsed = updateAppointmentStatusInputSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  await updateAppointmentStatus(session.membership.parishId, parsed.data.id, priest.id, parsed.data.status);
  revalidatePath("/eu/atendimentos");
}

export async function cancelOwnAppointmentAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;

  const id = formData.get("id") as string;
  await cancelOwnAppointment(session.membership.parishId, id, session.userId);
  revalidatePath("/eu/atendimentos");
}
