import { Check } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listActiveMembers } from "@/server/modules/parishes/service";
import { listContributionsForPeriod } from "@/server/modules/dizimo/service";
import { setContributionAction } from "@/server/actions/dizimo-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Stat } from "@/components/ui/Stat";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { currentPeriod, formatPeriodLabel } from "@/lib/date";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function DizimoAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await requirePermissionForPage(PERMISSIONS.DIZIMO_MANAGE);
  if (!session.membership) return null;

  const requestedPeriod = (await searchParams).period;
  const period =
    requestedPeriod && PERIOD_RE.test(requestedPeriod) ? requestedPeriod : currentPeriod();

  const [members, contributions] = await Promise.all([
    listActiveMembers(session.membership.parishId),
    listContributionsForPeriod(session.membership.parishId, period),
  ]);
  const contributedUserIds = new Set(contributions.map((c) => c.userId));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dízimo"
        description="Registro de participação por período, sem valores. O app não guarda nem exibe quantias."
      />

      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="period"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-muted"
            >
              Período
            </label>
            <input
              id="period"
              type="month"
              name="period"
              defaultValue={period}
              className={INPUT_CLASSES}
            />
          </div>
          <Button type="submit" variant="ghost">
            Ver
          </Button>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Stat label={`Contribuíram em ${formatPeriodLabel(period)}`} value={contributedUserIds.size} />
        <Stat label="Membros ativos" value={members.length} />
      </div>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Membros
        </Eyebrow>
        {members.length === 0 ? (
          <Card>
            <p className="text-[13.5px] text-muted">Nenhum membro ativo nesta paróquia.</p>
          </Card>
        ) : (
          <Card className="px-3.5 py-1.5">
            {members.map((membership) => {
              const contributed = contributedUserIds.has(membership.user.id);
              return (
                <div
                  key={membership.user.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-b-0"
                >
                  <Avatar name={membership.user.fullName} size="sm" />
                  <p className="min-w-0 flex-1 text-[14.5px] text-foreground">
                    {membership.user.fullName}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    {contributed && (
                      <Badge tone="success">
                        <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        Contribuiu
                      </Badge>
                    )}
                    <form action={setContributionAction}>
                      <input type="hidden" name="userId" value={membership.user.id} />
                      <input type="hidden" name="period" value={period} />
                      <input
                        type="hidden"
                        name="contributed"
                        value={contributed ? "false" : "true"}
                      />
                      <Button type="submit" variant="ghost" size="sm">
                        {contributed ? "Desmarcar" : "Marcar"}
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
