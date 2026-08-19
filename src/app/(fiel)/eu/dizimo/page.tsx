import { getSessionContext } from "@/server/auth/session";
import { listMyContributions } from "@/server/modules/dizimo/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPeriodLabel } from "@/lib/date";

export default async function MyTithePage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon="🙏"
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const contributions = await listMyContributions(session.membership.parishId, session.userId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-xl text-foreground">Minha participação no dízimo</h1>
        <p className="mt-1 text-sm text-muted">
          Registro de presença, sem valores — quem registra é a secretaria da paróquia.
        </p>
      </div>

      {contributions.length === 0 ? (
        <EmptyState
          icon="🙏"
          title="Nenhum registro ainda"
          description="Assim que a secretaria registrar sua contribuição, ela aparece aqui."
        />
      ) : (
        <Card>
          <ul className="flex flex-col gap-1.5">
            {contributions.map((contribution) => (
              <li key={contribution.id} className="border-b border-border py-2 text-sm text-foreground last:border-0">
                {formatPeriodLabel(contribution.period)}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
