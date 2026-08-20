import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getParishDashboardCounts, getParish } from "@/server/modules/parishes/service";
import { listAllAvisos } from "@/server/modules/avisos/service";
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
import { listAllGroups } from "@/server/modules/pastorais/service";
import { currentPeriod, formatPeriodLabel } from "@/lib/date";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stat } from "@/components/ui/Stat";
import { RowLink } from "@/components/ui/RowLink";
import { Eyebrow } from "@/components/ui/Typography";
import { formatDateTime } from "@/lib/date";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";
import { revokeInvitationAction } from "@/server/actions/invitation-actions";
import { Button } from "@/components/ui/Button";
import { CreateInviteForm } from "./CreateInviteForm";
import { CreateCelebrationForm } from "./CreateCelebrationForm";
import { CreateEventForm } from "./CreateEventForm";
import { ParishProfileForm } from "./ParishProfileForm";
import {
  Church,
  Megaphone,
  PartyPopper,
  HeartHandshake,
  BookOpen,
  Music,
  HandCoins,
  ScrollText,
  KeyRound,
  Users,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  used: "Utilizado",
  expired: "Expirado",
  revoked: "Cancelado",
};

const STATUS_TONE: Record<string, "success" | "muted" | "warning" | "error"> = {
  pending: "warning",
  used: "success",
  expired: "muted",
  revoked: "error",
};

export default async function AdminDashboardPage() {
  const session = await requirePermissionForPage(PERMISSIONS.DASHBOARD_PARISH_VIEW);

  if (!session.membership) {
    return (
      <EmptyState
        icon={Church}
        title="Sem paróquia vinculada"
        description="Esta conta administra a plataforma, mas não está vinculada a uma paróquia específica ainda."
      />
    );
  }

  const [
    parish,
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
    avisos,
    pastoralGroups,
  ] = await Promise.all([
    getParish(session.membership.parishId),
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
    listAllAvisos(session.membership.parishId),
    listAllGroups(session.membership.parishId),
  ]);
  const pastoralGroupCount = pastoralGroups.length;
  const catechismGroupCount = catechismGroups.length;
  const liturgicalAvailabilityCount = liturgicalAvailability.length;
  const titheContributionCount = titheContributions.length;
  const pendingSacramentCount = sacraments.filter((s) => s.status === "self_reported").length;
  const publishedAvisoCount = avisos.filter((a) => a.status === "published").length;

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
        <h1 className="font-serif text-2xl text-foreground">{session.membership.parishName}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Fiéis" value={counts.fielCount} />
        <Stat label="Sacerdotes" value={counts.sacerdoteCount} />
        <Stat label="Convites emitidos" value={counts.invitesIssued} />
        <Stat label="Convites utilizados" value={counts.invitesUsed} />
      </div>

      <Card>
        <p className="mb-3 font-serif text-lg text-foreground">Perfil da paróquia</p>
        <p className="mb-3 text-sm text-muted">
          Essas informações aparecem para o fiel em Minha Comunidade.
        </p>
        <ParishProfileForm
          city={parish?.city ?? ""}
          state={parish?.state ?? ""}
          address={parish?.address ?? ""}
          phone={parish?.phone ?? ""}
          description={parish?.description ?? ""}
          logoUrl={parish?.logoUrl ?? ""}
        />
      </Card>

      {/* Áreas de gestão — uma lista só, em vez de oito cards iguais
          empilhados, cada um com seu próprio botão "Gerenciar". */}
      <section>
        <Eyebrow tone="accent" className="mb-3">
          Áreas da paróquia
        </Eyebrow>
        <Card className="px-3.5 py-1.5">
          <RowLink
            href="/painel/avisos"
            icon={Megaphone}
            title="Avisos"
            subtitle={`${publishedAvisoCount} ${publishedAvisoCount === 1 ? "publicado" : "publicados"}`}
          />
          <RowLink
            href="/painel/eventos"
            icon={PartyPopper}
            title="Eventos"
            subtitle={`${events.length} ${events.length === 1 ? "futuro" : "futuros"}`}
          />
          <RowLink
            href="/painel/liturgia-do-dia"
            icon={BookOpen}
            title="Leituras do dia"
            subtitle="Publique o Evangelho e uma reflexão"
          />
          <RowLink
            href="/painel/servir"
            icon={HeartHandshake}
            title="Servir"
            subtitle={`${volunteerCount} ${volunteerCount === 1 ? "pessoa disponível" : "pessoas disponíveis"} · ${openOpportunities.length} ${openOpportunities.length === 1 ? "oportunidade aberta" : "oportunidades abertas"}`}
          />
          <RowLink
            href="/painel/pastorais"
            icon={Users}
            title="Grupos e pastorais"
            subtitle={`${pastoralGroupCount} ${pastoralGroupCount === 1 ? "pastoral cadastrada" : "pastorais cadastradas"}`}
          />
          <RowLink
            href="/painel/catequese"
            icon={BookOpen}
            title="Catequese"
            subtitle={`${catechismGroupCount} ${catechismGroupCount === 1 ? "turma" : "turmas"}`}
          />
          <RowLink
            href="/painel/liturgia"
            icon={Music}
            title="Liturgia"
            subtitle={`${liturgicalAvailabilityCount} ${liturgicalAvailabilityCount === 1 ? "disponibilidade informada" : "disponibilidades informadas"}`}
          />
          <RowLink
            href="/painel/dizimo"
            icon={HandCoins}
            title="Dízimo"
            subtitle={`${titheContributionCount} ${titheContributionCount === 1 ? "contribuição registrada" : "contribuições registradas"} em ${formatPeriodLabel(currentPeriod())}`}
          />
          <RowLink
            href="/painel/sacramentos"
            icon={ScrollText}
            title="Sacramentos"
            subtitle={`${pendingSacramentCount} ${pendingSacramentCount === 1 ? "aguardando validação" : "aguardando validação"}`}
          />
          {session.permissions.includes(PERMISSIONS.PERMISSION_OVERRIDES_MANAGE) && (
            <RowLink
              href="/painel/permissoes"
              icon={KeyRound}
              title="Delegar permissões"
              subtitle="Conceda ou revogue permissões por pessoa"
            />
          )}
        </Card>
      </section>

      <Card>
        <p className="mb-3 font-serif text-lg text-foreground">Convites</p>
        <CreateInviteForm />

        {invitations.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nenhum convite criado ainda.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-4">Código</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Usado por</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="border-b border-border">
                    <td className="py-2 pr-4 font-mono">/convite/{invitation.code}</td>
                    <td className="py-2 pr-4">{invitation.type}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={STATUS_TONE[invitation.status] ?? "muted"}>
                        {STATUS_LABEL[invitation.status] ?? invitation.status}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">{invitation.usedByUser?.fullName ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {invitation.status === "pending" && (
                        <form action={revokeInvitationAction}>
                          <input type="hidden" name="id" value={invitation.id} />
                          <Button type="submit" variant="ghost">
                            Revogar
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-3 font-serif text-lg text-foreground">Sacerdotes</p>
        {priests.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum sacerdote cadastrado ainda — crie um convite acima com vínculo &ldquo;Sacerdote&rdquo;.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {priests.map((priest) => (
              <li key={priest.id} className="flex items-center gap-2 text-sm text-foreground">
                {priest.user.fullName} <Badge>{priest.title}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <p className="mb-3 font-serif text-lg text-foreground">Agenda</p>
        <div className="flex flex-col gap-4">
          <CreateCelebrationForm priests={priests} />
          <CreateEventForm />
        </div>

        {agendaItems.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nenhum compromisso futuro cadastrado.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {agendaItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                <div>
                  <p className="text-foreground">{item.label}</p>
                  <p className="text-xs text-muted">
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
        <p className="font-serif text-lg text-foreground">Minha Caminhada</p>
        {reflectionAggregate.available ? (
          <p className="mt-1 text-sm text-muted">
            Nos últimos 30 dias, {reflectionAggregate.total} participações em missa foram registradas e{" "}
            {reflectionAggregate.rate}% vieram com uma reflexão.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">
            Ainda não há participações suficientes nos últimos 30 dias para mostrar um indicador sem identificar
            ninguém.
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          Só o indicador agregado é visível — o conteúdo das reflexões é sempre privado.
        </p>
      </Card>
    </div>
  );
}
