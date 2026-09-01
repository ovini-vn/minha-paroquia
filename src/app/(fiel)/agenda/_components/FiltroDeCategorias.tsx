import Link from "next/link";
import type { CategoriaDaAgenda } from "@prisma/client";
import { CATEGORIAS } from "@/lib/agenda-categorias";
import { alternarCategoria, enderecoDaAgenda, type EstadoDaAgenda } from "./endereco";

/**
 * A legenda que também filtra.
 *
 * Uma legenda e um filtro lado a lado seriam duas listas das mesmas
 * categorias, com as mesmas cores, uma explicando e a outra agindo. Aqui é
 * a mesma coisa: o que diz o que a cor significa é o que liga e desliga a
 * cor.
 *
 * Só as categorias PRESENTES no mês aparecem — filtrar por algo que não
 * existe em setembro daria uma tela vazia sem explicação. E "presentes" é
 * calculado sobre o mês INTEIRO, não sobre o que sobrou do filtro: senão a
 * categoria desligada sumiria da lista e não haveria como religá-la.
 */
export function FiltroDeCategorias({
  estado,
  presentes,
  quantos,
}: {
  estado: EstadoDaAgenda;
  presentes: CategoriaDaAgenda[];
  /** Quantos compromissos há em cada categoria, no mês inteiro. */
  quantos: Record<string, number>;
}) {
  if (presentes.length === 0) return null;
  const filtrando = estado.categorias.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {presentes.map((cat) => {
        const marcada = estado.categorias.includes(cat);
        const cor = `rgb(var(--cat-${CATEGORIAS[cat].token}))`;

        return (
          <Link
            key={cat}
            href={enderecoDaAgenda({
              ...estado,
              categorias: alternarCategoria(estado.categorias, cat, presentes),
            })}
            aria-pressed={marcada}
            title={CATEGORIAS[cat].descricao}
            className={
              marcada
                ? "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                : "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12px] text-muted transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            }
            style={marcada ? { borderColor: cor, color: cor } : undefined}
          >
            <span
              className="h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: cor }}
              aria-hidden
            />
            {CATEGORIAS[cat].rotulo}
            <span className={marcada ? "opacity-70" : "text-muted"}>{quantos[cat] ?? 0}</span>
          </Link>
        );
      })}

      {/*
        Só aparece quando há o que limpar. Um botão "Todas" sempre visível
        competiria com as categorias sem nunca ter o que fazer.
      */}
      {filtrando && (
        <Link
          href={enderecoDaAgenda({ ...estado, categorias: [] })}
          className="rounded-full px-2 py-1 text-[12px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Ver todas
        </Link>
      )}
    </div>
  );
}
