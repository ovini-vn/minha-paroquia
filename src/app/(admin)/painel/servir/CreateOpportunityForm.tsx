"use client";

import { useActionState } from "react";
import { createOpportunityAction, type ActionState } from "@/server/actions/opportunity-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

export function CreateOpportunityForm() {
  const [state, formAction, pending] = useActionState(createOpportunityAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-muted">
          Título
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="Ex.: Festa da Padroeira"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-muted">
          Precisamos de (opcional)
        </label>
        <input
          id="description"
          name="description"
          placeholder="Ex.: fotógrafo, recepção, música, organização"
          className="w-64 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="startsAt" className="text-sm font-medium text-muted">
          Data (opcional)
        </label>
        <input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar oportunidade"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
