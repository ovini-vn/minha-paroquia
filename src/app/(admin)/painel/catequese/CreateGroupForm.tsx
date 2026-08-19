"use client";

import { useActionState } from "react";
import { createGroupAction, type ActionState } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

type Catechist = { user: { id: string; fullName: string } };

export function CreateGroupForm({ catechists }: { catechists: Catechist[] }) {
  const [state, formAction, pending] = useActionState(createGroupAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-ink-700">
          Nome da turma
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Ex.: Primeira Eucaristia A"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="year" className="text-sm font-medium text-ink-700">
          Ano
        </label>
        <input
          id="year"
          name="year"
          type="number"
          required
          defaultValue={new Date().getFullYear()}
          className="w-28 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      {catechists.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="catechistUserId" className="text-sm font-medium text-ink-700">
            Catequista (opcional)
          </label>
          <select
            id="catechistUserId"
            name="catechistUserId"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
          >
            <option value="">—</option>
            {catechists.map((c) => (
              <option key={c.user.id} value={c.user.id}>
                {c.user.fullName}
              </option>
            ))}
          </select>
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar turma"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
