import { getSessionContext } from "@/server/auth/session";
import { listMyAvailability, listMySchedule } from "@/server/modules/liturgia/service";
import { deleteAvailabilityAction, confirmScheduleAction } from "@/server/actions/liturgia-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/date";
import { WEEKDAY_LABELS } from "@/lib/pastoral-care-labels";
import { LITURGICAL_ROLE_LABELS } from "@/lib/liturgia-labels";
import { AvailabilityForm } from "./AvailabilityForm";

export default async function LiturgiaPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon="🎵"
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-xl text-ink-900">Liturgia</h1>
        <p className="mt-1 text-sm text-ink-700">
          Informe em que função você pode servir nas celebrações — leitura, canto, acolhida e mais.
        </p>
      </div>

      <Card>
        <AvailabilityForm />
        {availability.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {availability.map((a) => (
              <form key={a.id} action={deleteAvailabilityAction} className="flex items-center gap-1.5">
                <input type="hidden" name="id" value={a.id} />
                <Badge>
                  {LITURGICAL_ROLE_LABELS[a.roleType]}
                  {a.weekdayPref !== null ? ` · ${WEEKDAY_LABELS[a.weekdayPref]}` : ""}
                </Badge>
                <Button type="submit" variant="ghost">
                  Remover
                </Button>
              </form>
            ))}
          </div>
        )}
      </Card>

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-terracotta-600">Sua escala</p>
        {schedule.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-700">Nenhuma escala futura por enquanto.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {schedule.map((s) => (
              <Card key={s.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink-900">{LITURGICAL_ROLE_LABELS[s.roleType]}</p>
                  <p className="text-xs text-ink-700">{formatDateTime(s.celebration.startsAt)}</p>
                </div>
                {s.confirmed ? (
                  <Badge>Confirmado</Badge>
                ) : (
                  <form action={confirmScheduleAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="secondary">
                      Confirmar
                    </Button>
                  </form>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
