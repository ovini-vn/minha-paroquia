import { requirePermissionForPage } from "@/server/auth/guards";
import { getManagementAccess } from "@/server/auth/management";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getParishDashboardCounts, getParish } from "@/server/modules/parishes/service";
import { listAllAvisos } from "@/server/modules/avisos/service";
import { countPendingPrayerRequests } from "@/server/modules/prayer-requests/service";
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
import { isUploadConfigured, diagnosticoDoUpload } from "@/server/modules/uploads/service";
import { BookOpen, Cake, Church, Clock, Crown, Flag, HandCoins, HandHeart, HeartHandshake, KeyRound, Landmark, Megaphone, Music, PartyPopper, Repeat, ScrollText, Settings, UserRound, Users } from "lucide-react";

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
  // Quem chega aqui é a secretaria; as visões acima da paróquia entram
  // no fim da página para que tudo o que NÃO é vida pessoal fique num
  // lugar só. Ver src/app/(fiel)/gestao para quem não tem o painel.
  const acesso = getManagementAccess(session);

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
    pedidosPendentes,
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
    countPendingPrayerRequests(session.membership.parishId),
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
        <h1 className="font-serif text-[29px] font-semibold leading-tight text-foreground">{session.membership.parishName}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Fiéis" value={counts.fielCount} />
        <Stat label="Sacerdotes" value={counts.sacerdoteCount} />
        <Stat label="Foram para outra" value={counts.sairam} />
      </div>

      <Card>
        <p className="mb-3 font-serif text-lg font-semibold text-foreground">Perfil da paróquia</p>
        <p className="mb-3 text-sm text-muted">
          Essas informações aparecem para o fiel em Minha Comunidade e na tela de Contato.
        </p>
        <ParishProfileForm
          city={parish?.city ?? ""}
          state={parish?.state ?? ""}
          address={parish?.address ?? ""}
          phone={parish?.phone ?? ""}
          description={parish?.description ?? ""}
          logoUrl={parish?.logoUrl ?? ""}
          whatsapp={parish?.whatsapp ?? ""}
          facebookUrl={parish?.facebookUrl ?? ""}
          instagramUrl={parish?.instagramUrl ?? ""}
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
            href="/painel/missas"
            icon={Repeat}
            title="Horários das missas"
            subtitle="O que se repete toda semana ou todo mês"
          />
          <RowLink
            href="/painel/doacao"
            icon={HandCoins}
            title="Doação"
            subtitle="Chave PIX, finalidades e o que a paróquia realiza"
          />
          <RowLink
            href="/painel/paroco"
            icon={UserRound}
            title="Nosso Pároco"
            subtitle="A apresentação do pároco e a foto dele"
          />
          <RowLink
            href="/painel/historia"
            icon={Landmark}
            title="Nossa História"
            subtitle="O memorial da paróquia e a foto da igreja"
          />
          <RowLink
            href="/painel/expediente"
            icon={Clock}
            title="Horário da secretaria"
            subtitle="Aparece em Contato, com o aviso de aberta ou fechada"
          />
          <RowLink
            href="/painel/oracao"
            icon={HandHeart}
            title="Pedidos de oração"
            subtitle={
              pedidosPendentes > 0
                ? `${pedidosPendentes} aguardando aprovação para o mural`
                : "Aprovar o que vai ao mural da comunidade"
            }
          />
          <RowLink
            href="/painel/aniversarios"
            icon={Cake}
            title="Aniversários"
            subtitle="Nascimento e sacramentos dos próximos 30 dias"
          />
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
          {/* "Leituras do dia" saiu daqui: a tela do fiel que mostrava
              essas leituras foi removida, porque repetia a Palavra do Padre
              e exigia digitação DIÁRIA para não parecer abandonada. A rota
              /painel/liturgia-do-dia e o que já foi publicado continuam
              existindo — só não há mais como chegar nela por engano e
              trabalhar para ninguém ver. */}
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
          {/* Uma entrada só: a tela mostra coordenação, minhas turmas e
              meus filhos conforme o papel de quem abre. Antes eram
              "Catequese" e "Minha catequese" lado a lado, sem que a
              diferença ficasse clara. */}
          <RowLink
            href="/catequese"
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
          {/* Vem ANTES de "Membros e papéis": é o que a secretaria mais
              vai usar, e é a única entrada que ela enxerga neste bloco. */}
          {session.permissions.includes(PERMISSIONS.MEMBER_PASSWORD_RESET) && (
            <RowLink
              href="/painel/acesso"
              icon={KeyRound}
              title="Esqueci minha senha"
              subtitle="Gerar link de nova senha para quem não consegue entrar"
            />
          )}
          {session.permissions.includes(PERMISSIONS.PERMISSION_OVERRIDES_MANAGE) && (
            <RowLink
              href="/painel/membros"
              icon={Users}
              title="Membros e papéis"
              subtitle="Quem é catequista, coordenador, secretaria"
            />
          )}
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

      {(acesso.national || acesso.provinces || acesso.dioceses || acesso.platform) && (
        <section>
          <Eyebrow tone="accent" className="mb-3">
            Acompanhamento
          </Eyebrow>
          <Card className="px-3.5 py-1.5">
            {acesso.national && (
              <RowLink
                href="/nacional"
                icon={Flag}
                title="Visão nacional"
                subtitle="Províncias e dioceses do país"
              />
            )}
            {session.provinces.map((province) => (
              <RowLink
                key={province.id}
                href={`/provincia/${province.id}`}
                icon={Crown}
                title={province.name}
                subtitle="Província eclesiástica"
              />
            ))}
            {acesso.dioceses && (
              <RowLink
                href="/diocese"
                icon={Landmark}
                title={session.dioceses.length === 1 ? session.dioceses[0]!.name : "Dioceses"}
                subtitle="Visão do conjunto das paróquias"
              />
            )}
            {acesso.platform && (
              <>
                <RowLink
                  href="/plataforma/dioceses"
                  icon={Settings}
                  title="Dioceses e paróquias"
                  subtitle="Administração da plataforma"
                />
                <RowLink
                  href="/plataforma/estrutura"
                  icon={Settings}
                  title="Estrutura eclesiástica"
                  subtitle="Províncias, sedes e acesso nacional"
                />
              </>
            )}
          </Card>
        </section>
      )}

      <Card>
        <p className="mb-3 font-serif text-lg font-semibold text-foreground">Convites</p>
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
        <p className="mb-3 font-serif text-lg font-semibold text-foreground">Sacerdotes</p>
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
        <p className="mb-3 font-serif text-lg font-semibold text-foreground">Agenda</p>
        <div className="flex flex-col gap-4">
          <CreateCelebrationForm priests={priests} />
          <CreateEventForm
              podeEnviarArquivo={isUploadConfigured()}
              motivoIndisponivel={diagnosticoDoUpload()}
            />
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
        <p className="font-serif text-lg font-semibold text-foreground">Minha Caminhada</p>
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
