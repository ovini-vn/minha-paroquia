import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listAllEvents } from "@/server/modules/events/service";
import { setEventStatusAction } from "@/server/actions/agenda-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/date";

export default async function EventsAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.AGENDA_MANAGE);
  if (!session.membership) return null;

  const events = await listAllEvents(session.membership.parishId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink-900">Eventos</h1>
        <LinkButton href="/painel" variant="secondary">
          Criar evento
        </LinkButton>
      </div>
      <p className="text-sm text-ink-700">Novos eventos são criados no painel principal, na seção Agenda.</p>

      {events.length === 0 ? (
        <EmptyState icon="🎉" title="Nenhum evento criado ainda" description="Crie um no painel principal." />
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((event) => {
            const archived = event.status === "archived";
            return (
              <Card key={event.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{event.title}</p>
                    <p className="mt-1 text-xs text-ink-700">
                      {formatDateTime(event.startsAt)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>
                  <Badge>{archived ? "Arquivado" : "Publicado"}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  <LinkButton href={`/painel/eventos/${event.id}`} variant="secondary">
                    Editar
                  </LinkButton>
                  <form action={setEventStatusAction}>
                    <input type="hidden" name="id" value={event.id} />
                    <input type="hidden" name="status" value={archived ? "published" : "archived"} />
                    <Button type="submit" variant="ghost">
                      {archived ? "Republicar" : "Arquivar"}
                    </Button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
