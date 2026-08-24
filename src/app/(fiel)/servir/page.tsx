import Link from "next/link";
import { HeartHandshake, Music, Check, CalendarDays, Clock } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getOwnVolunteerProfile } from "@/server/modules/volunteering/service";
import { listOpenOpportunities, listMyInterests } from "@/server/modules/opportunities/service";
import { getMyMainPastoral } from "@/server/modules/pastorais/service";
import { expressInterestAction } from "@/server/actions/opportunity-actions";
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowLink } from "@/components/ui/RowLink";
import { Eyebrow, SectionTitle } from "@/components/ui/Typography";
import { formatDateTime } from "@/lib/date";
import { AcoesRapidas } from "@/components/domain/AcoesRapidas";
import { CreateOpportunityForm } from "@/app/(admin)/painel/servir/CreateOpportunityForm";

export default async function ServirPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={HeartHandshake}
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const parishId = session.membership.parishId;
  const [volunteerProfile, opportunities, myInterests, minhaPastoral] = await Promise.all([
    getOwnVolunteerProfile(parishId, session.userId),
    listOpenOpportunities(parishId),
    listMyInterests(parishId, session.userId),
    getMyMainPastoral(parishId, session.userId),
  ]);
  const interestedOpportunityIds = new Set(myInterests.map((i) => i.opportunityId));

  // Só quem gerencia oportunidades vê a ação; o fiel comum não recebe
  // nenhuma e a barra nem aparece.
  const podeLancar =
    session.isPlatformAdmin || session.permissions.includes(PERMISSIONS.OPPORTUNITIES_MANAGE);

  return (
    <div className="flex flex-col">
      {/*
        Quem já serve vem PRIMEIRO, antes do convite para servir. Abrir esta
        aba e ver "existe um lugar para você" quando a pessoa já está numa
        pastoral há meses é o app não reconhecer o que ela faz.
      */}
      {minhaPastoral && (
        <Link
          href="/comunidade/pastorais"
          className="mb-4 block rounded-lg border border-primary/35 bg-primary-tint p-4 transition-colors hover:border-primary"
        >
          <Eyebrow tone="accent">Minha pastoral</Eyebrow>
          <p className="mt-1.5 font-serif text-[19px] font-semibold leading-tight text-foreground">
            {minhaPastoral.name}
          </p>
          {(minhaPastoral.meetsWhen || minhaPastoral.meetsWhere) && (
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
              <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              {[minhaPastoral.meetsWhen, minhaPastoral.meetsWhere].filter(Boolean).join(" · ")}
            </p>
          )}
          {minhaPastoral.leaderName && (
            <p className="mt-0.5 text-[13px] text-muted">
              Coordenação: {minhaPastoral.leaderName}
            </p>
          )}
        </Link>
      )}

      {/* Chamada principal — o coração desta aba, em destaque dourado. */}
      <div className="rounded-lg border border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent p-5">
        <Eyebrow className="text-[#8a6b24] dark:text-gold">Serviço</Eyebrow>
        <h1 className="mb-2 mt-2 font-serif text-[26px] font-semibold leading-tight text-foreground">
          Existe um lugar para você.
        </h1>
        {volunteerProfile ? (
          <>
            <p className="max-w-[34ch] text-[13.5px] text-muted">
              Obrigado por se colocar à disposição — sua comunidade já sabe como você pode ajudar.
            </p>
            <LinkButton href="/servir/posso-ajudar" variant="gold" className="mt-4 flex w-full">
              Atualizar como posso ajudar
            </LinkButton>
          </>
        ) : (
          <>
            <p className="max-w-[34ch] text-[13.5px] text-muted">
              Conte seu tempo, seu talento, ou como você quer servir sua comunidade.
            </p>
            <LinkButton href="/servir/posso-ajudar" className="mt-4 flex w-full">
              <HeartHandshake className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
              Eu posso ajudar
            </LinkButton>
          </>
        )}
      </div>

      <section className="pt-7">
        <SectionTitle eyebrow="Oportunidades" title="Onde precisam de você" />
        {podeLancar && (
          <AcoesRapidas
            acoes={[
              {
                id: "oportunidade",
                label: "Nova oportunidade",
                icone: <HeartHandshake className="h-4 w-4" strokeWidth={1.5} aria-hidden />,
                conteudo: <CreateOpportunityForm />,
              },
            ]}
          />
        )}
        {opportunities.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhuma oportunidade em aberto"
            description="Quando a paróquia precisar de voluntários, aparece aqui."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {opportunities.map((opportunity) => {
              const alreadyInterested = interestedOpportunityIds.has(opportunity.id);
              return (
                <Card key={opportunity.id}>
                  <p className="font-serif text-lg font-semibold leading-tight text-foreground">
                    {opportunity.title}
                  </p>
                  {opportunity.description && (
                    <p className="mt-1.5 text-[13.5px] text-muted">{opportunity.description}</p>
                  )}
                  {opportunity.startsAt && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                      <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                      {formatDateTime(opportunity.startsAt)}
                    </p>
                  )}
                  <div className="mt-3.5">
                    {alreadyInterested ? (
                      <Badge tone="success">
                        <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        Interesse manifestado
                      </Badge>
                    ) : (
                      <form action={expressInterestAction}>
                        <input type="hidden" name="opportunityId" value={opportunity.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Tenho interesse
                        </Button>
                      </form>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="pt-7">
        <Eyebrow tone="accent" className="mb-3">
          Servir na celebração
        </Eyebrow>
        <Card className="px-3.5 py-1.5">
          <RowLink
            href="/servir/liturgia"
            icon={Music}
            title="Liturgia"
            subtitle="Minha disponibilidade e escala"
          />
        </Card>
      </section>

      <div className="rule-gold my-7" />
    </div>
  );
}
