"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { publishLiturgy, deleteLiturgy } from "@/server/modules/liturgia/liturgy-of-the-day-service";
import { AppError } from "@/server/shared/errors";

export type ActionState = { error?: string; ok?: boolean };

// Publicar as leituras do dia é comunicação da paróquia, como um aviso.
const MANAGE = PERMISSIONS.AVISOS_MANAGE;

/** "2026-08-20" → meia-noite UTC daquele dia (a coluna é DATE). */
function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function publishLiturgyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (!session.membership) return { error: "Você precisa pertencer a uma paróquia." };
  requirePermission(session, MANAGE);

  const date = parseDateOnly((formData.get("date") as string) ?? "");
  if (!date) return { error: "Informe uma data válida." };

  try {
    await publishLiturgy(session.membership.parishId, session.userId, {
      date,
      gospelReference: (formData.get("gospelReference") as string) ?? "",
      gospelTitle: formData.get("gospelTitle") as string | null,
      firstReading: formData.get("firstReading") as string | null,
      psalm: formData.get("psalm") as string | null,
      secondReading: formData.get("secondReading") as string | null,
      reflection: formData.get("reflection") as string | null,
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/painel/liturgia-do-dia");
  revalidatePath("/oracao");
  return { ok: true };
}

export async function deleteLiturgyAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;
  requirePermission(session, MANAGE);

  const date = parseDateOnly((formData.get("date") as string) ?? "");
  if (!date) return;

  await deleteLiturgy(session.membership.parishId, date);
  revalidatePath("/painel/liturgia-do-dia");
  revalidatePath("/oracao");
}
