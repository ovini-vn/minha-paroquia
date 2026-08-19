"use client";

import { useActionState, useState } from "react";
import { createScheduleAction, type ActionState } from "@/server/actions/liturgia-actions";
import { Button } from "@/components/ui/Button";
import { LITURGICAL_ROLE_LABELS } from "@/lib/liturgia-labels";

const initialState: ActionState = {};

type Person = { userId: string; fullName: string };

export function CreateScheduleForm({
  celebrationId,
  availabilityByRole,
}: {
  celebrationId: string;
  availabilityByRole: Record<string, Person[]>;
}) {
  const [state, formAction, pending] = useActionState(createScheduleAction, initialState);
  const roles = Object.keys(LITURGICAL_ROLE_LABELS);
  const [role, setRole] = useState(roles[0]!);
  const people = availabilityByRole[role] ?? [];

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="celebrationId" value={celebrationId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`role-${celebrationId}`} className="text-sm font-medium text-ink-700">
          Função
        </label>
        <select
          id={`role-${celebrationId}`}
          name="roleType"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {LITURGICAL_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`person-${celebrationId}`} className="text-sm font-medium text-ink-700">
          Quem
        </label>
        <select
          id={`person-${celebrationId}`}
          name="userId"
          required
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          {people.length === 0 ? (
            <option value="">Ninguém disponível para esta função</option>
          ) : (
            people.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.fullName}
              </option>
            ))
          )}
        </select>
      </div>
      <Button type="submit" disabled={pending || people.length === 0}>
        {pending ? "Escalando..." : "Escalar"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
