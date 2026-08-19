"use client";

import { useActionState } from "react";
import { addGuardianAction, type ActionState } from "@/server/actions/family-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

type AddGuardianFormProps = {
  familyMemberId: string;
  candidates: { id: string; fullName: string }[];
};

export function AddGuardianForm({ familyMemberId, candidates }: AddGuardianFormProps) {
  const [state, formAction, pending] = useActionState(addGuardianAction, initialState);

  if (candidates.length === 0) {
    return <p className="text-sm text-ink-700">Todos os membros da paróquia já são responsáveis por este dependente.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="familyMemberId" value={familyMemberId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="guardian-userId" className="text-sm font-medium text-ink-700">
          Adicionar responsável
        </label>
        <select
          id="guardian-userId"
          name="userId"
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.fullName}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adicionando..." : "Adicionar"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
