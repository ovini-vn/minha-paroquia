import type { Metadata } from "next";
import { Music, Check, X, CalendarDays } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { listMyAvailability, listMySchedule } from "@/server/modules/liturgia/service";
import { deleteAvailabilityAction, confirmScheduleAction } from "@/server/actions/liturgia-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow, SectionTitle } from "@/components/ui/Typography";
import { formatDateTime } from "@/lib/date";
import { WEEKDAY_LABELS } from "@/lib/pastoral-care-labels";
import { LITURGICAL_ROLE_LABELS } from "@/lib/liturgia-labels";
import { AvailabilityForm } from "./AvailabilityForm";
import { LidoAoAbrir } from "@/components/domain/LidoAoAbrir";

export const metadata: Metadata = { title: "Escala da liturgia" };

export default async function LiturgiaPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={Music}
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const [availability, schedule] = await Promise.all([
    listMyAvailability(session.membership.parishId, session.userId),
    listMySchedule(session.membership.parishId, session.userId),
  ]);

  return (
    <div className="flex flex-col">
      <LidoAoAbrir caminho="/servir/liturgia" />
      <PageHeader
        title="Liturgia"
        description="Diga em que função você pode servir nas celebrações — leitura, canto, acolhida e mais."
      />

      <Card>
        <Eyebrow tone="accent" className="mb-3">
          Posso servir como
        </Eyebrow>
        <AvailabilityForm />

        {availability.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <Eyebrow className="mb-2">Já informado</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {availability.map((a) => (
                <form
                  key={a.id}
                  action={deleteAvailabilityAction}
                  className="flex items-center gap-1 rounded-full border border-border bg-surface py-1 pl-3 pr-1"
                >
                  <input type="hidden" name="id" value={a.id} />
                  <span className="text-[13px] text-foreground">
                    {LITURGICAL_ROLE_LABELS[a.roleType]}
                    {a.weekdayPref !== null ? ` · ${WEEKDAY_LABELS[a.weekdayPref]}` : ""}
                  </span>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="border-0 px-1.5 py-1"
                    aria-label="Remover"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  </Button>
                </form>
              ))}
            </div>
          </div>
        )}
      </Card>

      <section className="pt-7">
        <SectionTitle eyebrow="Escala" title="Onde você foi escalado" />
        {schedule.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhuma escala futura"
            description="Quando o coordenador de liturgia escalar você para uma celebração, ela aparece aqui."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {schedule.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-3 border-b border-border py-3.5 last:border-b-0"
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <Music className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground">
                    {LITURGICAL_ROLE_LABELS[s.roleType]}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {formatDateTime(s.celebration.startsAt)}
                  </p>
                </div>
                {s.confirmed ? (
                  <Badge tone="success">
                    <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    Confirmado
                  </Badge>
                ) : (
                  <form action={confirmScheduleAction} className="shrink-0">
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" size="sm">
                      Confirmar
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </Card>
        )}
      </section>

      <div className="rule-gold my-7" />
    </div>
  );
}
