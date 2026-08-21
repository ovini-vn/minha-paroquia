"use client";

import { useActionState } from "react";
import { createRiteAction, type ActionState } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

type Enrollment = { id: string; familyMember: { fullName: string } };

export function CreateRiteForm({ enrollments }: { enrollments: Enrollment[] }) {
  const [state, formAction, pending] = useActionState(createRiteAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="enrollmentId" className="text-sm font-medium text-muted">
          Matriculado
        </label>
        <select
          id="enrollmentId"
          name="enrollmentId"
          required
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        >
          {enrollments.map((e) => (
            <option key={e.id} value={e.id}>
              {e.familyMember.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-muted">
          Rito
        </label>
        <input
          id="name"
          name="name"
          placeholder="Ex.: Rito de Acolhida"
          required
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="scheduledAt" className="text-sm font-medium text-muted">
          Data prevista (opcional)
        </label>
        <input
          id="scheduledAt"
          name="scheduledAt"
          type="date"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adicionando..." : "Adicionar rito"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
