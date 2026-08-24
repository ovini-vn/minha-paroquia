"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { addGuardianAction, type ActionState } from "@/server/actions/family-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

/**
 * Adiciona outro responsável pelo NOME COMPLETO.
 *
 * Antes era uma lista com todos os membros da paróquia, o que entregava a
 * qualquer pessoa logada o cadastro de quem frequenta. Agora é preciso já
 * saber o nome inteiro de quem se quer vincular — quem não sabe não
 * descobre, porque não há lista, busca parcial nem sugestão.
 */
export function AddGuardianForm({ familyMemberId }: { familyMemberId: string }) {
  const [state, formAction, pending] = useActionState(addGuardianAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="familyMemberId" value={familyMemberId} />
      <label htmlFor="guardian-nome" className="text-sm font-medium text-muted">
        Adicionar outro responsável
      </label>
      <div className="flex flex-wrap items-start gap-2">
        <input
          id="guardian-nome"
          name="fullName"
          required
          autoComplete="off"
          placeholder="Nome completo, como está no cadastro"
          className="min-w-[16rem] flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
        <Button type="submit" disabled={pending}>
          <UserPlus className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
          {pending ? "Adicionando…" : "Adicionar"}
        </Button>
      </div>
      <p className="text-[12.5px] text-muted">
        A pessoa já precisa ter conta no app, e o nome deve ser digitado por inteiro.
      </p>
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.ok && <p className="text-sm text-success">{state.ok}</p>}
    </form>
  );
}
