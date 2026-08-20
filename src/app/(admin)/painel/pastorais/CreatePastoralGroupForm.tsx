"use client";

import { useActionState } from "react";
import { createPastoralGroupAction, type ActionState } from "@/server/actions/pastoral-actions";
import { Button } from "@/components/ui/Button";
import { FormField, INPUT_CLASSES } from "@/components/ui/FormField";

const initialState: ActionState = {};

export function CreatePastoralGroupForm() {
  const [state, formAction, pending] = useActionState(createPastoralGroupAction, initialState);

  return (
    <form action={formAction}>
      <FormField label="Nome da pastoral" name="name" required placeholder="Ex.: Pastoral da Criança" />

      <div className="mb-3.5">
        <label
          htmlFor="pastoral-description"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-muted"
        >
          O que faz (opcional)
        </label>
        <textarea
          id="pastoral-description"
          name="description"
          rows={2}
          className={INPUT_CLASSES}
          placeholder="Visita famílias e acompanha a saúde das crianças do bairro."
        />
      </div>

      <FormField label="Coordenador (opcional)" name="leaderName" placeholder="Ex.: Ivone Barros" />

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Quando se encontra (opcional)" name="meetsWhen" placeholder="Sábados, 9h" />
        <FormField label="Onde (opcional)" name="meetsWhere" placeholder="Sede da pastoral" />
      </div>

      {state.error && <p className="mb-3 text-sm text-error">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Cadastrar pastoral"}
      </Button>
    </form>
  );
}
