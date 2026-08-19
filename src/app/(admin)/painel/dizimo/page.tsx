import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listActiveMembers } from "@/server/modules/parishes/service";
import { listContributionsForPeriod } from "@/server/modules/dizimo/service";
import { setContributionAction } from "@/server/actions/dizimo-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
  const period = requestedPeriod && PERIOD_RE.test(requestedPeriod) ? requestedPeriod : currentPeriod();

  const [members, contributions] = await Promise.all([
    listActiveMembers(session.membership.parishId),
    listContributionsForPeriod(session.membership.parishId, period),
  ]);
  const contributedUserIds = new Set(contributions.map((c) => c.userId));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-ink-900">Dízimo</h1>
      <p className="text-sm text-ink-700">
        Registro de presença de contribuição por período — sem valores. Contribuições em dinheiro/pagamento entram
        numa fase futura.
      </p>

      <Card>
        <form className="flex items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink-700">
            Período
            <input
              type="month"
              name="period"
              defaultValue={period}
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
            />
          </label>
          <Button type="submit" variant="secondary">
            Ver
          </Button>
        </form>
      </Card>

      <Card>
        <p className="mb-3 font-serif text-lg text-ink-900">
          {formatPeriodLabel(period)} · {contributedUserIds.size} de {members.length}
        </p>

        {members.length === 0 ? (
          <p className="text-sm text-ink-700">Nenhum membro ativo nesta paróquia.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {members.map((membership) => {
              const contributed = contributedUserIds.has(membership.user.id);
              return (
                <li
                  key={membership.user.id}
                  className="flex items-center justify-between border-b border-border py-2 text-sm"
                >
                  <span className="text-ink-900">{membership.user.fullName}</span>
                  <div className="flex items-center gap-2">
                    <Badge>{contributed ? "Contribuiu" : "Sem registro"}</Badge>
                    <form action={setContributionAction}>
                      <input type="hidden" name="userId" value={membership.user.id} />
                      <input type="hidden" name="period" value={period} />
                      <input type="hidden" name="contributed" value={contributed ? "false" : "true"} />
                      <Button type="submit" variant="ghost">
                        {contributed ? "Desmarcar" : "Marcar"}
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
