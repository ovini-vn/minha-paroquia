"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/guards";
import {
  markNotificationRead,
  markAllNotificationsRead,
  setPreference,
  NOTIFICATION_CATEGORIES,
} from "@/server/modules/notifications/service";
import type { NotificationCategory } from "@prisma/client";

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;

  const id = formData.get("id") as string;
  await markNotificationRead(session.membership.parishId, id, session.userId);
  revalidatePath("/eu/notificacoes");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;

  await markAllNotificationsRead(session.membership.parishId, session.userId);
  revalidatePath("/eu/notificacoes");
}

export async function setPreferenceAction(formData: FormData): Promise<void> {
  const session = await requireSession();

  const category = formData.get("category") as string;
  if (!NOTIFICATION_CATEGORIES.includes(category as NotificationCategory)) return;
  const enabled = formData.get("enabled") === "true";

  await setPreference(session.userId, category as NotificationCategory, enabled);
  revalidatePath("/eu/notificacoes");
}
