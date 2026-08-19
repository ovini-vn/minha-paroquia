"use client";

import { useActionState } from "react";
import { registerMassParticipationAction, type ActionState } from "@/server/actions/caminhada-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

export function MassParticipationForm() {
  const [state, formAction, pending] = useActionState(registerMassParticipationAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="participatedAt" className="text-sm font-medium text-muted">
          Quando foi?
        </label>
        <input
          id="participatedAt"
          name="participatedAt"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          max={new Date().toISOString().slice(0, 10)}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reflectionText" className="text-sm font-medium text-muted">
          O que você aprendeu hoje?
        </label>
        <textarea
          id="reflectionText"
          name="reflectionText"
          rows={5}
          placeholder="Aprendi que..."
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
        <p className="text-xs text-muted">
          Fica só com você — sua paróquia só vê quantas pessoas refletiram, nunca o que você escreveu.
        </p>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
