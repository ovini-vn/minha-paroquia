import Link from "next/link";

/**
 * Ano e situação — dois eixos, como nos eventos.
 *
 * O ano é orthogonal à situação: "as turmas de 2026 que estão atrasadas" é
 * uma pergunta inteira, e um eixo só obrigaria a escolher entre saber de que
 * ano e saber o que precisa de atenção.
 *
 * A situação traz LISTAS DE TRABALHO, e não recortes decorativos: turma
 * atrasada no lançamento, turma sem catequista, turma sem itinerário. São as
 * três coisas que fazem a coordenação abrir turma por turma hoje.
 */
export const SITUACOES = [
  { id: "todas", rotulo: "Todas" },
  { id: "atrasadas", rotulo: "Precisam de atenção" },
  { id: "sem-catequista", rotulo: "Sem catequista" },
  { id: "sem-itinerario", rotulo: "Sem itinerário" },
] as const;

export type SituacaoDeTurmas = (typeof SITUACOES)[number]["id"];

export type FiltrosDeTurmas = { ano: number; situacao: SituacaoDeTurmas };

export function enderecoDaCatequese(filtros: FiltrosDeTurmas, anoPadrao: number): string {
  const params = new URLSearchParams();
  if (filtros.ano !== anoPadrao) params.set("ano", String(filtros.ano));
  if (filtros.situacao !== "todas") params.set("situacao", filtros.situacao);
  const busca = params.toString();
  return busca ? `/catequese?${busca}` : "/catequese";
}

export function FiltroDeTurmas({
  filtros,
  anos,
  anoPadrao,
  quantos,
}: {
  filtros: FiltrosDeTurmas;
  /** Os anos que têm turma — filtrar por ano vazio é frustração combinada. */
  anos: number[];
  anoPadrao: number;
  quantos: Record<SituacaoDeTurmas, number>;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const aceso = `${base} border-primary bg-primary-tint font-semibold text-primary`;
  const apagado = `${base} border-border text-muted hover:border-primary hover:text-foreground`;

  return (
    <div className="mb-3 flex flex-col gap-2.5">
      {/*
        O ano só aparece quando há mais de um.

        Uma paróquia no primeiro ano de uso tem 2026 e nada mais; um botão
        "2026" sozinho não escolhe coisa nenhuma, só ocupa a linha.
      */}
      {anos.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {anos.map((ano) => (
            <Link
              key={ano}
              href={enderecoDaCatequese({ ...filtros, ano }, anoPadrao)}
              aria-pressed={filtros.ano === ano}
              className={filtros.ano === ano ? aceso : apagado}
            >
              {ano}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {SITUACOES.map(({ id, rotulo }) => (
          <Link
            key={id}
            href={enderecoDaCatequese({ ...filtros, situacao: id }, anoPadrao)}
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
