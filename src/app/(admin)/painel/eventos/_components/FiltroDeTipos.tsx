import Link from "next/link";
import type { CategoriaDaAgenda } from "@prisma/client";
import { CATEGORIAS } from "@/lib/agenda-categorias";
import { enderecoDosEventos, PERIODOS, type FiltrosDeEventos } from "./filtros";

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
  filtros,
  presentes,
}: {
  filtros: FiltrosDeEventos;
  presentes: CategoriaDaAgenda[];
}) {
  const atual = filtros.tipo;
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const apagado = "border-border text-muted hover:border-primary hover:text-foreground";

  return (
    <div className="flex flex-col gap-2.5">
      {/*
        Período primeiro, tipo depois.
        
        A pergunta de quem administra começa por "quando" — o que vem, o que
        já passou — e só então se estreita por tipo. A ordem dos dois grupos
        é a ordem em que a pergunta se forma.
      */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map(({ id, rotulo }) => (
          <Link
            key={id}
            href={enderecoDosEventos({ ...filtros, periodo: id })}
            aria-pressed={filtros.periodo === id}
            className={
              filtros.periodo === id
                ? `${base} border-primary bg-primary-tint font-semibold text-primary`
                : `${base} ${apagado}`
            }
          >
            {rotulo}
          </Link>
        ))}
      </div>

      {presentes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={enderecoDosEventos({ ...filtros, tipo: null })}
            aria-pressed={atual === null}
            className={
              atual === null
                ? `${base} border-primary bg-primary-tint font-semibold text-primary`
                : `${base} ${apagado}`
            }
          >
            {/* "Todos os tipos", e não "Todos": o grupo de cima também tem
                um "todo", e dois botões iguais lado a lado não dizem qual
                deles faz o quê. */}
            Todos os tipos
          </Link>

          {presentes.map((cat) => {
            const marcada = atual === cat;
            const cor = `rgb(var(--cat-${CATEGORIAS[cat].token}))`;
            return (
              <Link
                key={cat}
                // Tocar no que já está marcado volta para todos: sem isso a
                // pessoa precisaria mirar noutro lugar para desfazer.
                href={enderecoDosEventos({ ...filtros, tipo: marcada ? null : cat })}
                aria-pressed={marcada}
                title={CATEGORIAS[cat].descricao}
                className={marcada ? `${base} font-semibold` : `${base} ${apagado}`}
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
      )}
    </div>
  );
}
