"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { removeFamilyMemberAction, type ActionState } from "@/server/actions/family-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

/**
 * Exclusão em dois toques.
 *
 * Não usa o confirm() do navegador de propósito: ele aparece deslocado do
 * app, some no modo instalado em alguns aparelhos, e não cabe explicar ali
 * o que a exclusão leva junto. Aqui a segunda etapa diz o que vai acontecer
 * antes de acontecer.
 */
export function RemoveFamilyMemberButton({
  familyMemberId,
  fullName,
}: {
  familyMemberId: string;
  fullName: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [state, formAction, pending] = useActionState(removeFamilyMemberAction, initialState);

  if (!confirmando) {
    return (
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmando(true)}>
          <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          Excluir cadastro
        </Button>
        {state.error && <p className="mt-2 text-[13px] leading-relaxed text-error">{state.error}</p>}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="familyMemberId" value={familyMemberId} />
      <p className="text-[13px] leading-relaxed text-muted">
        Excluir o cadastro de <span className="font-medium text-foreground">{fullName}</span>? Os
        responsáveis vinculados saem junto. Não dá para desfazer.
      </p>
      {state.error && <p className="text-[13px] leading-relaxed text-error">{state.error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Excluindo…" : "Sim, excluir"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmando(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
