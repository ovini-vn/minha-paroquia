"use client";

import { useActionState } from "react";
import { createEventAction, type ActionState } from "@/server/actions/agenda-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

export function CreateEventForm() {
  const [state, formAction, pending] = useActionState(createEventAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-title" className="text-sm font-medium text-muted">
          Título
        </label>
        <input
          id="event-title"
          name="title"
          required
          placeholder="Ex.: Festa da Padroeira"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-startsAt" className="text-sm font-medium text-muted">
          Data e hora
        </label>
        <input
          id="event-startsAt"
          name="startsAt"
          type="datetime-local"
          required
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-location" className="text-sm font-medium text-muted">
          Local (opcional)
        </label>
        <input
          id="event-location"
          name="location"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-imageUrl" className="text-sm font-medium text-muted">
          Cartaz (link da imagem)
        </label>
        <input
          id="event-imageUrl"
          name="imageUrl"
          type="url"
          placeholder="https://..."
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Novo evento"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
