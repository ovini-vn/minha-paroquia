"use client";

import { useActionState } from "react";
import {
  createProvinceAction,
  assignProvinceMemberAction,
  grantNationalScopeAction,
  type ActionState,
} from "@/server/actions/province-actions";
import { Button } from "@/components/ui/Button";
import { FormField, INPUT_CLASSES } from "@/components/ui/FormField";

const initialState: ActionState = {};

export function CreateProvinceForm() {
  const [state, formAction, pending] = useActionState(createProvinceAction, initialState);

  return (
    <form action={formAction}>
      <FormField
        label="Nome da província"
        name="name"
        required
        placeholder="Província Eclesiástica de Londrina"
      />
      {state.error && <p className="mb-3 text-sm text-error">{state.error}</p>}
      {state.ok && <p className="mb-3 text-sm text-success">Província criada.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar província"}
      </Button>
    </form>
  );
}

export function AssignProvinceMemberForm({ provinceId }: { provinceId: string }) {
  const [state, formAction, pending] = useActionState(assignProvinceMemberAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="provinceId" value={provinceId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <FormField
          label="E-mail da pessoa"
          name="email"
          type="email"
          required
          placeholder="arcebispo@exemplo.com"
          hint="A pessoa precisa já ter conta no app."
        />
        <div className="mb-3.5">
          <label
            htmlFor={`prole-${provinceId}`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-muted"
          >
            Função
          </label>
          <select id={`prole-${provinceId}`} name="role" className={INPUT_CLASSES}>
            <option value="ARCEBISPO_METROPOLITA">Arcebispo Metropolita</option>
            <option value="ADMINISTRADOR_PROVINCIAL">Administrador provincial</option>
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

export function GrantNationalScopeForm() {
  const [state, formAction, pending] = useActionState(grantNationalScopeAction, initialState);

  return (
    <form action={formAction}>
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <FormField
          label="E-mail da pessoa"
          name="email"
          type="email"
          required
          placeholder="presidente@cnbb.org.br"
          hint="A pessoa precisa já ter conta no app."
        />
        <div className="mb-3.5">
          <label
            htmlFor="national-role"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-muted"
          >
            Função
          </label>
          <select id="national-role" name="role" className={INPUT_CLASSES}>
            <option value="PRESIDENTE_CNBB">Presidente da CNBB</option>
            <option value="OBSERVADOR_NACIONAL">Observador nacional</option>
          </select>
        </div>
      </div>
      {state.error && <p className="mb-3 text-sm text-error">{state.error}</p>}
      {state.ok && <p className="mb-3 text-sm text-success">Acesso nacional concedido.</p>}
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Concedendo..." : "Conceder acesso nacional"}
      </Button>
    </form>
  );
}
