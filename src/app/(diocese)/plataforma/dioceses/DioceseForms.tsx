"use client";

import { useActionState } from "react";
import {
  createDioceseAction,
  assignDioceseMemberAction,
  type ActionState,
} from "@/server/actions/diocese-actions";
import { Button } from "@/components/ui/Button";
import { FormField, INPUT_CLASSES } from "@/components/ui/FormField";

const initialState: ActionState = {};

export function CreateDioceseForm() {
  const [state, formAction, pending] = useActionState(createDioceseAction, initialState);

  return (
    <form action={formAction}>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <FormField label="Nome da diocese" name="name" required placeholder="Diocese de Londrina" />
        <FormField label="UF" name="state" maxLength={2} placeholder="PR" className="uppercase" />
      </div>
      {state.error && <p className="mb-3 text-sm text-error">{state.error}</p>}
      {state.ok && <p className="mb-3 text-sm text-success">Diocese criada.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar diocese"}
      </Button>
    </form>
  );
}

export function AssignDioceseMemberForm({ dioceseId }: { dioceseId: string }) {
  const [state, formAction, pending] = useActionState(assignDioceseMemberAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="dioceseId" value={dioceseId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <FormField
          label="E-mail da pessoa"
          name="email"
          type="email"
          required
          placeholder="bispo@exemplo.com"
          hint="A pessoa precisa já ter conta no app."
        />
        <div className="mb-3.5">
          <label
            htmlFor={`role-${dioceseId}`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-muted"
          >
            Função
          </label>
          <select id={`role-${dioceseId}`} name="role" className={INPUT_CLASSES}>
            <option value="BISPO">Bispo</option>
            <option value="ADMINISTRADOR_DIOCESANO">Administrador diocesano</option>
          </select>
        </div>
      </div>
      {state.error && <p className="mb-3 text-sm text-error">{state.error}</p>}
      {state.ok && <p className="mb-3 text-sm text-success">Vínculo criado.</p>}
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Vinculando..." : "Vincular"}
      </Button>
    </form>
  );
}
