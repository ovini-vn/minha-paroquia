import type { Metadata } from "next";
import { Bell, BellRing, Check, CheckCheck, ChevronRight } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { listMyNotifications, listMyPreferences } from "@/server/modules/notifications/service";
import {
  abrirNotificacaoAction,
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
import { PushToggle } from "@/components/domain/PushToggle";
import { getPublicVapidKey, listOwnSubscriptions } from "@/server/modules/push/service";
import { unsubscribeFromPushAction } from "@/server/actions/push-actions";
import { cn } from "@/lib/cn";

/** Nome legível do aparelho, para a pessoa saber qual está removendo. */
function descreverAparelho(userAgent: string | null): string {
  if (!userAgent) return "Aparelho desconhecido";
  if (/iPhone|iPad/i.test(userAgent)) return "iPhone ou iPad";
  if (/Android/i.test(userAgent)) return "Android";
  if (/Windows/i.test(userAgent)) return "Computador (Windows)";
  if (/Mac OS/i.test(userAgent)) return "Computador (Mac)";
  return "Este navegador";
}

export const metadata: Metadata = { title: "Notificações" };

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

  const [notifications, preferences, aparelhos] = await Promise.all([
    listMyNotifications(session.membership.parishId, session.userId),
    listMyPreferences(session.userId),
    listOwnSubscriptions(session.userId),
  ]);
  const vapidPublicKey = getPublicVapidKey();
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Notificações"
        description="O que aconteceu na sua comunidade desde a última visita."
      />

      {/* Notificação FORA do app — a que lembra do compromisso assumido. */}
      <Card className="mb-4 border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gold/15 text-[#8a6b24] dark:text-gold">
            <BellRing className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-medium text-foreground">Avisos no aparelho</p>
            <p className="mb-3 mt-1 text-[13px] leading-relaxed text-muted">
              Receba um lembrete na véspera e no dia dos compromissos que você assumiu — escala da
              liturgia, mutirão em que se ofereceu, atendimento marcado. Chega mesmo com o app
              fechado.
            </p>
            <PushToggle vapidPublicKey={vapidPublicKey} />

            {aparelhos.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <Eyebrow className="mb-2">Aparelhos registrados</Eyebrow>
                <div className="flex flex-col gap-1.5">
                  {aparelhos.map((aparelho) => (
                    <form
                      key={aparelho.id}
                      action={unsubscribeFromPushAction}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="endpoint" value={aparelho.endpoint} />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">
                        {descreverAparelho(aparelho.userAgent)}
                      </span>
                      <Button type="submit" variant="ghost" size="sm">
                        Remover
                      </Button>
                    </form>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

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

            const conteudo = (
              <>
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <Bell className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[14.5px] font-medium text-foreground">
                    {notification.title}
                    {/* Ponto dourado no lugar de texto: o não lido se vê de relance. */}
                    {!lida && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                        aria-label="Não lida"
                      />
                    )}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">
                    {notification.body}
                  </span>
                  <span className="mt-1.5 block text-[11px] uppercase tracking-[0.04em] text-muted">
                    {NOTIFICATION_CATEGORY_LABELS[notification.category]} ·{" "}
                    {formatDateTime(notification.createdAt)}
                  </span>
                </span>
              </>
            );

            return (
              <div
                key={notification.id}
                className={cn(
                  "flex items-center gap-1 border-b border-border last:border-b-0",
                  lida && "opacity-60",
                )}
              >
                {/*
                  TODA notificação abre, e antes só abria a que tivesse
                  destino gravado. As outras viravam linha morta: a pessoa
                  lia, tocava e nada acontecia — em produção, três das seis
                  do usuário estavam assim. Quem não gravou destino agora
                  cai no padrão da categoria (ver `destinoPadraoDaCategoria`).

                  Um formulário, e não um link: abrir precisa marcar como
                  lida no servidor antes de navegar. O formulário de
                  "marcar lida" fica FORA deste — form dentro de form é
                  inválido em HTML e o navegador desmonta o de dentro.
                */}
                <form action={abrirNotificacaoAction} className="min-w-0 flex-1">
                  <input type="hidden" name="id" value={notification.id} />
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3.5 py-3.5 text-left transition-colors hover:bg-primary-tint"
                  >
                    {conteudo}
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-border-strong"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </button>
                </form>

                {/* Continua sendo possível dispensar sem abrir — nem tudo
                    que se lê na lista precisa de uma visita. */}
                {!lida && (
                  <form action={markNotificationReadAction} className="shrink-0 self-center">
                    <input type="hidden" name="id" value={notification.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="px-2.5"
                      aria-label="Marcar como lida sem abrir"
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
