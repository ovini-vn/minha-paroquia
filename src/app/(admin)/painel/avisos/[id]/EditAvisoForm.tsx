"use client";

import { useActionState } from "react";
import { updateAvisoAction, type ActionState } from "@/server/actions/aviso-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

export function EditAvisoForm({ id, title, body }: { id: string; title: string; body: string }) {
  const [state, formAction, pending] = useActionState(updateAvisoAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="aviso-title" className="text-sm font-medium text-ink-700">
          Título
        </label>
        <input
          id="aviso-title"
          name="title"
          required
          defaultValue={title}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="aviso-body" className="text-sm font-medium text-ink-700">
          Texto
        </label>
        <textarea
          id="aviso-body"
          name="body"
          required
          rows={3}
          defaultValue={body}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
