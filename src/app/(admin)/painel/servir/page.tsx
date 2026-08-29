import type { Metadata } from "next";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS, isFullAdmin } from "@/server/auth/rbac";
import { listOpportunitiesForAdmin } from "@/server/modules/opportunities/service";
import { countVolunteerProfiles } from "@/server/modules/volunteering/service";
import { closeOpportunityAction, updateInterestStatusAction } from "@/server/actions/opportunity-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/date";
import { INTEREST_STATUS_LABELS } from "@/lib/servir-labels";
import { CreateOpportunityForm } from "./CreateOpportunityForm";

export const metadata: Metadata = { title: "Servir" };

export default async function ServirAdminPage() {
  const session = await requirePermissionForPage(PERMISSIONS.OPPORTUNITIES_MANAGE);
  if (!session.membership) return null;

  const fullAdmin = isFullAdmin(session.membership.roleCode);
  const [opportunities, volunteerCount] = await Promise.all([
    listOpportunitiesForAdmin(session.membership.parishId, fullAdmin ? undefined : session.userId),
    countVolunteerProfiles(session.membership.parishId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[29px] font-semibold leading-tight text-foreground">Servir</h1>
        <p className="mt-1 text-sm text-muted">
          {volunteerCount} {volunteerCount === 1 ? "pessoa se colocou" : "pessoas se colocaram"} à disposição para
          ajudar.
        </p>
        {!fullAdmin && (
          <p className="mt-1 text-xs text-muted">
            Mostrando só as oportunidades criadas por você. Pároco e secretaria veem todas.
          </p>
        )}
      </div>

      <Card>
        <p className="mb-3 font-serif text-lg font-semibold text-foreground">Nova oportunidade</p>
        <CreateOpportunityForm />
      </Card>

      {opportunities.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nenhuma oportunidade criada ainda.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {opportunities.map((opportunity) => (
            <Card key={opportunity.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{opportunity.title}</p>
                  {opportunity.description && <p className="text-sm text-muted">{opportunity.description}</p>}
                  {opportunity.startsAt && (
                    <p className="text-xs text-muted">{formatDateTime(opportunity.startsAt)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{opportunity.status === "aberta" ? "Aberta" : "Encerrada"}</Badge>
                  {opportunity.status === "aberta" && (
                    <form action={closeOpportunityAction}>
                      <input type="hidden" name="id" value={opportunity.id} />
                      <Button type="submit" variant="ghost">
                        Encerrar
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              {opportunity.interests.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Ninguém manifestou interesse ainda.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                  {opportunity.interests.map((interest) => (
                    <li key={interest.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-foreground">{interest.user.fullName}</p>
                        <p className="text-xs text-muted">{interest.user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{INTEREST_STATUS_LABELS[interest.status]}</Badge>
                        {interest.status === "manifestado" && (
                          <form action={updateInterestStatusAction}>
                            <input type="hidden" name="id" value={interest.id} />
                            <input type="hidden" name="status" value="em_contato" />
                            <Button type="submit" variant="secondary">
                              Em contato
                            </Button>
                          </form>
                        )}
                        {(interest.status === "manifestado" || interest.status === "em_contato") && (
                          <>
                            <form action={updateInterestStatusAction}>
                              <input type="hidden" name="id" value={interest.id} />
                              <input type="hidden" name="status" value="acolhido" />
                              <Button type="submit" variant="secondary">
                                Acolhido
                              </Button>
                            </form>
                            <form action={updateInterestStatusAction}>
                              <input type="hidden" name="id" value={interest.id} />
                              <input type="hidden" name="status" value="declinado" />
                              <Button type="submit" variant="ghost">
                                Declinar
                              </Button>
                            </form>
                          </>
                        )}
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
