"use client";

import { useActionState } from "react";
import { createSessionAction, type ActionState } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

export function CreateSessionForm({ groupId }: { groupId: string }) {
  const [state, formAction, pending] = useActionState(createSessionAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="date" className="text-sm font-medium text-muted">
          Data do encontro
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="topic" className="text-sm font-medium text-muted">
          Tema (opcional)
        </label>
        <input
          id="topic"
          name="topic"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Novo encontro"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
