import Link from "next/link";
import { DOACAO_ESPONTANEA } from "@/server/modules/contribuicao/schema";
import {
  enderecoDoFinanceiro,
  PERIODOS,
  type FiltrosDeContribuicoes,
} from "./filtros";

/**
 * Período e finalidade, para a tesouraria responder "quanto entrou de quê,
 * quando".
 *
 * O TOTAL da seção segue este filtro — é o que torna a pergunta
 * respondível. Um total fixo ao lado de uma lista recortada seria a pior
 * combinação possível numa tela de dinheiro: dois números verdadeiros
 * dizendo coisas diferentes, sem avisar.
 *
 * A doação espontânea entra como uma opção, e não como ausência: ela é um
 * recorte legítimo — "quanto veio sem destino declarado" é uma pergunta que
 * a paróquia faz.
 */
export function FiltroDeContribuicoes({
  filtros,
  finalidades,
  temEspontanea,
}: {
  filtros: FiltrosDeContribuicoes;
  /** Só as que de fato receberam algo no acervo — filtrar por vazio frustra. */
  finalidades: { id: string; nome: string }[];
  temEspontanea: boolean;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const aceso = `${base} border-primary bg-primary-tint font-semibold text-primary`;
  const apagado = `${base} border-border text-muted hover:border-primary hover:text-foreground`;

  const opcoes = [
    ...finalidades.map((f) => ({ id: f.id, rotulo: f.nome })),
    ...(temEspontanea ? [{ id: "sem", rotulo: DOACAO_ESPONTANEA }] : []),
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map(({ id, rotulo }) => (
          <Link
            key={id}
            href={enderecoDoFinanceiro({ ...filtros, periodo: id })}
            aria-pressed={filtros.periodo === id}
            className={filtros.periodo === id ? aceso : apagado}
          >
            {rotulo}
          </Link>
        ))}
      </div>

      {opcoes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={enderecoDoFinanceiro({ ...filtros, finalidade: null })}
            aria-pressed={filtros.finalidade === null}
            className={filtros.finalidade === null ? aceso : apagado}
          >
            Todas as finalidades
          </Link>

          {opcoes.map(({ id, rotulo }) => {
            const marcada = filtros.finalidade === id;
            return (
              <Link
                key={id}
                // Tocar no que já está marcado volta para todas.
                href={enderecoDoFinanceiro({ ...filtros, finalidade: marcada ? null : id })}
                aria-pressed={marcada}
                className={marcada ? aceso : apagado}
              >
                {rotulo}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
