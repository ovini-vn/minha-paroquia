import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronRight, Compass, Megaphone, Search, Sparkles, Users } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { buscar } from "@/server/modules/busca/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { formatDateOnly, formatDateTime } from "@/lib/date";

export const metadata: Metadata = { title: "Buscar" };

/**
 * Buscar no app: as telas, as pastorais, os avisos, os eventos que vêm aí
 * e as novenas.
 *
 * Um formulário GET e nada de JavaScript: o termo fica no endereço, o
 * voltar do navegador funciona, e o resultado pode ser compartilhado.
 */
export default async function BuscarPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireSessionForPage();
  const { q = "" } = await searchParams;
  const termo = q.slice(0, 80);
  const r = session.membership && termo.trim().length >= 2 ? await buscar(session.membership.parishId, termo) : null;
  const total = r ? r.atalhos.length + r.pastorais.length + r.avisos.length + r.eventos.length + r.novenas.length : 0;

  return (
    <div className="flex flex-col">
      <PageHeader title="Buscar" description="Uma tela, uma pastoral, um aviso, uma festa, uma novena." />

      <form action="/buscar" method="get" role="search" className="mb-6 flex gap-2">
        <label htmlFor="busca" className="sr-only">
          O que você procura
        </label>
        <input
          id="busca"
          name="q"
          type="search"
          defaultValue={termo}
          autoFocus={!termo}
          placeholder="Confissão, catequese, festa junina..."
          className={INPUT_CLASSES}
        />
        <button
          type="submit"
          className="alvo-de-toque grid h-[50px] w-[50px] shrink-0 place-items-center rounded-md bg-primary text-white"
          aria-label="Buscar"
        >
          <Search className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        </button>
      </form>

      {r && total === 0 && (
        <EmptyState
          icon={Search}
          title={`Nada encontrado para “${termo.trim()}”`}
          description="Tente outra palavra, ou uma parte dela. A secretaria também pode ajudar em Contato."
        />
      )}

      {r && total > 0 && (
        <div className="flex flex-col gap-5">
          {r.atalhos.length > 0 && (
            <Grupo titulo="No app">
              {r.atalhos.map((a) => (
                <Linha key={a.href} href={a.href} icone={Compass} titulo={a.titulo} detalhe={a.descricao} />
              ))}
            </Grupo>
          )}
          {r.pastorais.length > 0 && (
            <Grupo titulo="Pastorais e grupos">
              {r.pastorais.map((p) => (
                <Linha key={p.id} href={`/comunidade/pastorais/${p.id}`} icone={Users} titulo={p.nome} detalhe={p.descricao ?? ""} />
              ))}
            </Grupo>
          )}
          {r.eventos.length > 0 && (
            <Grupo titulo="Na agenda">
              {r.eventos.map((e) => (
                <Linha
                  key={e.id}
                  href={`/agenda?mes=${e.quando.toISOString().slice(0, 7)}`}
                  icone={CalendarDays}
                  titulo={e.titulo}
                  detalhe={formatDateTime(e.quando) + (e.local ? ` · ${e.local}` : "")}
                />
              ))}
            </Grupo>
          )}
          {r.avisos.length > 0 && (
            <Grupo titulo="Avisos">
              {r.avisos.map((a) => (
                <Linha key={a.id} href="/avisos" icone={Megaphone} titulo={a.titulo} detalhe={`Publicado em ${formatDateOnly(a.quando)}`} />
              ))}
            </Grupo>
          )}
          {r.novenas.length > 0 && (
            <Grupo titulo="Para rezar">
              {r.novenas.map((n) => (
                <Linha key={n.slug} href={`/rezar/novenas/${n.slug}`} icone={Sparkles} titulo={n.nome} detalhe={n.descricao} />
              ))}
            </Grupo>
          )}
        </div>
      )}
      <div className="rule-gold my-7" />
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <Eyebrow tone="accent" className="mb-2">
        {titulo}
      </Eyebrow>
      <Card className="px-3.5 py-1">
        <ul>{children}</ul>
      </Card>
    </section>
  );
}

function Linha({
  href,
  icone: Icone,
  titulo,
  detalhe,
}: {
  href: string;
  icone: typeof Users;
  titulo: string;
  detalhe: string;
}) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link href={href} className="flex items-center gap-3 py-3 hover:text-primary">
        <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
          <Icone className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-medium text-foreground">{titulo}</span>
          {detalhe && <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted">{detalhe}</span>}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-border-strong" strokeWidth={1.5} aria-hidden />
      </Link>
    </li>
  );
}
