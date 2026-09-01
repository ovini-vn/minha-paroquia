import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listAllGroups, listInterestsForParish } from "@/server/modules/pastorais/service";
import { setPastoralGroupStatusAction } from "@/server/actions/pastoral-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { formatDateTime } from "@/lib/date";
import { CreatePastoralGroupForm } from "./CreatePastoralGroupForm";
import {
  FiltroDePastorais,
  VISOES,
  type VisaoDePastorais,
} from "./_components/FiltroDePastorais";

export const metadata: Metadata = { title: "Grupos e pastorais" };

export default async function PainelPastoraisPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const session = await requirePermissionForPage(PERMISSIONS.OPPORTUNITIES_MANAGE);
  if (!session.membership) return null;

  const parishId = session.membership.parishId;
  const [todas, interests] = await Promise.all([
    listAllGroups(parishId),
    listInterestsForParish(parishId),
  ]);

  const { ver } = await searchParams;
  const visao: VisaoDePastorais = VISOES.some((v) => v.id === ver)
    ? (ver as VisaoDePastorais)
    : "ativas";

  /*
   * O recorte é feito aqui, e não no banco.
   *
   * São quinze pastorais, e uma delas — "faltando informação" — depende de
   * dois campos vazios ao mesmo tempo, que em SQL fica pior de ler do que
   * de executar. No painel de missas o filtro foi ao banco porque lá a lista
   * vinha truncada em trinta e o recorte mentiria; aqui ela vem inteira.
   */
  const ativa = (g: (typeof todas)[number]) => g.status !== "inativa";
  const recorte: Record<VisaoDePastorais, (g: (typeof todas)[number]) => boolean> = {
    ativas: ativa,
    interessados: (g) => g._count.interests > 0,
    // As faltas só valem para quem está em atividade: cobrar o coordenador
    // de uma pastoral encerrada é pendência inventada.
    "sem-coordenador": (g) => ativa(g) && !g.leaderName,
    "sem-horario": (g) => ativa(g) && !g.meetsWhen,
    inativas: (g) => g.status === "inativa",
    todas: () => true,
  };

  const groups = todas.filter(recorte[visao]);
  const quantos = Object.fromEntries(
    VISOES.map((v) => [v.id, todas.filter(recorte[v.id]).length]),
  ) as Record<VisaoDePastorais, number>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Grupos e pastorais"
        description="Cadastre as pastorais da paróquia e veja quem se ofereceu para servir em cada uma."
      />

      <Card>
        <p className="mb-3 font-serif text-lg font-semibold text-foreground">Nova pastoral</p>
        <CreatePastoralGroupForm />
      </Card>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Pastorais cadastradas
        </Eyebrow>
        <div className="mb-4">
          <FiltroDePastorais atual={visao} quantos={quantos} />
        </div>

        {groups.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              todas.length === 0
                ? "Nenhuma pastoral cadastrada"
                : visao === "sem-coordenador"
                  ? "Toda pastoral ativa tem coordenador"
                  : visao === "sem-horario"
                    ? "Toda pastoral ativa tem horário"
                    : visao === "interessados"
                      ? "Ninguém esperando contato"
                      : "Nada neste recorte"
            }
            description={
              todas.length === 0
                ? "Cadastre acima as pastorais e grupos que existem na sua paróquia."
                : visao === "sem-coordenador" || visao === "sem-horario"
                  ? "O cadastro está completo — nada a preencher por aqui."
                  : visao === "interessados"
                    ? "Quando alguém se oferecer para servir numa pastoral, ela aparece aqui."
                    : "Há pastorais cadastradas em outro recorte."
            }
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex flex-wrap items-center gap-3 border-b border-border py-3.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14.5px] font-medium text-foreground">{group.name}</p>
                    {group.status === "inativa" && <Badge tone="muted">Inativa</Badge>}
                    {group._count.interests > 0 && (
                      <Badge tone="gold">
                        {group._count.interests}{" "}
                        {group._count.interests === 1 ? "interessado" : "interessados"}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {[group.leaderName, group.meetsWhen, group.meetsWhere]
                      .filter(Boolean)
                      .join(" · ") || "Sem coordenador ou horário informados"}
                  </p>
                </div>
                <form action={setPastoralGroupStatusAction}>
                  <input type="hidden" name="id" value={group.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={group.status === "ativa" ? "inativa" : "ativa"}
                  />
                  <Button type="submit" variant="ghost" size="sm">
                    {group.status === "ativa" ? "Desativar" : "Reativar"}
                  </Button>
                </form>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Quem se ofereceu
        </Eyebrow>
        {interests.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Ninguém manifestou interesse ainda"
            description="Quando alguém disser que quer servir numa pastoral, o nome aparece aqui para você entrar em contato."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {interests.map((interest) => (
              <div key={interest.id} className="border-b border-border py-3.5 last:border-b-0">
                <p className="text-[14.5px] font-medium text-foreground">
                  {interest.user.fullName}
                </p>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {interest.group.name} · {interest.user.email} ·{" "}
                  {formatDateTime(interest.createdAt)}
                </p>
              </div>
            ))}
          </Card>
        )}
      </section>

      <p className="text-xs leading-relaxed text-muted">
        Manifestar interesse não inscreve ninguém: o contato com cada pessoa continua sendo uma
        conversa do coordenador.
      </p>
    </div>
  );
}
