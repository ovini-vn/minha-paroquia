import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSessionForPage } from "@/server/auth/guards";
import { obterAndamentoDaNovena } from "@/server/modules/novenas/service";
import { recomecarNovenaAction } from "@/server/actions/novena-actions";
import { novenaPorSlug } from "@/lib/oracoes/novenas";
import { roteiroDoDiaDaNovena, type Conta } from "@/lib/oracoes/roteiros";
import { formatDateOnly } from "@/lib/date";
import { SessaoDeOracao } from "@/components/oracao/SessaoDeOracao";
import { PedacoDoTerco } from "@/components/oracao/PedacoDoTerco";
import { MaosEmOracao } from "@/components/oracao/MaosEmOracao";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: novenaPorSlug(slug)?.nome ?? "Novena" };
}

/**
 * Uma novena: sempre abre no dia certo.
 *
 * O dia vem da CONTA (novena_andamentos), não do aparelho: quem começou no
 * celular e continua no computador da secretaria encontra o dia seguinte.
 * Ao terminar o dia, a própria sessão marca na conta.
 */
export default async function NovenaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const novena = novenaPorSlug(slug);
  if (!novena) notFound();

  const session = await requireSessionForPage();
  const andamento = await obterAndamentoDaNovena(session.userId, slug);

  if (andamento.proximoDia === null) {
    const nove: Conta[] = Array.from({ length: 9 }, () => ({ tipo: "pequena", estado: "feita" }));
    return (
      <div className="flex flex-col items-center text-center lg:mx-auto lg:max-w-[36rem]">
        <Link
          href="/rezar/novenas"
          className="alvo-de-toque mb-4 self-start text-[13px] text-muted hover:text-primary"
        >
          ‹ Novenas
        </Link>
        <span className="grid h-20 w-20 place-items-center rounded-full bg-primary-tint text-primary">
          <MaosEmOracao className="h-10 w-10" strokeWidth={1.3} />
        </span>
        <h1 className="mt-4 font-serif text-[28px] font-semibold leading-tight text-foreground">{novena.nome}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Você concluiu os nove dias
          {andamento.concluidaEm ? ` em ${formatDateOnly(andamento.concluidaEm)}` : ""}.
        </p>
        <div className="mt-5 w-full rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
          <PedacoDoTerco contas={nove} rotulo="Os nove dias rezados" />
        </div>
        <form action={recomecarNovenaAction} className="mt-6">
          <input type="hidden" name="novena" value={slug} />
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-[15px] font-semibold text-white dark:bg-primary-light"
          >
            Rezar a novena de novo
          </button>
        </form>
      </div>
    );
  }

  const dia = andamento.proximoDia;
  const roteiro = roteiroDoDiaDaNovena(novena, dia);

  const sobre = (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] leading-relaxed text-muted">{novena.quando}</p>
      {dia > 1 && (
        <p className="text-[13.5px] leading-relaxed text-muted">
          Você já rezou {dia - 1} {dia - 1 === 1 ? "dia" : "dias"}
          {andamento.ultimoDiaEm ? `, o último em ${formatDateOnly(andamento.ultimoDiaEm)}` : ""}. O costume é um dia
          por dia — mas, se perdeu algum, é só continuar daqui.
        </p>
      )}
      {dia > 1 && (
        <form action={recomecarNovenaAction}>
          <input type="hidden" name="novena" value={slug} />
          <button type="submit" className="min-h-11 text-[13px] font-medium text-muted underline-offset-2 hover:underline">
            Recomeçar do dia 1
          </button>
        </form>
      )}
    </div>
  );

  return (
    <SessaoDeOracao
      key={roteiro.id}
      roteiro={roteiro}
      voltar={{ href: "/rezar/novenas", rotulo: "Novenas" }}
      antesDeComecar={sobre}
      novena={{ slug, dia }}
    />
  );
}
