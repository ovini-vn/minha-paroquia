"use client";

import { useActionState } from "react";
import { registerSacramentAction, type ActionState } from "@/server/actions/caminhada-actions";
import { Button } from "@/components/ui/Button";
import { SACRAMENT_TYPE_LABELS } from "@/lib/caminhada-labels";
import { hojeEmBrasilia } from "@/lib/brasilia";

const initialState: ActionState = {};

type Priest = { id: string; user: { fullName: string } };

export function SacramentForm({ priests }: { priests: Priest[] }) {
  const [state, formAction, pending] = useActionState(registerSacramentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="type" className="text-sm font-medium text-muted">
          Sacramento
        </label>
        <select
          id="type"
          name="type"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        >
          {Object.entries(SACRAMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="date" className="text-sm font-medium text-muted">
          Data
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          max={hojeEmBrasilia()}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="location" className="text-sm font-medium text-muted">
          Local (opcional)
        </label>
        <input
          id="location"
          name="location"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>

      {priests.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="priestProfileId" className="text-sm font-medium text-muted">
            Sacerdote (opcional)
          </label>
          <select
            id="priestProfileId"
            name="priestProfileId"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
          >
            <option value="">—</option>
            {priests.map((priest) => (
              <option key={priest.id} value={priest.id}>
                {priest.user.fullName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm font-medium text-muted">
          Observação (opcional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>

      <p className="text-xs text-muted">
        Este registro é pessoal — se sua paróquia guarda um registro oficial, ela pode validar depois.
      </p>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
