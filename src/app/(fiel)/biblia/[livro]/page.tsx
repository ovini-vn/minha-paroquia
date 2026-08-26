import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { TRADUCAO } from "@/server/modules/biblia/service";
import { findBook } from "@/lib/bible-books";
import { Eyebrow } from "@/components/ui/Typography";

/** Os capítulos de um livro, como grade de números. */
export default async function LivroPage({ params }: { params: Promise<{ livro: string }> }) {
  const { livro: slug } = await params;
  const session = await getSessionContext();
  if (!session?.membership) return null;

  const livro = findBook(slug);
  if (!livro) notFound();

  const capitulos = Array.from({ length: livro.chapters }, (_, i) => i + 1);

  return (
    <div className="flex flex-col">
      <Link
        href="/biblia"
        className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        Todos os livros
      </Link>

      <h1 className="font-serif text-[29px] font-semibold leading-tight text-foreground">
        {livro.name}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {livro.group} · {livro.chapters} {livro.chapters === 1 ? "capítulo" : "capítulos"}
      </p>

      <section className="pt-6">
        <Eyebrow tone="accent" className="mb-3">
          Capítulos
        </Eyebrow>
        {/* Números grandes o bastante para o dedo: 44px de lado é o mínimo
            confortável, e um livro de 150 capítulos (Salmos) precisa que a
            grade se adense na horizontal em vez de esticar a rolagem. */}
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          {capitulos.map((n) => (
            <Link
              key={n}
              href={`/biblia/${livro.slug}/${n}`}
              className="grid h-[46px] place-items-center rounded-lg border border-border bg-surface font-serif text-[15px] text-foreground transition-colors hover:border-primary hover:bg-primary-tint"
            >
              {n}
            </Link>
          ))}
        </div>
      </section>

      <p className="pt-7 text-[12px] leading-relaxed text-muted">
        {TRADUCAO.nome} · {TRADUCAO.detalhe}.
      </p>

      <div className="rule-gold my-7" />
    </div>
  );
}
