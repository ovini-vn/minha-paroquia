import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListOrdered, Trash2 } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { obterItinerario } from "@/server/modules/catequese/service";
import { removerTemaAction } from "@/server/actions/catequese-actions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { CriarTemaForm } from "../../_components/CriarTemaForm";

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
          <Card className="px-3.5 py-1.5">
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
          <Card className="px-3.5 py-1.5">
            {itinerario.grupos.map((grupo) => (
              <p
                key={grupo.id}
                className="border-b border-border py-3 text-[14px] text-foreground last:border-b-0"
              >
                {grupo.name} <span className="text-muted">· {grupo.year}</span>
              </p>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
