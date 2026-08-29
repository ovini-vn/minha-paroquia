import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { lerCapitulo, TRADUCAO } from "@/server/modules/biblia/service";
import type { Metadata } from "next";
import { findBook } from "@/lib/bible-books";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookOpen } from "lucide-react";

/** "João 3", que é como a pessoa se refere ao que está lendo. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ livro: string; capitulo: string }>;
}): Promise<Metadata> {
  const { livro, capitulo } = await params;
  const encontrado = findBook(livro);
  return { title: encontrado ? `${encontrado.name} ${capitulo}` : "Bíblia" };
}

/**
 * O capítulo, para ler.
 *
 * Sem card, sem borda, sem ícone ao lado de cada versículo: é uma página de
 * leitura, e tudo o que se põe em volta do texto disputa atenção com ele. O
 * número do versículo fica pequeno e sobrescrito, como no papel — serve
 * para achar a referência, não para ser lido em voz alta.
 */
export default async function CapituloPage({
  params,
}: {
  params: Promise<{ livro: string; capitulo: string }>;
}) {
  const { livro: slug, capitulo: capituloTexto } = await params;
  const session = await getSessionContext();
  if (!session?.membership) return null;

  const livro = findBook(slug);
  const capitulo = Number(capituloTexto);
  if (!livro || !Number.isInteger(capitulo) || capitulo < 1 || capitulo > livro.chapters) {
    notFound();
  }

  const versiculos = await lerCapitulo(slug, capitulo);

  const anterior = capitulo > 1 ? capitulo - 1 : null;
  const proximo = capitulo < livro.chapters ? capitulo + 1 : null;

  return (
    <div className="flex flex-col">
      <Link
        href={`/biblia/${livro.slug}`}
        className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        {livro.name}
      </Link>

      <h1 className="font-serif text-[29px] font-semibold leading-tight text-foreground">
        {livro.name} {capitulo}
      </h1>

      {versiculos.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Capítulo não encontrado"
          description="Este capítulo existe no índice, mas não há texto carregado para ele."
        />
      ) : (
        <article className="pt-5 font-serif text-[17px] leading-[1.75] text-foreground">
          {versiculos.map((v) => (
            // `id` para o link da busca cair no versículo certo, e
            // `scroll-mt` para ele não ficar debaixo do cabeçalho fixo.
            <p key={v.number} id={`v${v.number}`} className="mb-3 scroll-mt-24">
              <span className="mr-1.5 align-super text-[11px] font-sans font-semibold text-primary">
                {v.number}
              </span>
              {v.text}
            </p>
          ))}
        </article>
      )}

      {/* Avançar sem voltar ao índice: ler a Bíblia é ler seguido. */}
      <nav className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
        {anterior ? (
          <Link
            href={`/biblia/${livro.slug}/${anterior}`}
            className="inline-flex items-center gap-1 text-[13.5px] text-primary transition-opacity hover:opacity-80"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Capítulo {anterior}
          </Link>
        ) : (
          <span />
        )}
        {proximo ? (
          <Link
            href={`/biblia/${livro.slug}/${proximo}`}
            className="inline-flex items-center gap-1 text-[13.5px] text-primary transition-opacity hover:opacity-80"
          >
            Capítulo {proximo}
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <p className="pt-6 text-[12px] leading-relaxed text-muted">
        {TRADUCAO.nome} · {TRADUCAO.detalhe}.
      </p>

      <div className="rule-gold my-7" />
    </div>
  );
}
