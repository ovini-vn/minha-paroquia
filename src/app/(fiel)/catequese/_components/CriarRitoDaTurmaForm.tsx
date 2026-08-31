"use client";

import { useActionState } from "react";
import { criarRitoDaTurmaAction, type ActionState } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

const initialState: ActionState = {};

/**
 * Marcar um rito para a turma — a entrega do Pai-Nosso, a apresentação à
 * comunidade.
 *
 * Um rito, uma vez. Quem participou é marcado depois, na lista da turma:
 * antes disto o mesmo rito era digitado uma vez por criança, e numa turma de
 * 25 isso são 25 digitações, cada uma podendo grafar o nome de um jeito.
 */
export function CriarRitoDaTurmaForm({ groupId }: { groupId: string }) {
  const [state, formAction, pending] = useActionState(criarRitoDaTurmaAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="groupId" value={groupId} />

      <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
        <label htmlFor="rito-nome" className="text-sm font-medium text-muted">
          Rito
        </label>
        <input
          id="rito-nome"
          name="nome"
          required
          className={INPUT_CLASSES}
          placeholder="Ex.: Entrega do Pai-Nosso"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rito-data" className="text-sm font-medium text-muted">
          Data prevista
        </label>
        {/* Opcional: a paróquia costuma saber o rito antes de saber o dia, e
            exigir a data faria o rito só ser cadastrado na véspera. */}
        <input id="rito-data" name="scheduledAt" type="date" className={INPUT_CLASSES} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Marcar rito"}
      </Button>
      {state.error && <p className="w-full text-sm text-error">{state.error}</p>}
    </form>
  );
}
