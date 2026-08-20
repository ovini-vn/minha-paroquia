import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listUpcomingCelebrations } from "@/server/modules/celebrations/service";
import { listAllAvailability, listScheduleForCelebration } from "@/server/modules/liturgia/service";
import { removeScheduleAction } from "@/server/actions/liturgia-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/date";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";
import { LITURGICAL_ROLE_LABELS } from "@/lib/liturgia-labels";
import { CreateScheduleForm } from "./CreateScheduleForm";
import { Music } from "lucide-react";

export default async function LiturgiaAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.LITURGIA_MANAGE);
  if (!session.membership) return null;

  const [celebrations, availability] = await Promise.all([
    listUpcomingCelebrations(session.membership.parishId, 10),
    listAllAvailability(session.membership.parishId),
  ]);

  const availabilityByRole: Record<string, { userId: string; fullName: string }[]> = {};
  for (const a of availability) {
    (availabilityByRole[a.roleType] ??= []).push({ userId: a.user.id, fullName: a.user.fullName });
  }

  const schedulesByCelebration = await Promise.all(
    celebrations.map((c) => listScheduleForCelebration(session.membership!.parishId, c.id)),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-foreground">Liturgia</h1>

      {celebrations.length === 0 ? (
        <EmptyState
          icon={Music}
          title="Nenhuma celebração futura"
          description="Crie celebrações na Agenda para poder montar a escala."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {celebrations.map((celebration, index) => (
            <Card key={celebration.id}>
              <p className="font-medium text-foreground">
                {celebration.title || CELEBRATION_TYPE_LABELS[celebration.type]}
              </p>
              <p className="text-xs text-muted">{formatDateTime(celebration.startsAt)}</p>

              <div className="mt-3 border-t border-border pt-3">
                <CreateScheduleForm celebrationId={celebration.id} availabilityByRole={availabilityByRole} />
              </div>

              {schedulesByCelebration[index]!.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {schedulesByCelebration[index]!.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">
                        {LITURGICAL_ROLE_LABELS[s.roleType]} — {s.user.fullName}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge>{s.confirmed ? "Confirmado" : "Aguardando confirmação"}</Badge>
                        <form action={removeScheduleAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <Button type="submit" variant="ghost">
                            Remover
                          </Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
