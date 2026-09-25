import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import { rolDaMissa } from "@/server/modules/intencoes/service";
import { apagarIntencaoAction } from "@/server/actions/intencao-actions";
import { BotaoImprimir } from "@/components/domain/BotaoImprimir";
import { formatDateLabel, formatTimeLabel } from "@/lib/date";

export const metadata: Metadata = { title: "Rol de intenções" };

/**
 * O rol de uma missa, feito para o papel e para o ambão.
 *
 * Agrupado por tipo, na ordem em que o leitor costuma ler: primeiro os
 * que partiram (sétimo dia, trigésimo, pelas almas), depois os vivos.
 * Letra grande de propósito — é lido em pé, com a luz da igreja.
 */
export default async function RolPage({ params }: { params: Promise<{ celebrationId: string }> }) {
  const session = await requirePermissionForPage(PERMISSIONS.AGENDA_MANAGE);
  if (!session.membership) return null;
  const { celebrationId } = await params;
  const rol = await rolDaMissa(session.membership.parishId, celebrationId);
  if (!rol) notFound();
  const { missa, grupos, total } = rol;

  return (
    <div className="mx-auto max-w-[700px]">
      <div className="nao-imprime mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/painel/intencoes"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          Intenções de missa
        </Link>
        {total > 0 && <BotaoImprimir rotulo="Imprimir o rol" />}
      </div>

      <article className="folha">
        <header className="mb-6 border-b border-border pb-4 text-center">
          <p className="text-[13px] uppercase tracking-[0.08em] text-muted">{missa.parish.name}</p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold text-foreground">Intenções da missa</h1>
          <p className="mt-1 text-[15px] text-foreground">
            {formatDateLabel(missa.startsAt)}, {formatTimeLabel(missa.startsAt)}
            {missa.location ? ` · ${missa.location}` : ""}
          </p>
        </header>

        {total === 0 ? (
          <p className="text-center text-[15px] text-muted">Nenhuma intenção no rol desta missa.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {grupos.map((g) => (
              <section key={g.tipo}>
                <h2 className="mb-1.5 font-serif text-[19px] font-semibold text-foreground">{g.rotulo}</h2>
                <ul className="flex flex-col gap-1">
                  {g.itens.map((i) => (
                    <li key={i.id} className="flex items-baseline gap-3 text-[17px] leading-relaxed text-foreground">
                      <span className="flex-1">{i.texto}</span>
                      <form action={apagarIntencaoAction} className="nao-imprime">
                        <input type="hidden" name="intencaoId" value={i.id} />
                        <button type="submit" className="text-[12.5px] text-muted underline hover:text-error">
                          Tirar
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
