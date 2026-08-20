import { notFound } from "next/navigation";
import { Church, Landmark, Users, PartyPopper } from "lucide-react";
import { requireDioceseAccessForPage } from "@/server/auth/guards";
import { getDioceseOverview, listDioceseMembers } from "@/server/modules/dioceses/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { DIOCESE_ROLE_LABELS } from "@/lib/diocese-labels";

export default async function DioceseOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Autorização acontece AQUI, antes de qualquer leitura de dado diocesano.
  await requireDioceseAccessForPage(id);

  const [overview, members] = await Promise.all([
    getDioceseOverview(id),
    listDioceseMembers(id),
  ]);
  if (!overview) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={overview.diocese.name}
        description={
          overview.diocese.state
            ? `Conjunto das paróquias · ${overview.diocese.state}`
            : "Conjunto das paróquias"
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Paróquias" value={overview.totals.parishes} />
        <Stat label="Fiéis" value={overview.totals.members} />
        <Stat label="Sacerdotes" value={overview.totals.priests} />
      </div>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Paróquias
        </Eyebrow>
        {overview.parishes.length === 0 ? (
          <EmptyState
            icon={Church}
            title="Nenhuma paróquia vinculada"
            description="Vincule paróquias a esta diocese na administração da plataforma."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {overview.parishes.map((parish) => (
              <div
                key={parish.parishId}
                className="flex flex-wrap items-center gap-3 border-b border-border py-3.5 last:border-b-0"
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <Church className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground">{parish.parishName}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {[parish.city, parish.state].filter(Boolean).join(" · ") || "Cidade não informada"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Badge tone="muted">
                    <Users className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                    {parish.memberCount}
                  </Badge>
                  <Badge tone="muted">
                    <Church className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                    {parish.priestCount}
                  </Badge>
                  {parish.upcomingEventCount > 0 && (
                    <Badge tone="gold">
                      <PartyPopper className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                      {parish.upcomingEventCount}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Quem acompanha a diocese
        </Eyebrow>
        {members.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="Ninguém vinculado ainda"
            description="Vincule o bispo a esta diocese na administração da plataforma."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
              >
                <Avatar name={member.user.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground">
                    {member.user.fullName}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted">{member.user.email}</p>
                </div>
                <Badge>{DIOCESE_ROLE_LABELS[member.role]}</Badge>
              </div>
            ))}
          </Card>
        )}
      </section>

      <p className="text-xs leading-relaxed text-muted">
        Esta visão mostra números do conjunto. Os dados de cada paróquia — pedidos de oração,
        reflexões, dízimo — continuam isolados na paróquia de origem e não são acessíveis daqui.
      </p>
    </div>
  );
}
