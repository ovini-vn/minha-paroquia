import Link from "next/link";
import { BookMarked, Lock } from "lucide-react";
import { BIBLE_BOOKS, BIBLE_TRANSLATIONS, findBook } from "@/lib/bible-books";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow, PageHeader } from "@/components/ui/Typography";
import { cn } from "@/lib/cn";

/**
 * Leitor bíblico: navegação por livro e capítulo já funcional, mas SEM
 * texto. As quatro traduções católicas em português são licenciadas
 * comercialmente — o texto entra quando a paróquia tiver a licença, através
 * de uma fonte configurada; nada aqui é inventado nem raspado.
 */
export default async function BibliaPage({
  searchParams,
}: {
  searchParams: Promise<{ livro?: string; capitulo?: string }>;
}) {
  const { livro, capitulo } = await searchParams;
  const book = livro ? findBook(livro) : undefined;
  const chapter = book && capitulo ? Math.min(Math.max(1, Number(capitulo) || 1), book.chapters) : null;

  const grupos = BIBLE_BOOKS.reduce<Record<string, typeof BIBLE_BOOKS>>((acc, b) => {
    (acc[b.group] ??= []).push(b);
    return acc;
  }, {});

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Bíblia"
        description="Navegue por livro e capítulo. O texto depende de uma tradução licenciada."
      />

      {/* Estado real do recurso — dito na cara, não escondido. */}
      <Card className="border-gold/45 bg-gradient-to-b from-gold/[0.07] to-transparent">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gold/15 text-[#8a6b24] dark:text-gold">
            <Lock className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
          </span>
          <div>
            <p className="text-[14.5px] font-medium text-foreground">Texto ainda não disponível</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              As traduções católicas em português — Ave Maria, CNBB, Edição Pastoral (Paulus) e
              Bíblia de Jerusalém — são protegidas por direito autoral. O texto será exibido aqui
              assim que a paróquia obtiver a licença de uma delas.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {BIBLE_TRANSLATIONS.map((t) => (
                <Badge key={t.code} tone="muted">
                  {t.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {book && chapter ? (
        <section className="pt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <Eyebrow tone="accent">{book.group}</Eyebrow>
              <h2 className="mt-1 font-serif text-[26px] font-semibold leading-tight text-foreground">
                {book.name} {chapter}
              </h2>
            </div>
            <Link
              href="/oracao/biblia"
              className="shrink-0 rounded-full border border-border-strong px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Trocar livro
            </Link>
          </div>

          <Card>
            <p className="text-[13.5px] text-muted">
              {book.name} tem {book.chapters}{" "}
              {book.chapters === 1 ? "capítulo" : "capítulos"}. O texto de{" "}
              <span className="font-medium text-foreground">
                {book.abbrev} {chapter}
              </span>{" "}
              aparece aqui quando houver uma tradução licenciada configurada.
            </p>
          </Card>

          <Eyebrow className="mb-2 mt-6">Capítulos</Eyebrow>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={`/oracao/biblia?livro=${book.slug}&capitulo=${n}`}
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-md border text-[13px] transition-colors",
                  n === chapter
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-foreground hover:border-primary hover:text-primary",
                )}
              >
                {n}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="pt-6">
          {Object.entries(grupos).map(([grupo, livros]) => (
            <div key={grupo} className="pb-6">
              <Eyebrow tone="accent" className="mb-2.5">
                {grupo}
              </Eyebrow>
              <div className="flex flex-wrap gap-1.5">
                {livros.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/oracao/biblia?livro=${b.slug}&capitulo=1`}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {b.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="rule-gold my-7" />
      <p className="flex items-center gap-2 pb-2 text-xs text-muted">
        <BookMarked className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
        Cânon católico: 73 livros, incluindo os deuterocanônicos.
      </p>
    </div>
  );
}
