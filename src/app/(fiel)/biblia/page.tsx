import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Search, ChevronRight } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { buscar, contarVersiculos, TRADUCAO } from "@/server/modules/biblia/service";
import { BIBLE_BOOKS, type Testament } from "@/lib/bible-books";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { INPUT_CLASSES } from "@/components/ui/FormField";

/**
 * A Bíblia inteira, para ler no celular.
 *
 * A tela existia como esqueleto e ficou anos escondida porque não havia
 * texto que pudesse ser mostrado: Ave Maria, CNBB, Pastoral e Jerusalém são
 * traduções protegidas. A de Matos Soares entrou em domínio público e
 * resolveu isso.
 *
 * Os livros vêm agrupados como numa Bíblia de papel — Pentateuco,
 * Históricos, Profetas, Evangelhos — porque é assim que quem foi à
 * catequese aprendeu a procurar.
 */
const ORDEM_DOS_TESTAMENTOS: { chave: Testament; titulo: string }[] = [
  { chave: "antigo", titulo: "Antigo Testamento" },
  { chave: "novo", titulo: "Novo Testamento" },
];

export const metadata: Metadata = { title: "Bíblia" };

export default async function BibliaPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const session = await getSessionContext();
  if (!session?.membership) return null;

  const { busca } = await searchParams;
  const termo = (busca ?? "").trim();

  const [{ achados, truncado }, total] = await Promise.all([
    termo ? buscar(termo) : Promise.resolve({ achados: [], truncado: false }),
    contarVersiculos(),
  ]);

  if (total === 0) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Bíblia" description="A Palavra, para ler quando quiser." />
        <EmptyState
          icon={BookOpen}
          title="O texto ainda não foi carregado"
          description="A Bíblia é carregada uma vez, por quem administra a plataforma. Assim que isso for feito, ela aparece aqui."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Bíblia" description="A Palavra, para ler quando quiser." />

      {/* Formulário GET: a busca fica no endereço, então dá para voltar a
          ela pelo histórico e mandar o link para alguém. */}
      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="busca"
          defaultValue={termo}
          placeholder="Procurar uma expressão…"
          aria-label="Procurar na Bíblia"
          className={`${INPUT_CLASSES} flex-1`}
        />
        <button
          type="submit"
          className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-lg bg-primary text-white transition-opacity hover:opacity-90"
          aria-label="Procurar"
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
        </button>
      </form>

      {termo && (
        <section className="pt-5">
          <Eyebrow tone="accent" className="mb-3">
            {achados.length === 0
              ? "Nada encontrado"
              : truncado
                ? `Primeiros ${achados.length} resultados`
                : `${achados.length} ${achados.length === 1 ? "resultado" : "resultados"}`}
          </Eyebrow>

          {achados.length === 0 ? (
            <p className="text-[13.5px] leading-relaxed text-muted">
              {termo.length < 3
                ? "Escreva pelo menos três letras."
                : `Nenhum versículo contém “${termo}”. A busca procura o texto exato, com acentos.`}
            </p>
          ) : (
            <Card className="px-3.5 py-1.5">
              {achados.map((a) => (
                <Link
                  key={`${a.livro.slug}-${a.chapter}-${a.number}`}
                  href={`/biblia/${a.livro.slug}/${a.chapter}#v${a.number}`}
                  className="block border-b border-border px-1 py-3.5 transition-colors last:border-b-0 hover:bg-primary-tint"
                >
                  <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-primary">
                    {a.livro.name} {a.chapter}:{a.number}
                  </span>
                  <span className="mt-1 block font-serif text-[15px] leading-relaxed text-foreground">
                    {a.text}
                  </span>
                </Link>
              ))}
            </Card>
          )}

          {truncado && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              Há mais versículos com essa expressão. Escreva um trecho mais longo para chegar ao
              que procura.
            </p>
          )}
        </section>
      )}

      {ORDEM_DOS_TESTAMENTOS.map(({ chave, titulo }) => {
        const doTestamento = BIBLE_BOOKS.filter((b) => b.testament === chave);
        const grupos = [...new Set(doTestamento.map((b) => b.group))];

        return (
          <section key={chave} className="pt-7">
            <Eyebrow tone="accent" className="mb-3">
              {titulo}
            </Eyebrow>
            <div className="flex flex-col gap-4">
              {grupos.map((grupo) => (
                <div key={grupo}>
                  <p className="mb-2 text-[12.5px] font-medium text-muted">{grupo}</p>
                  {/* Grade de nomes em vez de lista de linhas: 73 livros em
                      linhas viraria uma rolagem sem fim no celular. */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {doTestamento
                      .filter((b) => b.group === grupo)
                      .map((livro) => (
                        <Link
                          key={livro.slug}
                          href={`/biblia/${livro.slug}`}
                          className="flex items-center justify-between gap-1.5 rounded-lg border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary hover:bg-primary-tint"
                        >
                          <span className="min-w-0 truncate text-[13.5px] text-foreground">
                            {livro.name}
                          </span>
                          <ChevronRight
                            className="h-3.5 w-3.5 shrink-0 text-border-strong"
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <p className="pt-7 text-[12px] leading-relaxed text-muted">
        {TRADUCAO.nome} · {TRADUCAO.detalhe}.
      </p>

      <div className="rule-gold my-7" />
    </div>
  );
}
