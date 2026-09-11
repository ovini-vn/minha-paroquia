import type { Metadata } from "next";
import { requirePermissionForPage, podeAlcancar } from "@/server/auth/guards";
import { getManagementAccess } from "@/server/auth/management";
import { PERMISSIONS } from "@/server/auth/rbac";
import { ITENS_DO_PAINEL, GRUPOS_DO_PAINEL } from "@/components/layout/painel-items";
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
import { currentPeriod, formatPeriodLabel, formatDateOnly } from "@/lib/date";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stat } from "@/components/ui/Stat";
import { RowLink } from "@/components/ui/RowLink";
import { Eyebrow } from "@/components/ui/Typography";
import { formatDateTime } from "@/lib/date";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";
import { revokeInvitationAction } from "@/server/actions/invitation-actions";
import { Button, LinkButton } from "@/components/ui/Button";
import { CreateInviteForm } from "./CreateInviteForm";
import { CreateCelebrationForm } from "./CreateCelebrationForm";
import { CreateEventForm } from "./CreateEventForm";
import { ParishProfileForm } from "./ParishProfileForm";
import { isUploadConfigured, diagnosticoDoUpload } from "@/server/modules/uploads/service";
import { nomeDoSacerdote } from "@/lib/sacerdote";
import { SacerdoteSemContaForm } from "./SacerdoteSemContaForm";
import { apagarSacerdoteAction } from "@/server/actions/sacerdote-actions";
import {
  Church,
  Crown,
  Flag,
  Landmark,
  Settings,
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

export const metadata: Metadata = { title: "Painel da paróquia" };

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
      priestName: c.priestProfile ? nomeDoSacerdote(c.priestProfile) : null,
      semHora: c.semHora,
    })),
    ...events.map((e) => ({
      id: `event-${e.id}`,
      startsAt: e.startsAt,
      label: e.title,
      location: e.location,
      priestName: null as string | null,
      semHora: e.semHora,
    })),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const itensDoPainel = ITENS_DO_PAINEL.filter(
    (item) => !item.permissao || podeAlcancar(session, item.permissao),
  );

  /*
   * O que cada destino tem a dizer HOJE.
   *
   * Fica aqui, e não na lista compartilhada, porque quase toda legenda é
   * uma contagem: quantos pedidos esperam, quantas turmas existem. Levar
   * isso para um arquivo de navegação puxaria meia dúzia de consultas para
   * dentro dele — e a barra lateral, que não mostra legenda nenhuma,
   * pagaria por todas elas em cada tela do painel.
   */
  const LEGENDAS: Record<string, string> = {
    "/painel/acesso": "Gerar um link de nova senha para um membro",
    "/painel/oracao":
      pedidosPendentes > 0
        ? `${pedidosPendentes} aguardando aprovação para o mural`
        : "Aprovar o que vai ao mural da comunidade",
    "/painel/sacramentos": `${pendingSacramentCount} aguardando validação`,
    "/painel/financeiro": "Finalidades das contribuições e o PIX identificado",
    "/painel/dizimo": `${titheContributionCount} ${titheContributionCount === 1 ? "contribuição registrada" : "contribuições registradas"} em ${formatPeriodLabel(currentPeriod())}`,
    "/painel/doacao": "Chave PIX, finalidades e o que a paróquia realiza",
    "/painel/avisos": `${publishedAvisoCount} ${publishedAvisoCount === 1 ? "publicado" : "publicados"}`,
    "/painel/eventos": `${events.length} ${events.length === 1 ? "futuro" : "futuros"}`,
    "/painel/aniversarios": "Nascimento e sacramentos dos próximos 30 dias",
    "/painel/pastorais": `${pastoralGroupCount} ${pastoralGroupCount === 1 ? "pastoral cadastrada" : "pastorais cadastradas"}`,
    "/painel/servir": `${volunteerCount} ${volunteerCount === 1 ? "pessoa disponível" : "pessoas disponíveis"} · ${openOpportunities.length} ${openOpportunities.length === 1 ? "oportunidade aberta" : "oportunidades abertas"}`,
    "/catequese": `${catechismGroupCount} ${catechismGroupCount === 1 ? "turma" : "turmas"}`,
    "/painel/liturgia": `${liturgicalAvailabilityCount} ${liturgicalAvailabilityCount === 1 ? "disponibilidade informada" : "disponibilidades informadas"}`,
    "/painel/missas": "O que se repete toda semana ou todo mês",
    "/painel/paroco": "A apresentação do pároco e a foto dele",
    "/painel/historia": "O memorial da paróquia e a foto da igreja",
    "/painel/expediente": "Aparece em Contato, com o aviso de aberta ou fechada",
    "/painel/plano": "O objetivo do ano, as prioridades e os eixos",
    "/painel/membros": "Quem é catequista, coordenador, secretaria",
    "/painel/permissoes": "Conceda ou revogue permissões por pessoa",
    "/painel/auditoria": "Quem mudou papéis, permissões e senhas",
  };

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

      {/*
        As áreas, saindo da MESMA lista da barra lateral.

        Eram duas listas escritas à mão — esta e a do computador — e duas
        listas da mesma coisa divergem: um destino novo entra numa e falta
        na outra. Agora o que existe está em `painel-items.ts`, e aqui fica
        só o que esta página sabe e a barra não: as contagens.
      */}
      {/*
        Os grupos LADO A LADO no computador.

        Agrupar sozinho piorou: o índice foi de 5.248px para 5.624px,
        porque seis títulos entraram numa coluna só. Empilhar grupos numa
        fita estreita é justamente o que sobra de espaço para fazer no
        celular — no computador há 844px de largura parados.

        Duas colunas, e não três: com três, a legenda "Nascimento e
        sacramentos dos próximos 30 dias" quebraria em três linhas, e o
        índice ficaria mais curto às custas de ficar mais difícil de ler.

        `items-start` para cada grupo ter a altura do próprio conteúdo —
        sem isso, os dois grupos de uma linha esticam até o mais alto e
        sobra um vão dentro do cartão menor.
      */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:gap-y-7">
        {GRUPOS_DO_PAINEL.map((grupo) => {
          const doGrupo = itensDoPainel.filter((item) => item.grupo === grupo);
          if (doGrupo.length === 0) return null;
          return (
            <section key={grupo}>
              <Eyebrow tone="accent" className="mb-3">
                {grupo}
              </Eyebrow>
              <Card className="px-3.5 py-1.5">
                {doGrupo.map((item) => (
                  <RowLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    title={item.label}
                    subtitle={LEGENDAS[item.href] ?? ""}
                  />
                ))}
              </Card>
            </section>
          );
        })}
      </div>

      {(acesso.national || acesso.provinces || acesso.dioceses || acesso.platform) && (
        <section>
          <Eyebrow tone="accent" className="mb-3">
            Acompanhamento
          </Eyebrow>
          {/* Grade quando couber — ver `.lista-adaptavel` em globals.css. */}
          <div className="lista-adaptavel">
          <Card className="card-adaptavel px-3.5 py-1.5">
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
          </div>
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
            Nenhum sacerdote cadastrado ainda — crie um convite acima com vínculo
            &ldquo;Sacerdote&rdquo;, ou cadastre abaixo quem não usa o aplicativo.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {priests.map((priest) => (
              <li key={priest.id} className="border-b border-border pb-3 last:border-b-0">
                <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                  {nomeDoSacerdote(priest)} <Badge>{priest.title}</Badge>
                  {/*
                    Quem NÃO usa o app se reconhece na lista, e é a informação
                    que muda o que a secretaria faz: a agenda dele não vai
                    aparecer sozinha, alguém tem de marcar por telefone.
                  */}
                  {priest.userId ? (
                    <span className="text-xs text-muted">
                      Define a própria agenda em &ldquo;Minha disponibilidade&rdquo;
                    </span>
                  ) : (
                    <Badge tone="muted">Não usa o app</Badge>
                  )}
                </div>

                {/*
                  A agenda dele tem tela própria, e o painel só aponta.
                  Caixas e lista de janelas aqui dentro espremeriam as duas
                  coisas numa linha que já carrega nome, cargo e tarja.
                */}
                {!priest.userId && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <LinkButton href={`/painel/sacerdotes/${priest.id}`} variant="ghost" size="sm">
                      Horários e o que atende
                    </LinkButton>
                    {/* Formulário separado do link: apagar por engano ao
                        mirar no botão ao lado é o acidente que a separação
                        evita. */}
                    <form action={apagarSacerdoteAction}>
                      <input type="hidden" name="id" value={priest.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Remover
                      </Button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <SacerdoteSemContaForm />
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
                    {item.semHora ? formatDateOnly(item.startsAt) : formatDateTime(item.startsAt)}
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
