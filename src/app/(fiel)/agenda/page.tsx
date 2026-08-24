import { CalendarDays, Church, PartyPopper, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listPriests } from "@/server/modules/priests/service";
import { listUpcomingCelebrations } from "@/server/modules/celebrations/service";
import { listUpcomingEvents } from "@/server/modules/events/service";
import { listMyAppointments } from "@/server/modules/appointments/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";
import { BRASILIA_TIMEZONE, brasiliaParts } from "@/lib/brasilia";
import { AcoesRapidas } from "@/components/domain/AcoesRapidas";
import { CreateCelebrationForm } from "@/app/(admin)/painel/CreateCelebrationForm";
import { CreateEventForm } from "@/app/(admin)/painel/CreateEventForm";
import { isUploadConfigured } from "@/server/modules/uploads/service";

type AgendaItem = {
  id: string;
  startsAt: Date;
  title: string;
  detail: string | null;
  icon: LucideIcon;
  tag: string;
  mine: boolean;
};

const DAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: BRASILIA_TIMEZONE,
});
const TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: BRASILIA_TIMEZONE,
});

/**
 * Agrupa pelo dia em BRASÍLIA, não no fuso do processo.
 *
 * Com getDate() do fuso local, uma missa das 21h (00h UTC do dia seguinte)
 * era listada no dia errado num servidor em UTC — a pessoa procurava a
 * missa de sábado e ela aparecia no domingo.
 */
function dayKey(date: Date): string {
  const p = brasiliaParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export default async function AgendaPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const parishId = session.membership.parishId;
  const [celebrations, events, appointments] = await Promise.all([
    listUpcomingCelebrations(parishId, 30),
    listUpcomingEvents(parishId, 30),
    listMyAppointments(parishId, session.userId),
  ]);

  const now = new Date();
  const items: AgendaItem[] = [
    ...celebrations.map((c) => ({
      id: `celebration-${c.id}`,
      startsAt: c.startsAt,
      title: c.title || CELEBRATION_TYPE_LABELS[c.type],
      detail: [c.location, c.priestProfile?.user.fullName].filter(Boolean).join(" · ") || null,
      icon: Church,
      tag: "Celebração",
      mine: false,
    })),
    ...events.map((e) => ({
      id: `event-${e.id}`,
      startsAt: e.startsAt,
      title: e.title,
      detail: e.location,
      icon: PartyPopper,
      tag: "Evento",
      mine: false,
    })),
    // Só os meus atendimentos futuros — o histórico fica em /eu/atendimentos.
    ...appointments
      .filter((a) => a.scheduledAt >= now && a.status !== "cancelado")
      .map((a) => ({
        id: `appointment-${a.id}`,
        startsAt: a.scheduledAt,
        title: "Atendimento pastoral",
        detail: a.priestProfile?.user.fullName ?? null,
        icon: UserRound,
        tag: "Meu",
        mine: true,
      })),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  // Agrupa por dia, para a leitura ser "o que tem tal dia", não uma lista corrida.
  const days = items.reduce<{ key: string; date: Date; items: AgendaItem[] }[]>((acc, item) => {
    const key = dayKey(item.startsAt);
    const last = acc[acc.length - 1];
    if (last && last.key === key) last.items.push(item);
    else acc.push({ key, date: item.startsAt, items: [item] });
    return acc;
  }, []);

  // Lançar de onde se está olhando. Só para quem administra a agenda — o
  // fiel comum não recebe nenhuma ação e não vê barra alguma.
  const podeLancar =
    session.isPlatformAdmin || session.permissions.includes(PERMISSIONS.AGENDA_MANAGE);
  const priests = podeLancar && session.membership ? await listPriests(session.membership.parishId) : [];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Agenda"
        description="Missas, celebrações, eventos da paróquia e os seus atendimentos, em um lugar só."
      />

      {podeLancar && (
        <AcoesRapidas
          acoes={[
            {
              id: "celebracao",
              label: "Celebração avulsa",
              icone: <Church className="h-4 w-4" strokeWidth={1.5} aria-hidden />,
              conteudo: <CreateCelebrationForm priests={priests} />,
            },
            {
              id: "evento",
              label: "Evento",
              icone: <PartyPopper className="h-4 w-4" strokeWidth={1.5} aria-hidden />,
              conteudo: <CreateEventForm podeEnviarArquivo={isUploadConfigured()} />,
            },
          ]}
        />
      )}

      {days.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nada agendado por enquanto"
          description="Assim que a paróquia publicar celebrações ou eventos, eles aparecem aqui."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((day) => (
            <section key={day.key}>
              <Eyebrow tone="accent" className="mb-2.5 first-letter:uppercase">
                {DAY_FORMATTER.format(day.date)}
              </Eyebrow>
              <Card className="px-3.5 py-1.5">
                {day.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0"
                    >
                      <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                        <Icon className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] font-medium text-foreground">{item.title}</p>
                        <p className="mt-0.5 text-[12.5px] text-muted">
                          {TIME_FORMATTER.format(item.startsAt)}
                          {item.detail ? ` · ${item.detail}` : ""}
                        </p>
                      </div>
                      {item.mine && <Badge tone="gold">{item.tag}</Badge>}
                    </div>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      )}

      <div className="rule-gold my-7" />
    </div>
  );
}
