import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { listarAndamentosDasNovenas } from "@/server/modules/novenas/service";
import { NOVENAS } from "@/lib/oracoes/novenas";
import { PageHeader } from "@/components/ui/Typography";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Novenas" };

export default async function NovenasPage() {
  const session = await requireSessionForPage();
  const andamentos = await listarAndamentosDasNovenas(session.userId);

  return (
    <div className="flex flex-col lg:max-w-[42rem]">
      <Link
        href="/rezar"
        className="alvo-de-toque mb-4 inline-flex items-center gap-1 self-start text-[13px] text-muted hover:text-primary"
      >
        ‹ Rezar
      </Link>
      <PageHeader
        title="Novenas"
        description="Nove dias seguidos de oração, poucos minutos por dia. O aplicativo guarda em que dia você está."
      />

      <div className="flex flex-col gap-2.5">
        {NOVENAS.map((n) => {
          const a = andamentos.find((x) => x.novena === n.slug);
          const situacao = !a || a.diasRezados === 0
            ? null
            : a.proximoDia === null
              ? { rotulo: "Concluída", tom: "success" as const }
              : { rotulo: `Dia ${a.proximoDia} de 9`, tom: "gold" as const };
          return (
            <Link
              key={n.slug}
              href={`/rezar/novenas/${n.slug}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 transition-colors hover:border-primary"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-serif text-[19px] font-semibold leading-tight text-foreground">{n.nome}</span>
                  {situacao && <Badge tone={situacao.tom}>{situacao.rotulo}</Badge>}
                </span>
                <span className="mt-1 block text-[13.5px] leading-snug text-muted">{n.quando}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-border-strong" strokeWidth={1.5} aria-hidden />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
