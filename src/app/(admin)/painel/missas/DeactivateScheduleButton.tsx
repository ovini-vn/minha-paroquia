"use client";

import { useActionState, useState } from "react";
import {
  deactivateCelebrationScheduleAction,
  type ScheduleActionState,
} from "@/server/actions/agenda-actions";
import { Button } from "@/components/ui/Button";

const initialState: ScheduleActionState = {};

/**
 * Encerrar a repetição em dois toques.
 *
 * A segunda etapa diz o que acontece com as datas já lançadas, porque a
 * resposta não é óbvia: as que ninguém tocou somem, as que já têm escala
 * ficam. Descobrir isso depois seria assustador.
 */
export function DeactivateScheduleButton({ scheduleId }: { scheduleId: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [state, formAction, pending] = useActionState(
    deactivateCelebrationScheduleAction,
    initialState,
  );

  if (state.ok) {
    return <p className="text-[12.5px] leading-relaxed text-success">{state.ok}</p>;
  }

  if (!confirmando) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmando(true)}>
        Encerrar
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="scheduleId" value={scheduleId} />
      <p className="text-right text-[12.5px] leading-relaxed text-muted">
        Encerrar esta repetição? As datas futuras sem escala são removidas; as que já têm escala ou
        presença continuam na agenda.
      </p>
      {state.error && <p className="text-[12.5px] text-error">{state.error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Encerrando…" : "Sim, encerrar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmando(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
