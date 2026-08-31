import type { Metadata } from "next";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listAllEvents } from "@/server/modules/events/service";
import { setEventStatusAction, excluirEventoAction } from "@/server/actions/agenda-actions";
import { BotaoExcluir } from "@/components/ui/BotaoExcluir";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { formatDateTime, formatDateOnly } from "@/lib/date";
import { PartyPopper } from "lucide-react";

export const metadata: Metadata = { title: "Eventos" };

export default async function EventsAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.AGENDA_MANAGE);
  if (!session.membership) return null;

  const events = await listAllEvents(session.membership.parishId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Eventos"
          description="Festas, encontros e celebrações especiais da paróquia."
        />
        <LinkButton href="/painel" variant="ghost" size="sm">
          Criar evento
        </LinkButton>
      </div>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Cadastrados
        </Eyebrow>
        {events.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title="Nenhum evento criado"
            description="Novos eventos são criados no painel principal, na seção Agenda."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {events.map((event) => {
              const archived = event.status === "archived";
              return (
                <Card key={event.id} className={archived ? "opacity-60" : undefined}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-lg font-semibold leading-tight text-foreground">
                        {event.title}
                      </p>
                      <p className="mt-1 text-[12.5px] text-muted">
                        {event.semHora ? formatDateOnly(event.startsAt) : formatDateTime(event.startsAt)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <Badge tone={archived ? "muted" : "success"}>
                      {archived ? "Arquivado" : "Publicado"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                    <LinkButton href={`/painel/eventos/${event.id}`} variant="ghost" size="sm">
                      Editar
                    </LinkButton>
                    <form action={setEventStatusAction}>
                      <input type="hidden" name="id" value={event.id} />
                      <input type="hidden" name="status" value={archived ? "published" : "archived"} />
                      <Button type="submit" variant="ghost" size="sm">
                        {archived ? "Republicar" : "Arquivar"}
                      </Button>
                    </form>
                    <div className="ml-auto">
                      <BotaoExcluir
                        action={excluirEventoAction}
                        id={event.id}
                        descricao={`o evento ${event.title}`}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
