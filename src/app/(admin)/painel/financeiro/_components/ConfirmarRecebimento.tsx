"use client";

import { useActionState, useState } from "react";
import { Check, Undo2 } from "lucide-react";
import {
  cancelarContribuicaoAction,
  confirmarRecebimentoAction,
  type ActionState,
} from "@/server/actions/contribuicao-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

const inicial: ActionState = {};

/**
 * "Este código caiu na conta."
 *
 * É conciliação manual sem arquivo nenhum: a secretaria olha o extrato no
 * aplicativo do banco e confirma. O identificador dispensa adivinhação —
 * ela não decide de quem é nem para quê, porque o código já sabe.
 *
 * Vai continuar existindo depois da importação de extrato: nem todo banco
 * devolve o identificador, e sempre sobra o que conferir com o olho.
 */
export function ConfirmarRecebimento({
  pixId,
  identificador,
  precisaDeValor,
  hoje,
}: {
  pixId: string;
  identificador: string;
  /** O código foi gerado sem valor: quem sabe quanto entrou é o extrato. */
  precisaDeValor: boolean;
  /** "2026-09-01" no fuso de Brasília. */
  hoje: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useActionState(confirmarRecebimentoAction, inicial);

  if (!aberto) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(true)}>
        <Check className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden />
        Caiu na conta
      </Button>
    );
  }

  return (
    <form action={acao} className="mt-3 flex flex-col gap-3 rounded-lg bg-sunken p-3.5">
      <input type="hidden" name="pixId" value={pixId} />

      <p className="text-[12.5px] leading-relaxed text-muted">
        Procure <strong className="font-mono text-foreground">{identificador}</strong> no extrato do
        banco. Confirmando, a contribuição aparece no histórico de quem gerou o código.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex w-[170px] flex-col gap-1.5">
          <label htmlFor={`dia-${pixId}`} className="text-sm font-medium text-muted">
            Dia em que entrou
          </label>
          <input
            id={`dia-${pixId}`}
            name="recebidaEm"
            type="date"
            required
            defaultValue={hoje}
            className={INPUT_CLASSES}
          />
        </div>

        {precisaDeValor && (
          <div className="flex w-[150px] flex-col gap-1.5">
            <label htmlFor={`valor-${pixId}`} className="text-sm font-medium text-muted">
              Quanto entrou
            </label>
            <input
              id={`valor-${pixId}`}
              name="valor"
              inputMode="decimal"
              required
              placeholder="Ex.: 50,00"
              className={INPUT_CLASSES}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Confirmando..." : "Confirmar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        {estado.error && <p className="w-full text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}

/**
 * Desfaz uma confirmação.
 *
 * Não apaga: marca como cancelada e devolve o código à espera. O registro de
 * que houve e foi desfeito é justamente o que a tesouraria precisa enxergar
 * — apagar a linha esconderia o próprio engano.
 */
export function DesfazerContribuicao({ contribuicaoId }: { contribuicaoId: string }) {
  const [estado, acao, pendente] = useActionState(cancelarContribuicaoAction, inicial);

  return (
    <form action={acao} className="inline-flex items-center gap-2">
      <input type="hidden" name="contribuicaoId" value={contribuicaoId} />
      <button
        type="submit"
        disabled={pendente}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-muted transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
      >
        <Undo2 className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
        {pendente ? "Desfazendo..." : "Desfazer"}
      </button>
      {estado.error && <span className="text-sm text-error">{estado.error}</span>}
    </form>
  );
}
