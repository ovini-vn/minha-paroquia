import type { Metadata } from "next";
import Link from "next/link";
import { CalendarHeart, ChevronRight, Heart } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { listarAndamentosDasNovenas } from "@/server/modules/novenas/service";
import { NOVENAS } from "@/lib/oracoes/novenas";
import { NOMES_DOS_CONJUNTOS, misteriosDoDia } from "@/lib/oracoes/misterios";
import { brasiliaParts } from "@/lib/brasilia";
import { PageHeader } from "@/components/ui/Typography";
import { IconeDoTerco } from "@/components/oracao/IconeDoTerco";

export const metadata: Metadata = { title: "Rezar" };

/**
 * Rezar — as orações guiadas, uma conta de cada vez.
 *
 * A ordem é a que o usuário pediu: Rosário, Terço, Terço da Misericórdia e
 * Novenas. Cada botão diz, na segunda linha, o que a pessoa encontra hoje:
 * os mistérios do dia no terço, e em que dia está a novena começada.
 */
export default async function RezarPage() {
  const session = await requireSessionForPage();
  const andamentos = await listarAndamentosDasNovenas(session.userId);
  const hoje = misteriosDoDia(brasiliaParts(new Date()).weekday);

  // A novena em andamento que mais recentemente recebeu um dia.
  const emAndamento = andamentos
    .filter((a) => a.proximoDia !== null && a.diasRezados > 0)
    .sort((a, b) => (b.ultimoDiaEm?.getTime() ?? 0) - (a.ultimoDiaEm?.getTime() ?? 0))[0];
  const novenaEmAndamento = emAndamento ? NOVENAS.find((n) => n.slug === emAndamento.novena) : null;

  const opcoes = [
    {
      href: "/rezar/rosario",
      titulo: "Rosário",
      detalhe: "Os quatro conjuntos de mistérios, vinte dezenas",
      icone: <IconeDoTerco className="h-6 w-6" />,
    },
    {
      href: "/rezar/terco",
      titulo: "Terço",
      detalhe: `Hoje: ${NOMES_DOS_CONJUNTOS[hoje]}`,
      icone: <IconeDoTerco className="h-6 w-6" />,
    },
    {
      href: "/rezar/misericordia",
      titulo: "Terço da Misericórdia",
      detalhe: "A oração que Jesus ensinou a Santa Faustina",
      icone: <Heart className="h-6 w-6" strokeWidth={1.5} aria-hidden />,
    },
    {
      href: novenaEmAndamento ? `/rezar/novenas/${novenaEmAndamento.slug}` : "/rezar/novenas",
      titulo: "Novenas",
      detalhe:
        novenaEmAndamento && emAndamento
          ? `Continuar: ${novenaEmAndamento.aQuem}, dia ${emAndamento.proximoDia} de 9`
          : "Fátima, Aparecida, Espírito Santo e São José",
      icone: <CalendarHeart className="h-6 w-6" strokeWidth={1.5} aria-hidden />,
    },
  ];

  return (
    <div className="flex flex-col lg:max-w-[42rem]">
      <PageHeader
        title="Rezar"
        description="Orações da Igreja, uma conta de cada vez. O aplicativo mostra a oração da vez e marca onde você está."
      />

      <div className="flex flex-col gap-2.5">
        {opcoes.map((o) => (
          <Link
            key={o.titulo}
            href={o.href}
            className="flex min-h-[72px] items-center gap-3.5 rounded-lg border border-border bg-surface px-4 py-3.5 transition-colors hover:border-primary"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold/15 text-[#8a6b24] dark:text-gold">
              {o.icone}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-[20px] font-semibold leading-tight text-foreground">
                {o.titulo}
              </span>
              <span className="mt-0.5 block text-[13.5px] leading-snug text-muted">{o.detalhe}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-border-strong" strokeWidth={1.5} aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}
