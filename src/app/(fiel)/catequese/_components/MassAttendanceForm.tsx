"use client";

import { useActionState } from "react";
import { Church } from "lucide-react";
import { setMassAttendanceAction, type MassAttendanceState } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";

const initialState: MassAttendanceState = {};

/**
 * Lançamento de presença na missa, feito pelo catequista.
 *
 * A data é obrigatória e a missa é opcional: a paróquia pode não ter aquela
 * celebração cadastrada, e travar a chamada nisso faria o catequista
 * desistir de lançar.
 */
export function MassAttendanceForm({
  enrollmentId,
  celebracoes,
}: {
  enrollmentId: string;
  celebracoes: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(setMassAttendanceAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="m-attendedOn" className="text-sm font-medium text-muted">
          Dia da missa
        </label>
        <input
          id="m-attendedOn"
          name="attendedOn"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      {celebracoes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="m-celebration" className="text-sm font-medium text-muted">
            Qual missa (opcional)
          </label>
          <select
            id="m-celebration"
            name="celebrationId"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
          >
            <option value="">—</option>
            {celebracoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <Button type="submit" disabled={pending}>
        <Church className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
        {pending ? "Lançando…" : "Lançar presença"}
      </Button>
      {state.error && <p className="w-full text-sm text-error">{state.error}</p>}
      {state.ok && <p className="w-full text-sm text-success">{state.ok}</p>}
    </form>
  );
}
