import type { NotificationCategory, Prisma } from "@prisma/client";
import { withTenantContext } from "@/server/db/tenant-context";
import { prisma } from "@/server/db/prisma";

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = ["urgente", "pessoal", "pastoral", "espiritual"];

type NotifyInput = {
  parishId: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
};

/**
 * Cria uma notificação dentro de uma transação já aberta por outro módulo
 * (ex.: confirmar um atendimento, escalar alguém na liturgia, publicar uma
 * palavra do padre) — ver docs/ARQUITETURA.md, seção D.2. Respeita a
 * preferência do usuário para a categoria; ausência de preferência = habilitado.
 */
export async function notifyUser(tx: Prisma.TransactionClient, input: NotifyInput): Promise<void> {
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId_category: { userId: input.userId, category: input.category } },
  });
  if (preference && !preference.enabled) return;

  await tx.notification.create({
    data: {
      parishId: input.parishId,
      userId: input.userId,
      category: input.category,
      title: input.title,
      body: input.body,
    },
  });
}

export async function notifyManyUsers(
  tx: Prisma.TransactionClient,
  parishId: string,
  userIds: string[],
  category: NotificationCategory,
  title: string,
  body: string,
): Promise<void> {
  for (const userId of userIds) {
    await notifyUser(tx, { parishId, userId, category, title, body });
  }
}

export function listMyNotifications(parishId: string, userId: string, limit = 30) {
  return withTenantContext(parishId, (tx) =>
    tx.notification.findMany({ where: { parishId, userId }, orderBy: { createdAt: "desc" }, take: limit }),
  );
}

export function countUnreadNotifications(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) => tx.notification.count({ where: { parishId, userId, readAt: null } }));
}

/** Escopado ao próprio usuário — evita marcar como lida a notificação de outra pessoa por id adivinhado. */
export function markNotificationRead(parishId: string, id: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.notification.updateMany({ where: { id, parishId, userId, readAt: null }, data: { readAt: new Date() } }),
  );
}

export function markAllNotificationsRead(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.notification.updateMany({ where: { parishId, userId, readAt: null }, data: { readAt: new Date() } }),
  );
}

/** Preferência não é tenant-scoped (sem parish_id) — ver comentário no schema. */
export async function listMyPreferences(userId: string) {
  const rows = await prisma.notificationPreference.findMany({ where: { userId } });
  const enabledByCategory = new Map(rows.map((row) => [row.category, row.enabled]));
  return NOTIFICATION_CATEGORIES.map((category) => ({
    category,
    enabled: enabledByCategory.get(category) ?? true,
  }));
}

export function setPreference(userId: string, category: NotificationCategory, enabled: boolean) {
  return prisma.notificationPreference.upsert({
    where: { userId_category: { userId, category } },
    update: { enabled },
    create: { userId, category, enabled },
  });
}
