"use client";

import { useActionState } from "react";
import { enrollFamilyMemberAction, type ActionState } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

type FamilyMemberOption = { id: string; fullName: string; responsible: { fullName: string } };

export function EnrollForm({ groupId, familyMembers }: { groupId: string; familyMembers: FamilyMemberOption[] }) {
  const [state, formAction, pending] = useActionState(enrollFamilyMemberAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="familyMemberId" className="text-sm font-medium text-ink-700">
          Dependente
        </label>
        <select
          id="familyMemberId"
          name="familyMemberId"
          required
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          <option value="">Selecione...</option>
          {familyMembers.map((fm) => (
            <option key={fm.id} value={fm.id}>
              {fm.fullName} (responsável: {fm.responsible.fullName})
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Matriculando..." : "Matricular"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
