"use client";

import { useActionState } from "react";
import { setOverrideAction, type ActionState } from "@/server/actions/permission-override-actions";
import { PERMISSION_NAMES, type PermissionCode } from "@/server/auth/rbac";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

type SetOverrideFormProps = {
  members: { userId: string; fullName: string; roleName: string }[];
};

export function SetOverrideForm({ members }: SetOverrideFormProps) {
  const [state, formAction, pending] = useActionState(setOverrideAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="override-userId" className="text-sm font-medium text-ink-700">
          Pessoa
        </label>
        <select
          id="override-userId"
          name="userId"
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.fullName} · {member.roleName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="override-permissionCode" className="text-sm font-medium text-ink-700">
          Permissão
        </label>
        <select
          id="override-permissionCode"
          name="permissionCode"
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          {(Object.entries(PERMISSION_NAMES) as [PermissionCode, string][]).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="override-granted" className="text-sm font-medium text-ink-700">
          Ação
        </label>
        <select
          id="override-granted"
          name="granted"
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          <option value="true">Conceder</option>
          <option value="false">Revogar</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Aplicar"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
