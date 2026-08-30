"use client";

import { useActionState } from "react";
import { criarItinerarioAction, type ActionState } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";

const initialState: ActionState = {};

export function CriarItinerarioForm() {
  const [state, formAction, pending] = useActionState(criarItinerarioAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nome" className="text-sm font-medium text-muted">
          Nome do itinerário
        </label>
        <input
          id="nome"
          name="nome"
          required
          className={INPUT_CLASSES}
          placeholder="Ex.: Eucaristia · 1º ano"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="descricao" className="text-sm font-medium text-muted">
          Descrição (opcional)
        </label>
        <input
          id="descricao"
          name="descricao"
          className={INPUT_CLASSES}
          placeholder="Ex.: material da Arquidiocese de Londrina, 2026"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Criando..." : "Criar itinerário"}
        </Button>
        {state.error && <p className="text-sm text-error">{state.error}</p>}
      </div>
    </form>
  );
}
