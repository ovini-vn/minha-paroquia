import { getSessionContext } from "@/server/auth/session";
import { listMyNotifications, listMyPreferences } from "@/server/modules/notifications/service";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  setPreferenceAction,
} from "@/server/actions/notification-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/date";
import { NOTIFICATION_CATEGORY_LABELS } from "@/lib/notification-labels";

export default async function NotificationsPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon="🔔"
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const [notifications, preferences] = await Promise.all([
    listMyNotifications(session.membership.parishId, session.userId),
    listMyPreferences(session.userId),
  ]);
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl text-ink-900">Notificações</h1>
        {hasUnread && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="ghost">
              Marcar todas como lidas
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon="🔔" title="Nenhuma notificação ainda" description="Avisos da sua paróquia aparecem aqui." />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <Card key={notification.id} className={notification.readAt ? "opacity-60" : undefined}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge>{NOTIFICATION_CATEGORY_LABELS[notification.category]}</Badge>
                    <p className="text-sm font-medium text-ink-900">{notification.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-ink-700">{notification.body}</p>
                  <p className="mt-1 text-xs text-ink-700">{formatDateTime(notification.createdAt)}</p>
                </div>
                {!notification.readAt && (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="id" value={notification.id} />
                    <Button type="submit" variant="ghost">
                      Marcar como lida
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <p className="mb-3 font-serif text-lg text-ink-900">Preferências</p>
        <ul className="flex flex-col gap-1.5">
          {preferences.map((preference) => (
            <li key={preference.category} className="flex items-center justify-between border-b border-terracotta-50 py-2 text-sm">
              <span className="text-ink-900">{NOTIFICATION_CATEGORY_LABELS[preference.category]}</span>
              <div className="flex items-center gap-2">
                <Badge>{preference.enabled ? "Ativada" : "Desativada"}</Badge>
                <form action={setPreferenceAction}>
                  <input type="hidden" name="category" value={preference.category} />
                  <input type="hidden" name="enabled" value={preference.enabled ? "false" : "true"} />
                  <Button type="submit" variant="ghost">
                    {preference.enabled ? "Desativar" : "Ativar"}
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
