import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getParishDashboardCounts } from "@/server/modules/parishes/service";
import { getParishInvitations } from "@/server/modules/invitations/service";
import { listPriests } from "@/server/modules/priests/service";
import { listUpcomingCelebrations } from "@/server/modules/celebrations/service";
import { listUpcomingEvents } from "@/server/modules/events/service";
import { countVolunteerProfiles } from "@/server/modules/volunteering/service";
import { listOpenOpportunities } from "@/server/modules/opportunities/service";
import { getReflectionAggregate, listSacramentsForValidation } from "@/server/modules/caminhada/service";
import { listGroups } from "@/server/modules/catequese/service";
import { listAllAvailability } from "@/server/modules/liturgia/service";
import { listContributionsForPeriod } from "@/server/modules/dizimo/service";
import { currentPeriod, formatPeriodLabel } from "@/lib/date";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/date";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";
import { CreateInviteForm } from "./CreateInviteForm";
import { CreateCelebrationForm } from "./CreateCelebrationForm";
import { CreateEventForm } from "./CreateEventForm";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  used: "Utilizado",
  expired: "Expirado",
  revoked: "Cancelado",
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="text-center">
      <p className="text-3xl font-semibold text-terracotta-700">{value}</p>
      <p className="mt-1 text-sm text-ink-700">{label}</p>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const session = await requirePermissionForPage(PERMISSIONS.DASHBOARD_PARISH_VIEW);

  if (!session.membership) {
    return (
      <EmptyState
        icon="⛪"
        title="Sem paróquia vinculada"
        description="Esta conta administra a plataforma, mas não está vinculada a uma paróquia específica ainda."
      />
    );
  }

  const [
    counts,
    invitations,
    priests,
    celebrations,
    events,
    volunteerCount,
    openOpportunities,
    reflectionAggregate,
    catechismGroups,
    liturgicalAvailability,
    titheContributions,
    sacraments,
  ] = await Promise.all([
    getParishDashboardCounts(session.membership.parishId),
    getParishInvitations(session.membership.parishId),
    listPriests(session.membership.parishId),
    listUpcomingCelebrations(session.membership.parishId, 10),
    listUpcomingEvents(session.membership.parishId, 10),
    countVolunteerProfiles(session.membership.parishId),
    listOpenOpportunities(session.membership.parishId),
    getReflectionAggregate(session.membership.parishId),
    listGroups(session.membership.parishId),
    listAllAvailability(session.membership.parishId),
    listContributionsForPeriod(session.membership.parishId, currentPeriod()),
    listSacramentsForValidation(session.membership.parishId),
  ]);
  const catechismGroupCount = catechismGroups.length;
  const liturgicalAvailabilityCount = liturgicalAvailability.length;
  const titheContributionCount = titheContributions.length;
  const pendingSacramentCount = sacraments.filter((s) => s.status === "self_reported").length;

  const agendaItems = [
    ...celebrations.map((c) => ({
      id: `celebration-${c.id}`,
      startsAt: c.startsAt,
      label: c.title || CELEBRATION_TYPE_LABELS[c.type],
      location: c.location,
      priestName: c.priestProfile?.user.fullName ?? null,
    })),
    ...events.map((e) => ({
      id: `event-${e.id}`,
      startsAt: e.startsAt,
      label: e.title,
      location: e.location,
      priestName: null as string | null,
    })),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl text-ink-900">{session.membership.parishName}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Fiéis" value={counts.fielCount} />
        <StatCard label="Sacerdotes" value={counts.sacerdoteCount} />
        <StatCard label="Convites emitidos" value={counts.invitesIssued} />
        <StatCard label="Convites utilizados" value={counts.invitesUsed} />
      </div>

      <Card>
        <p className="mb-3 font-serif text-lg text-ink-900">Convites</p>
        <CreateInviteForm />

        {invitations.length === 0 ? (
          <p className="mt-4 text-sm text-ink-700">Nenhum convite criado ainda.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-terracotta-100 text-ink-700">
                  <th className="py-2 pr-4">Código</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Usado por</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="border-b border-terracotta-50">
                    <td className="py-2 pr-4 font-mono">{invitation.code}</td>
                    <td className="py-2 pr-4">{invitation.type}</td>
                    <td className="py-2 pr-4">{STATUS_LABEL[invitation.status] ?? invitation.status}</td>
                    <td className="py-2 pr-4">{invitation.usedByUser?.fullName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-3 font-serif text-lg text-ink-900">Sacerdotes</p>
        {priests.length === 0 ? (
          <p className="text-sm text-ink-700">
            Nenhum sacerdote cadastrado ainda — crie um convite acima com vínculo &ldquo;Sacerdote&rdquo;.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {priests.map((priest) => (
              <li key={priest.id} className="flex items-center gap-2 text-sm text-ink-900">
                {priest.user.fullName} <Badge>{priest.title}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <p className="mb-3 font-serif text-lg text-ink-900">Agenda</p>
        <div className="flex flex-col gap-4">
          <CreateCelebrationForm priests={priests} />
          <CreateEventForm />
        </div>

        {agendaItems.length === 0 ? (
          <p className="mt-4 text-sm text-ink-700">Nenhum compromisso futuro cadastrado.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {agendaItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between border-b border-terracotta-50 py-2 text-sm">
                <div>
                  <p className="text-ink-900">{item.label}</p>
                  <p className="text-xs text-ink-700">
                    {formatDateTime(item.startsAt)}
                    {item.location ? ` · ${item.location}` : ""}
                    {item.priestName ? ` · ${item.priestName}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-lg text-ink-900">Servir</p>
            <p className="text-sm text-ink-700">
              {volunteerCount} {volunteerCount === 1 ? "pessoa disponível" : "pessoas disponíveis"} ·{" "}
              {openOpportunities.length} {openOpportunities.length === 1 ? "oportunidade aberta" : "oportunidades abertas"}
            </p>
          </div>
          <LinkButton href="/painel/servir" variant="secondary">
            Gerenciar
          </LinkButton>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-lg text-ink-900">Catequese</p>
            <p className="text-sm text-ink-700">{catechismGroupCount} {catechismGroupCount === 1 ? "turma" : "turmas"}</p>
          </div>
          <LinkButton href="/painel/catequese" variant="secondary">
            Gerenciar
          </LinkButton>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-lg text-ink-900">Liturgia</p>
            <p className="text-sm text-ink-700">
              {liturgicalAvailabilityCount} {liturgicalAvailabilityCount === 1 ? "disponibilidade informada" : "disponibilidades informadas"}
            </p>
          </div>
          <LinkButton href="/painel/liturgia" variant="secondary">
            Gerenciar
          </LinkButton>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-lg text-ink-900">Dízimo</p>
            <p className="text-sm text-ink-700">
              {titheContributionCount} {titheContributionCount === 1 ? "contribuição registrada" : "contribuições registradas"} em {formatPeriodLabel(currentPeriod())}
            </p>
          </div>
          <LinkButton href="/painel/dizimo" variant="secondary">
            Gerenciar
          </LinkButton>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-lg text-ink-900">Sacramentos</p>
            <p className="text-sm text-ink-700">
              {pendingSacramentCount} {pendingSacramentCount === 1 ? "sacramento aguardando validação" : "sacramentos aguardando validação"}
            </p>
          </div>
          <LinkButton href="/painel/sacramentos" variant="secondary">
            Gerenciar
          </LinkButton>
        </div>
      </Card>

      <Card>
        <p className="font-serif text-lg text-ink-900">Minha Caminhada</p>
        {reflectionAggregate.available ? (
          <p className="mt-1 text-sm text-ink-700">
            Nos últimos 30 dias, {reflectionAggregate.total} participações em missa foram registradas e{" "}
            {reflectionAggregate.rate}% vieram com uma reflexão.
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-700">
            Ainda não há participações suficientes nos últimos 30 dias para mostrar um indicador sem identificar
            ninguém.
          </p>
        )}
        <p className="mt-2 text-xs text-ink-700">
          Só o indicador agregado é visível — o conteúdo das reflexões é sempre privado.
        </p>
      </Card>
    </div>
  );
}
