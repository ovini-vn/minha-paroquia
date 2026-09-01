import Link from "next/link";
import type { CategoriaDaAgenda } from "@prisma/client";
import { CATEGORIAS } from "@/lib/agenda-categorias";

/**
 * O mesmo filtro da agenda, aqui na lista de gestão.
 *
 * A secretaria tem quase duzentos eventos cadastrados; achar "a reunião do
 * conselho" rolando a lista é o tipo de trabalho que o computador deveria
 * poupar. As cores são as mesmas da agenda de propósito: quem aprendeu a
 * ler a cor lá não reaprende aqui.
 *
 * Aqui NÃO se conta quantos há de cada tipo, ao contrário da agenda. Lá a
 * contagem cabe no mês e ajuda a decidir; aqui ela seria do acervo inteiro,
 * e um número grande ao lado do rótulo não diz nada sobre o que se procura.
 */
export function FiltroDeTipos({
  atual,
  presentes,
}: {
  atual: CategoriaDaAgenda | null;
  presentes: CategoriaDaAgenda[];
}) {
  if (presentes.length === 0) return null;

  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/painel/eventos"
        aria-pressed={atual === null}
        className={
          atual === null
            ? `${base} border-primary bg-primary-tint font-semibold text-primary`
            : `${base} border-border text-muted hover:border-primary hover:text-foreground`
        }
      >
        Todos
      </Link>

      {presentes.map((cat) => {
        const marcada = atual === cat;
        const cor = `rgb(var(--cat-${CATEGORIAS[cat].token}))`;
        return (
          <Link
            key={cat}
            // Tocar no que já está marcado volta para todos: sem isso a
            // pessoa precisaria mirar noutro lugar para desfazer.
            href={marcada ? "/painel/eventos" : `/painel/eventos?tipo=${cat}`}
            aria-pressed={marcada}
            title={CATEGORIAS[cat].descricao}
            className={
              marcada
                ? `${base} font-semibold`
                : `${base} border-border text-muted hover:border-primary hover:text-foreground`
            }
            style={marcada ? { borderColor: cor, color: cor } : undefined}
          >
            <span
              className="h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: cor }}
              aria-hidden
            />
            {CATEGORIAS[cat].rotulo}
          </Link>
        );
      })}
    </div>
  );
}
