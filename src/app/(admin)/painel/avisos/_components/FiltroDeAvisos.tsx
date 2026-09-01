import Link from "next/link";
import { Search } from "lucide-react";
import { INPUT_CLASSES } from "@/components/ui/FormField";

export const SITUACOES = [
  { id: "publicados", rotulo: "Publicados" },
  { id: "arquivados", rotulo: "Arquivados" },
  { id: "todos", rotulo: "Todos" },
] as const;

export type SituacaoDeAvisos = (typeof SITUACOES)[number]["id"];
export type FiltrosDeAvisos = { situacao: SituacaoDeAvisos; busca: string };

export function enderecoDosAvisos(filtros: FiltrosDeAvisos): string {
  const params = new URLSearchParams();
  if (filtros.situacao !== "publicados") params.set("ver", filtros.situacao);
  if (filtros.busca) params.set("q", filtros.busca);
  const p = params.toString();
  return p ? `/painel/avisos?${p}` : "/painel/avisos";
}

/**
 * Situação e busca no texto.
 *
 * Não há filtro por período aqui, ao contrário dos eventos, e é de
 * propósito: ninguém procura "o aviso de agosto" — procura "aquele aviso da
 * quermesse". Aviso se identifica pelo assunto, e a data só serve para
 * ordenar.
 *
 * Por isso a busca olha o TÍTULO E O TEXTO. Metade dos avisos tem título
 * genérico — "Comunicado", "Aviso importante" — e o que a pessoa lembra
 * está no corpo.
 */
export function FiltroDeAvisos({
  filtros,
  quantos,
}: {
  filtros: FiltrosDeAvisos;
  quantos: Record<SituacaoDeAvisos, number>;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const aceso = `${base} border-primary bg-primary-tint font-semibold text-primary`;
  const apagado = `${base} border-border text-muted hover:border-primary hover:text-foreground`;

  return (
    <div className="mb-4 flex flex-col gap-3">
      <form action="/painel/avisos" className="flex flex-wrap items-center gap-2">
        {/* A situação escolhida sobrevive à busca. */}
        {filtros.situacao !== "publicados" && (
          <input type="hidden" name="ver" value={filtros.situacao} />
        )}
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={1.6}
            aria-hidden
          />
          <input
            name="q"
            type="search"
            defaultValue={filtros.busca}
            placeholder="Procurar no título ou no texto"
            aria-label="Procurar aviso"
            className={`${INPUT_CLASSES} pl-9`}
          />
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {SITUACOES.map(({ id, rotulo }) => (
          <Link
            key={id}
            href={enderecoDosAvisos({ ...filtros, situacao: id })}
            aria-pressed={filtros.situacao === id}
            className={filtros.situacao === id ? aceso : apagado}
          >
            {rotulo}
            <span className={filtros.situacao === id ? "opacity-70" : ""}>{quantos[id]}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
