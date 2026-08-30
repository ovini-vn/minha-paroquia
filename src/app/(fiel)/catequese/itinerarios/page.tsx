import type { Metadata } from "next";
import Link from "next/link";
import { Route, ChevronRight } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listarItinerarios } from "@/server/modules/catequese/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { CriarItinerarioForm } from "../_components/CriarItinerarioForm";

export const metadata: Metadata = { title: "Itinerários" };

/**
 * Os planos de formação da paróquia.
 *
 * O itinerário é DIGITADO aqui, e não vem pronto no app: o material da
 * catequese muda de arquidiocese para arquidiocese, e um roteiro embutido
 * estaria errado para quase todo mundo. A coordenação escreve o dela uma vez
 * e reaproveita todo ano.
 *
 * É a peça que faltava para responder "como está a evolução da turma".
 * Antes dela, "12 encontros dados" não dizia nada — faltava o denominador.
 */
export default async function ItinerariosPage() {
  const session = await requirePermissionForPage(PERMISSIONS.CATEQUESE_MANAGE);
  if (!session.membership) return null;

  const itinerarios = await listarItinerarios(session.membership.parishId);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Itinerários"
        description="O plano que cada turma segue: os encontros previstos, na ordem em que acontecem."
      />

      <Card>
        <Eyebrow className="mb-3">Novo itinerário</Eyebrow>
        <CriarItinerarioForm />
      </Card>

      <section className="pt-7">
        <Eyebrow tone="accent" className="mb-3">
          Da sua paróquia
        </Eyebrow>

        {itinerarios.length === 0 ? (
          <EmptyState
            icon={Route}
            title="Nenhum itinerário ainda"
            description="Comece pelo primeiro — por exemplo, a Eucaristia do 1º ano. Depois é só digitar os encontros previstos, um a um."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {itinerarios.map((itinerario) => (
              <Link
                key={itinerario.id}
                href={`/catequese/itinerarios/${itinerario.id}`}
                className="flex items-center gap-3.5 border-b border-border py-3.5 transition-colors last:border-b-0 hover:bg-primary-tint"
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <Route className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground">{itinerario.nome}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {itinerario._count.temas === 0
                      ? "Nenhum encontro digitado ainda"
                      : `${itinerario._count.temas} ${
                          itinerario._count.temas === 1 ? "encontro" : "encontros"
                        } previstos`}
                    {itinerario._count.grupos > 0 &&
                      ` · ${itinerario._count.grupos} ${
                        itinerario._count.grupos === 1 ? "turma segue" : "turmas seguem"
                      }`}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-border-strong"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
