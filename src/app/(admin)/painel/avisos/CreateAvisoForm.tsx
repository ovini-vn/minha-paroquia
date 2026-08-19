"use client";

import { useActionState } from "react";
import { createAvisoAction, type ActionState } from "@/server/actions/aviso-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

export function CreateAvisoForm() {
  const [state, formAction, pending] = useActionState(createAvisoAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="aviso-title" className="text-sm font-medium text-ink-700">
          Título
        </label>
        <input
          id="aviso-title"
          name="title"
          required
          placeholder="Ex.: Mudança de horário da missa"
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
          placeholder="Ex.: Neste domingo a missa das 19h será realizada às 18h."
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Publicando..." : "Publicar aviso"}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
