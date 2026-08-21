"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/guards";
import {
  saveSubscription,
  removeSubscription,
  sendTestToUser,
} from "@/server/modules/push/service";

export type ActionState = { error?: string; ok?: string };

/**
 * Registra o aparelho. Os dados vêm do navegador (PushSubscription), não do
 * usuário — mas mesmo assim validamos a forma antes de gravar: é uma linha
 * que depois vira destino de envio.
 */
export async function subscribeToPushAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const endpoint = (formData.get("endpoint") as string | null)?.trim();
  const p256dh = (formData.get("p256dh") as string | null)?.trim();
  const auth = (formData.get("auth") as string | null)?.trim();

  if (!endpoint || !p256dh || !auth) {
    return { error: "Não foi possível registrar este aparelho." };
  }
  if (!/^https:\/\//.test(endpoint)) {
    return { error: "Endereço de notificação inválido." };
  }

  await saveSubscription(session.userId, {
    endpoint,
    p256dh,
    auth,
    userAgent: (formData.get("userAgent") as string | null)?.slice(0, 200) ?? null,
  });

  await sendTestToUser(session.userId);

  revalidatePath("/eu/notificacoes");
  return { ok: "Aparelho registrado. Você deve receber uma notificação de teste agora." };
}

export async function unsubscribeFromPushAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const endpoint = formData.get("endpoint") as string;
  if (!endpoint) return;

  await removeSubscription(session.userId, endpoint);
  revalidatePath("/eu/notificacoes");
}
