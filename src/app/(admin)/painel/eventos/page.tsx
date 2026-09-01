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
import type { CategoriaDaAgenda } from "@prisma/client";
import { CATEGORIAS, ORDEM_DA_LEGENDA } from "@/lib/agenda-categorias";
import { FiltroDeTipos } from "./_components/FiltroDeTipos";

export const metadata: Metadata = { title: "Eventos" };

export default async function EventsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const session = await requirePermissionForPage(PERMISSIONS.AGENDA_MANAGE);
  if (!session.membership) return null;

  const { tipo } = await searchParams;
  const todos = await listAllEvents(session.membership.parishId);

  /*
   * O filtro é feito aqui, e não no banco, porque a lista já vem inteira
   * para a tela — é a mesma consulta com ou sem filtro. Uma consulta a mais
   * por tipo só faria sentido se a paróquia tivesse milhares de eventos, e
   * aí a paginação viria antes do filtro.
   *
   * Tipo desconhecido no endereço é ignorado, e não erro: o mesmo cuidado
   * da agenda, porque estes endereços são guardados e compartilhados.
   */
  const escolhido = tipo && tipo in CATEGORIAS ? (tipo as CategoriaDaAgenda) : null;
  const events = escolhido ? todos.filter((e) => e.categoria === escolhido) : todos;

  const presentes = ORDEM_DA_LEGENDA.filter((cat) => todos.some((e) => e.categoria === cat));

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

        <div className="mb-4">
          <FiltroDeTipos atual={escolhido} presentes={presentes} />
        </div>
        {events.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title={escolhido ? `Nenhum evento de ${CATEGORIAS[escolhido].rotulo}` : "Nenhum evento criado"}
            description={
              escolhido
                ? "Há eventos de outros tipos cadastrados."
                : "Novos eventos são criados no painel principal, na seção Agenda."
            }
            action={
              escolhido ? (
                <LinkButton href="/painel/eventos" size="sm">
                  Ver todos
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {events.map((event) => {
              const archived = event.status === "archived";
              return (
                <Card key={event.id} className={archived ? "opacity-60" : undefined}>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="mt-1 h-[34px] w-[3px] shrink-0 rounded-full"
                      style={{
                        backgroundColor: `rgb(var(--cat-${CATEGORIAS[event.categoria].token}))`,
                      }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
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
