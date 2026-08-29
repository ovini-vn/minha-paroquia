"use client";

import { useActionState } from "react";
import { createFamilyMemberAction, type ActionState } from "@/server/actions/family-actions";
import { Button } from "@/components/ui/Button";
import { RELATIONSHIP_LABELS } from "@/lib/familia-labels";
import { hojeEmBrasilia } from "@/lib/brasilia";

const initialState: ActionState = {};

export function FamilyMemberForm() {
  const [state, formAction, pending] = useActionState(createFamilyMemberAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-sm font-medium text-muted">
          Nome completo
        </label>
        <input
          id="fullName"
          name="fullName"
          required
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="relationship" className="text-sm font-medium text-muted">
          Relação
        </label>
        <select
          id="relationship"
          name="relationship"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        >
          {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="birthDate" className="text-sm font-medium text-muted">
          Data de nascimento (opcional)
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          max={hojeEmBrasilia()}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adicionando..." : "Adicionar"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
