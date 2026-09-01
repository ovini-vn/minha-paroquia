import Link from "next/link";
import { Search } from "lucide-react";
import type { SacramentType } from "@prisma/client";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { SACRAMENT_TYPE_LABELS } from "@/lib/caminhada-labels";

export type FiltrosDeSacramentos = { tipo: SacramentType | null; busca: string };

export function enderecoDosSacramentos(filtros: FiltrosDeSacramentos): string {
  const params = new URLSearchParams();
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  if (filtros.busca) params.set("q", filtros.busca);
  const p = params.toString();
  return p ? `/painel/sacramentos?${p}` : "/painel/sacramentos";
}

/**
 * Tipo e nome — e NÃO situação.
 *
 * A situação já é a estrutura da tela: pendentes em cima, validados
 * embaixo. Transformá-la em tarja duplicaria a mesma informação em dois
 * lugares, e um deles acabaria discordando do outro — que foi o defeito
 * achado na catequese.
 *
 * O filtro age nas DUAS seções ao mesmo tempo. Procurar "Maria" e ver só
 * os pendentes dela, sem os já validados, esconderia justamente o que
 * responde "ela já tem crisma?".
 *
 * A busca por nome importa mais aqui do que em qualquer outra tela: este é
 * um livro de registro, e livro de registro se consulta por pessoa.
 */
export function FiltroDeSacramentos({
  filtros,
  tipos,
}: {
  filtros: FiltrosDeSacramentos;
  /** Só os tipos que a paróquia tem registrados, com quantos há de cada. */
  tipos: { id: SacramentType; quantos: number }[];
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const aceso = `${base} border-primary bg-primary-tint font-semibold text-primary`;
  const apagado = `${base} border-border text-muted hover:border-primary hover:text-foreground`;

  return (
    <div className="flex flex-col gap-3">
      <form action="/painel/sacramentos" className="flex flex-wrap items-center gap-2">
        {filtros.tipo && <input type="hidden" name="tipo" value={filtros.tipo} />}
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
            placeholder="Procurar pelo nome da pessoa"
            aria-label="Procurar sacramento pelo nome"
            className={`${INPUT_CLASSES} pl-9`}
          />
        </div>
      </form>

      {tipos.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={enderecoDosSacramentos({ ...filtros, tipo: null })}
            aria-pressed={filtros.tipo === null}
            className={filtros.tipo === null ? aceso : apagado}
          >
            Todos
          </Link>
          {tipos.map(({ id, quantos }) => {
            const marcado = filtros.tipo === id;
            return (
              <Link
                key={id}
                href={enderecoDosSacramentos({ ...filtros, tipo: marcado ? null : id })}
                aria-pressed={marcado}
                className={marcado ? aceso : apagado}
              >
                {SACRAMENT_TYPE_LABELS[id]}
                <span className={marcado ? "opacity-70" : ""}>{quantos}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
