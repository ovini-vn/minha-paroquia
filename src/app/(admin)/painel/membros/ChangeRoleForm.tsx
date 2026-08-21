"use client";

import { useActionState } from "react";
import { changeMemberRoleAction, type MemberActionState } from "@/server/actions/parish-actions";
import { Button } from "@/components/ui/Button";
import { ROLE_CODES, ROLE_NAMES } from "@/server/auth/rbac";

const initialState: MemberActionState = {};

export function ChangeRoleForm({
  userId,
  fullName,
  currentRoleCode,
  ehVoce,
}: {
  userId: string;
  fullName: string;
  currentRoleCode: string;
  ehVoce: boolean;
}) {
  const [state, formAction, pending] = useActionState(changeMemberRoleAction, initialState);

  if (ehVoce) {
    // Não é só esconder o botão: o servidor recusa igualmente. Aqui é para
    // a pessoa entender por que a opção não está disponível.
    return (
      <p className="text-[12.5px] text-muted">Você não altera o seu próprio papel.</p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="fullName" value={fullName} />
      <select
        name="roleCode"
        defaultValue={currentRoleCode}
        className="rounded-xl border border-border bg-surface px-3 py-2 text-[13px] text-foreground"
        aria-label={`Papel de ${fullName}`}
      >
        {ROLE_CODES.map((code) => (
          <option key={code} value={code}>
            {ROLE_NAMES[code]}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Salvando…" : "Alterar"}
      </Button>
      {state.error && <p className="w-full text-right text-[12.5px] text-error">{state.error}</p>}
      {state.ok && <p className="w-full text-right text-[12.5px] text-success">{state.ok}</p>}
    </form>
  );
}
