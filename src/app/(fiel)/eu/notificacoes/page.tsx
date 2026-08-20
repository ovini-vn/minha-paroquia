import { Bell, Check, CheckCheck } from "lucide-react";
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
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { formatDateTime } from "@/lib/date";
import { NOTIFICATION_CATEGORY_LABELS } from "@/lib/notification-labels";
import { cn } from "@/lib/cn";

export default async function NotificationsPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={Bell}
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const [notifications, preferences] = await Promise.all([
    listMyNotifications(session.membership.parishId, session.userId),
    listMyPreferences(session.userId),
  ]);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Notificações"
        description="O que aconteceu na sua comunidade desde a última visita."
      />

      {unreadCount > 0 && (
        <form action={markAllNotificationsReadAction} className="mb-4">
          <Button type="submit" variant="ghost" size="sm">
            <CheckCheck className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Marcar {unreadCount === 1 ? "a não lida" : `as ${unreadCount} não lidas`}
          </Button>
        </form>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nenhuma notificação ainda"
          description="Avisos, escalas e respostas da sua paróquia aparecem aqui."
        />
      ) : (
        <Card className="px-3.5 py-1.5">
          {notifications.map((notification) => {
            const lida = Boolean(notification.readAt);
            return (
              <div
                key={notification.id}
                className={cn(
                  "flex gap-3.5 border-b border-border py-3.5 last:border-b-0",
                  lida && "opacity-60",
                )}
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <Bell className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[14.5px] font-medium text-foreground">
                    {notification.title}
                    {/* Ponto dourado no lugar de texto: o não lido se vê de relance. */}
                    {!lida && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                        aria-label="Não lida"
                      />
                    )}
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
                    {notification.body}
                  </p>
                  <p className="mt-1.5 text-[11px] uppercase tracking-[0.04em] text-muted">
                    {NOTIFICATION_CATEGORY_LABELS[notification.category]} ·{" "}
                    {formatDateTime(notification.createdAt)}
                  </p>
                </div>
                {!lida && (
                  <form action={markNotificationReadAction} className="shrink-0 self-center">
                    <input type="hidden" name="id" value={notification.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="px-2.5"
                      aria-label="Marcar como lida"
                    >
                      <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <section className="pt-7">
        <Eyebrow tone="accent" className="mb-3">
          O que quero receber
        </Eyebrow>
        <Card className="px-3.5 py-1.5">
          {preferences.map((preference) => (
            <div
              key={preference.category}
              className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-[14.5px] text-foreground">
                  {NOTIFICATION_CATEGORY_LABELS[preference.category]}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={preference.enabled ? "success" : "muted"}>
                  {preference.enabled ? "Ativada" : "Desativada"}
                </Badge>
                <form action={setPreferenceAction}>
                  <input type="hidden" name="category" value={preference.category} />
                  <input type="hidden" name="enabled" value={preference.enabled ? "false" : "true"} />
                  <Button type="submit" variant="ghost" size="sm">
                    {preference.enabled ? "Desativar" : "Ativar"}
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <div className="rule-gold my-7" />
    </div>
  );
}
