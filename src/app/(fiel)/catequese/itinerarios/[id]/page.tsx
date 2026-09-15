import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListOrdered, Trash2, X } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { obterItinerario } from "@/server/modules/catequese/service";
import { removerTemaAction, desligarParagrafoDoTemaAction } from "@/server/actions/catequese-actions";
import { PARAGRAFOS_POR_TEMA } from "@/server/modules/catecismo/service";
import { CATECISMO_ATIVO } from "@/lib/funcionalidades";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { TrechoDoCatecismo } from "@/components/domain/TrechoDoCatecismo";
import { CriarTemaForm } from "../../_components/CriarTemaForm";
import { LigarParagrafoForm } from "../../_components/LigarParagrafoForm";

export const metadata: Metadata = { title: "Itinerário" };

export default async function ItinerarioPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermissionForPage(PERMISSIONS.CATEQUESE_MANAGE);
  if (!session.membership) return null;
  const { id } = await params;

  const itinerario = await obterItinerario(session.membership.parishId, id);
  if (!itinerario) notFound();

  return (
    <div className="flex flex-col">
      <PageHeader
        title={itinerario.nome}
        description={
          itinerario.descricao ??
          "Os encontros previstos, na ordem em que acontecem ao longo do ano."
        }
      />

      <section>
        <Eyebrow tone="accent" className="mb-3">
          {itinerario.temas.length === 0
            ? "Encontros previstos"
            : `${itinerario.temas.length} ${
                itinerario.temas.length === 1 ? "encontro previsto" : "encontros previstos"
              }`}
        </Eyebrow>

        {itinerario.temas.length === 0 ? (
          <EmptyState
            icon={ListOrdered}
            title="Nenhum encontro digitado ainda"
            description="Acrescente os encontros na ordem em que acontecem. É essa lista que a catequista vai escolher ao lançar o que deu, e é contra ela que a coordenação enxerga a evolução da turma."
          />
        ) : (
          <div className="lista-adaptavel">
            {/* Vira grade de dois quando há largura — ver globals.css. */}
            <Card className="card-adaptavel px-3.5 py-1.5">
              {itinerario.temas.map((tema, i) => (
                <div
                  key={tema.id}
                  className="flex items-start gap-3.5 border-b border-border py-3.5 last:border-b-0"
                >
                  {/* A numeração é a posição na caminhada, e por isso é
                      informação, não enfeite: a catequista escolhe "o 12" e a
                      família vê "12 de 30". */}
                  <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-md bg-primary-tint text-[13px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-medium text-foreground">{tema.titulo}</p>
                    {tema.descricao && (
                      <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-muted">
                        {tema.descricao}
                      </p>
                    )}

                    {/*
                      O Catecismo do encontro, fechado por padrão: são trinta
                      temas numa lista, e abrir o editor de todos de uma vez
                      transformaria a página numa parede. O resumo já diz
                      quais parágrafos estão ligados.

                      Oculto por `CATECISMO_ATIVO` (ver src/lib/funcionalidades.ts).
                    */}
                    {CATECISMO_ATIVO && (
                    <details className="group mt-2">
                      <summary className="alvo-de-toque inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-primary [&::-webkit-details-marker]:hidden">
                        {tema.catecismo.length === 0
                          ? "Ligar ao Catecismo"
                          : `Catecismo: ${tema.catecismo.map((c) => `§ ${c.paragrafo}`).join(", ")}`}
                        <span className="text-muted transition-transform group-open:rotate-90" aria-hidden>
                          ›
                        </span>
                      </summary>
                      <div className="mt-3 flex flex-col gap-4">
                        {tema.catecismo.map((c) => (
                          <TrechoDoCatecismo
                            key={c.id}
                            paragrafo={c.paragrafo}
                            trecho={c.trecho}
                            completo={c.completo}
                            compacto
                            acao={
                              <form action={desligarParagrafoDoTemaAction}>
                                <input type="hidden" name="id" value={c.id} />
                                <input type="hidden" name="itinerarioId" value={itinerario.id} />
                                <button
                                  type="submit"
                                  aria-label={`Tirar o parágrafo ${c.paragrafo} deste encontro`}
                                  className="alvo-de-toque inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-error"
                                >
                                  <X className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                                  Tirar
                                </button>
                              </form>
                            }
                          />
                        ))}
                        {tema.catecismo.length < PARAGRAFOS_POR_TEMA ? (
                          <LigarParagrafoForm temaId={tema.id} itinerarioId={itinerario.id} />
                        ) : (
                          <p className="text-[13px] leading-relaxed text-muted">
                            Este encontro já tem {PARAGRAFOS_POR_TEMA} parágrafos, o máximo. Tire um para
                            acrescentar outro.
                          </p>
                        )}
                      </div>
                    </details>
                    )}
                  </div>
                  <form action={removerTemaAction} className="shrink-0">
                    <input type="hidden" name="temaId" value={tema.id} />
                    <input type="hidden" name="itinerarioId" value={itinerario.id} />
                    <button
                      type="submit"
                      aria-label={`Remover o encontro ${tema.titulo}`}
                      className="grid h-9 w-9 place-items-center rounded-md text-muted transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.6} aria-hidden />
                    </button>
                  </form>
                </div>
              ))}
            </Card>
          </div>
        )}
      </section>

      <section className="pt-7">
        <Card>
          <Eyebrow className="mb-3">Acrescentar encontro</Eyebrow>
          <CriarTemaForm itinerarioId={itinerario.id} />
        </Card>
      </section>

      {itinerario.grupos.length > 0 && (
        <section className="pt-7">
          <Eyebrow className="mb-3">Turmas que seguem este itinerário</Eyebrow>
          <div className="lista-adaptavel">
            {/* Vira grade de dois quando há largura — ver globals.css. */}
            <Card className="card-adaptavel px-3.5 py-1.5">
              {itinerario.grupos.map((grupo) => (
                <p
                  key={grupo.id}
                  className="border-b border-border py-3 text-[14px] text-foreground last:border-b-0"
                >
                  {grupo.name} <span className="text-muted">· {grupo.year}</span>
                </p>
              ))}
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
