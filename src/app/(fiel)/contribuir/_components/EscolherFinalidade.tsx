"use client";

import { useActionState, useState } from "react";
import { gerarPixAction, type ActionState } from "@/server/actions/contribuicao-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { Heart } from "lucide-react";
import { iconeDeDoacao } from "@/lib/doacao";

const inicial: ActionState = {};

export type FinalidadeOferecida = {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string;
};

/**
 * Escolher a finalidade e, se quiser, o valor.
 *
 * A finalidade vem primeiro porque é ela que dá sentido ao resto: "R$ 50"
 * não quer dizer nada; "R$ 50 para a catequese" quer.
 *
 * O valor é opcional e está dito na tela. O dízimo é assim — cada um dá o
 * quanto pode —, e deixar em branco manda o aplicativo do banco perguntar,
 * que é onde a pessoa está mais à vontade para decidir.
 */
/**
 * A doação espontânea é uma escolha, e não a falta de uma.
 *
 * Ela não é cadastrada por ninguém: existe sempre, porque "quero ajudar e
 * não faço questão de dizer para quê" é um gesto inteiro. Fica no fim das
 * opções, e não no começo, porque quem já sabe a que quer destinar deve
 * encontrar a sua primeiro.
 */
const ESPONTANEA = "espontanea";

export function EscolherFinalidade({
  finalidades,
  finalidadeInicial,
}: {
  finalidades: FinalidadeOferecida[];
  /** Vem de uma iniciativa que trouxe a pessoa até aqui. */
  finalidadeInicial?: string | null;
}) {
  /*
   * Só aceita o que existe e está sendo oferecido. Um endereço com uma
   * finalidade desativada não deve deixar a pessoa contribuir para algo que
   * a paróquia encerrou.
   */
  const [escolhida, setEscolhida] = useState<string | null>(
    finalidadeInicial && finalidades.some((f) => f.id === finalidadeInicial)
      ? finalidadeInicial
      : null,
  );
  const [estado, acao, pendente] = useActionState(gerarPixAction, inicial);

  return (
    <form action={acao} className="flex flex-col gap-4">
      {/* A espontânea vai como vazio: no servidor, a ausência É o dado. */}
      <input
        type="hidden"
        name="finalidadeId"
        value={escolhida && escolhida !== ESPONTANEA ? escolhida : ""}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {finalidades.map((f) => {
          const Icone = iconeDeDoacao(f.icone);
          const marcada = escolhida === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setEscolhida(f.id)}
              aria-pressed={marcada}
              className={
                marcada
                  ? "flex flex-col items-start gap-2 rounded-lg border-2 border-primary bg-primary-tint p-3 text-left transition-colors"
                  : "flex flex-col items-start gap-2 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              }
            >
              <Icone
                className={marcada ? "h-5 w-5 text-primary" : "h-5 w-5 text-muted"}
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="text-[13.5px] font-semibold leading-tight text-foreground">
                {f.nome}
              </span>
              {f.descricao && (
                <span className="line-clamp-2 text-[12px] leading-snug text-muted">
                  {f.descricao}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setEscolhida(ESPONTANEA)}
          aria-pressed={escolhida === ESPONTANEA}
          className={
            escolhida === ESPONTANEA
              ? "flex flex-col items-start gap-2 rounded-lg border-2 border-primary bg-primary-tint p-3 text-left transition-colors"
              : "flex flex-col items-start gap-2 rounded-lg border border-dashed border-border-strong bg-surface p-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          }
        >
          <Heart
            className={escolhida === ESPONTANEA ? "h-5 w-5 text-primary" : "h-5 w-5 text-muted"}
            strokeWidth={1.5}
            aria-hidden
          />
          <span className="text-[13.5px] font-semibold leading-tight text-foreground">
            Doação espontânea
          </span>
          <span className="line-clamp-2 text-[12px] leading-snug text-muted">
            Sem destino definido — a paróquia aplica onde for mais necessário.
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="valor" className="text-sm font-medium text-muted">
          Valor (opcional)
        </label>
        <input
          id="valor"
          name="valor"
          inputMode="decimal"
          placeholder="Ex.: 50,00"
          className={INPUT_CLASSES}
        />
        <p className="text-[12px] leading-relaxed text-muted">
          Deixe em branco para escolher o valor no aplicativo do seu banco.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pendente || !escolhida}>
          {pendente ? "Gerando..." : "Gerar meu código PIX"}
        </Button>
        {!escolhida && (
          <p className="text-[12.5px] text-muted">Escolha uma finalidade acima.</p>
        )}
        {estado.error && <p className="w-full text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}
