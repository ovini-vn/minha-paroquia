import type { Metadata } from "next";
import Link from "next/link";
import { Users, Check, Clock, MapPin, UserRound, CalendarDays, ChevronRight } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { listActiveGroups, listMyGroupInterests } from "@/server/modules/pastorais/service";
import { meusGrupos } from "@/server/modules/grupos/service";
import {
  expressPastoralInterestAction,
  withdrawPastoralInterestAction,
} from "@/server/actions/pastoral-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/Typography";

export const metadata: Metadata = { title: "Pastorais" };

export default async function PastoraisPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={Users}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para acompanhar a vida da comunidade."
      />
    );
  }

  const parishId = session.membership.parishId;
  const [groups, myInterests, deQueFacoParte] = await Promise.all([
    listActiveGroups(parishId),
    listMyGroupInterests(parishId, session.userId),
    meusGrupos(parishId, session.userId),
  ]);
  const interested = new Set(myInterests.filter((i) => i.status !== "declinado").map((i) => i.groupId));
  const souDoGrupo = new Set(deQueFacoParte.map((m) => m.group.id));

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Grupos e pastorais"
        description="Cada pastoral sustenta uma parte da vida da comunidade. Diga que tem interesse e o coordenador procura você."
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhuma pastoral cadastrada"
          description="Assim que a paróquia cadastrar suas pastorais, elas aparecem aqui."
        />
      ) : (
        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-5">
          {groups.map((group) => {
            const jaTemInteresse = interested.has(group.id);
            const detalhes = [
              group.leaderName ? { icon: UserRound, text: group.leaderName } : null,
              group.meetsWhen ? { icon: Clock, text: group.meetsWhen } : null,
              group.meetsWhere ? { icon: MapPin, text: group.meetsWhere } : null,
            ].filter((d): d is { icon: typeof UserRound; text: string } => d !== null);

            return (
              <Card key={group.id}>
                <Link
                  href={`/comunidade/pastorais/${group.id}`}
                  className="font-serif text-lg font-semibold leading-tight text-foreground hover:text-primary"
                >
                  {group.name}
                </Link>
                {group.description && (
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                    {group.description}
                  </p>
                )}

                {detalhes.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
                    {detalhes.map((d) => (
                      <p key={d.text} className="flex items-center gap-2 text-[13px] text-muted">
                        <d.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                        {d.text}
                      </p>
                    ))}
                  </div>
                )}

                {/* O cronograma é o que um grupo com vida própria tem a
                    mostrar — o de adolescentes, com os encontros do ano. */}
                <Link
                  href={`/comunidade/pastorais/${group.id}`}
                  className="alvo-de-toque mt-3 flex items-center gap-2 rounded-md text-[13.5px] font-medium text-primary"
                >
                  <CalendarDays className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
                  {group._count.encontros > 0
                    ? `Ver o cronograma · ${group._count.encontros} ${group._count.encontros === 1 ? "encontro" : "encontros"}`
                    : "Ver o grupo"}
                  <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
                </Link>

                <div className="mt-3">
                  {souDoGrupo.has(group.id) ? (
                    <Badge tone="success">
                      <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      Você faz parte
                    </Badge>
                  ) : jaTemInteresse ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="success">
                        <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        Interesse registrado
                      </Badge>
                      <form action={withdrawPastoralInterestAction}>
                        <input type="hidden" name="groupId" value={group.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Retirar
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <form action={expressPastoralInterestAction}>
                      <input type="hidden" name="groupId" value={group.id} />
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

      <p className="pt-5 text-[13px] leading-relaxed text-muted">
        Manifestar interesse não inscreve você na pastoral — apenas avisa o coordenador, que entra
        em contato.
      </p>

      <div className="rule-gold my-7" />
    </div>
  );
}
