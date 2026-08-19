"use client";

import { useActionState } from "react";
import { createCelebrationAction, type ActionState } from "@/server/actions/agenda-actions";
import { Button } from "@/components/ui/Button";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";

const initialState: ActionState = {};

type Priest = { id: string; title: string; user: { fullName: string } };

export function CreateCelebrationForm({ priests }: { priests: Priest[] }) {
  const [state, formAction, pending] = useActionState(createCelebrationAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="celebration-type" className="text-sm font-medium text-ink-700">
          Tipo
        </label>
        <select
          id="celebration-type"
          name="type"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        >
          {Object.entries(CELEBRATION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="celebration-title" className="text-sm font-medium text-ink-700">
          Título (opcional)
        </label>
        <input
          id="celebration-title"
          name="title"
          placeholder="Ex.: Missa dominical"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="celebration-startsAt" className="text-sm font-medium text-ink-700">
          Data e hora
        </label>
        <input
          id="celebration-startsAt"
          name="startsAt"
          type="datetime-local"
          required
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="celebration-location" className="text-sm font-medium text-ink-700">
          Local (opcional)
        </label>
        <input
          id="celebration-location"
          name="location"
          placeholder="Igreja Matriz"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      {priests.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="celebration-priest" className="text-sm font-medium text-ink-700">
            Celebrante (opcional)
          </label>
          <select
            id="celebration-priest"
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
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Nova celebração"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
