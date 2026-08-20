import { getSessionContext } from "@/server/auth/session";
import { getOwnVolunteerProfile } from "@/server/modules/volunteering/service";
import { listOpenOpportunities, listMyInterests } from "@/server/modules/opportunities/service";
import { expressInterestAction } from "@/server/actions/opportunity-actions";
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/date";
import { HeartHandshake } from "lucide-react";

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
  const [volunteerProfile, opportunities, myInterests] = await Promise.all([
    getOwnVolunteerProfile(parishId, session.userId),
    listOpenOpportunities(parishId),
    listMyInterests(parishId, session.userId),
  ]);
  const interestedOpportunityIds = new Set(myInterests.map((i) => i.opportunityId));

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl text-foreground">Servir</h1>
        <p className="mt-1 text-sm text-muted">Existe um lugar para você na nossa comunidade.</p>
      </div>

      <Card>
        <p className="text-xs uppercase tracking-wide text-primary">Eu posso ajudar</p>
        {volunteerProfile ? (
          <>
            <p className="mt-1 text-sm text-muted">
              Obrigado por se colocar à disposição — sua comunidade já sabe como você pode ajudar.
            </p>
            <LinkButton href="/servir/posso-ajudar" variant="secondary" className="mt-3">
              Atualizar
            </LinkButton>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              Conte seu tempo, seu talento, ou como você quer servir sua comunidade.
            </p>
            <LinkButton href="/servir/posso-ajudar" className="mt-3">
              Eu posso ajudar
            </LinkButton>
          </>
        )}
      </Card>

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-primary">Oportunidades</p>
        {opportunities.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Nenhuma oportunidade em aberto no momento.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {opportunities.map((opportunity) => {
              const alreadyInterested = interestedOpportunityIds.has(opportunity.id);
              return (
                <Card key={opportunity.id}>
                  <p className="text-sm font-medium text-foreground">{opportunity.title}</p>
                  {opportunity.description && (
                    <p className="mt-1 text-sm text-muted">{opportunity.description}</p>
                  )}
                  {opportunity.startsAt && (
                    <p className="mt-1 text-xs text-muted">{formatDateTime(opportunity.startsAt)}</p>
                  )}
                  <div className="mt-3">
                    {alreadyInterested ? (
                      <Badge>Interesse manifestado</Badge>
                    ) : (
                      <form action={expressInterestAction}>
                        <input type="hidden" name="opportunityId" value={opportunity.id} />
                        <Button type="submit" variant="secondary">
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

      <LinkButton href="/servir/liturgia" variant="secondary" className="w-full">
        Liturgia — disponibilidade e escala
      </LinkButton>
    </div>
  );
}
