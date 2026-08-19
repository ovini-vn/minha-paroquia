"use client";

import { useActionState } from "react";
import { upsertAvailabilityAction, type ActionState } from "@/server/actions/liturgia-actions";
import { Button } from "@/components/ui/Button";
import { LITURGICAL_ROLE_LABELS } from "@/lib/liturgia-labels";
import { WEEKDAY_LABELS } from "@/lib/pastoral-care-labels";

const initialState: ActionState = {};

export function AvailabilityForm() {
  const [state, formAction, pending] = useActionState(upsertAvailabilityAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="roleType" className="text-sm font-medium text-ink-700">
          Função
        </label>
        <select
          id="roleType"
          name="roleType"
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          {Object.entries(LITURGICAL_ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="weekdayPref" className="text-sm font-medium text-ink-700">
          Dia preferido (opcional)
        </label>
        <select
          id="weekdayPref"
          name="weekdayPref"
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          <option value="">Sem preferência</option>
          {WEEKDAY_LABELS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium text-ink-700">
          Observação (opcional)
        </label>
        <input
          id="notes"
          name="notes"
          placeholder="Ex.: disponível eventualmente"
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Informar disponibilidade"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
