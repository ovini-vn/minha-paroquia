import { HandCoins, Check } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { listMyContributions } from "@/server/modules/dizimo/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/Typography";
import { Path, PathItem } from "@/components/ui/Path";
import { formatPeriodLabel } from "@/lib/date";

export default async function MyTithePage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={HandCoins}
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const contributions = await listMyContributions(session.membership.parishId, session.userId);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Dízimo"
        description="Registro de participação por período, sem valores. Quem registra é a secretaria da paróquia."
      />

      {contributions.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Nenhum registro ainda"
          description="Assim que a secretaria registrar sua contribuição, o período aparece aqui."
        />
      ) : (
        <Card>
          {/* Sequência de períodos: o mesmo caminho dourado da Caminhada. */}
          <Path>
            {contributions.map((contribution) => (
              <PathItem key={contribution.id} filled>
                <p className="flex items-center gap-2 text-[15px] font-medium capitalize text-foreground">
                  {formatPeriodLabel(contribution.period)}
                  <Check className="h-4 w-4 shrink-0 text-success" strokeWidth={2} aria-hidden />
                </p>
              </PathItem>
            ))}
          </Path>
        </Card>
      )}

      <p className="pt-5 text-xs leading-relaxed text-muted">
        O app não registra nem exibe valores — apenas em quais períodos houve contribuição.
      </p>

      <div className="rule-gold my-7" />
    </div>
  );
}
