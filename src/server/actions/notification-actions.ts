"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/guards";
import {
  markNotificationRead,
  openNotification,
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

/**
 * Abre o que a notificação anuncia: marca como lida e leva até lá.
 *
 * Antes a notificação dizia o que tinha acontecido e parava aí. Quem lia
 * "Você serve amanhã na liturgia" tinha que descobrir sozinho em qual tela
 * ver o horário — e o aviso continuava na lista, porque ir até lá por
 * conta própria não contava como leitura.
 */
export async function abrirNotificacaoAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.membership) return;

  const id = formData.get("id") as string;
  const destino = await openNotification(session.membership.parishId, id, session.userId);

  revalidatePath("/eu/notificacoes");
  // Só caminho interno. `//outro.site` é URL absoluta disfarçada de
  // caminho, e o navegador a trataria como tal.
  redirect(destino && destino.startsWith("/") && !destino.startsWith("//") ? destino : "/eu/notificacoes");
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
