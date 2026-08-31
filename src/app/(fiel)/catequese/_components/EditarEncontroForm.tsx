"use client";

import { useActionState, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { editarEncontroAction, type ActionState } from "@/server/actions/catequese-actions";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import type { TemaOferecido } from "./CreateSessionForm";

const initialState: ActionState = {};

/**
 * Corrigir um encontro já lançado.
 *
 * Fechado por padrão: a lista de encontros existe para ir à chamada, e um
 * formulário aberto em cada linha viraria uma parede. Abre por um botão de
 * "corrigir", que é a exceção e não a regra.
 *
 * A exclusão do encontro fica no mesmo formulário, e não como botão solto:
 * apagar por engano ao mirar em "salvar" é o tipo de acidente que a
 * separação evita.
 */
export function EditarEncontroForm({
  groupId,
  sessionId,
  date,
  topic,
  itinerarioTemaId,
  temas,
}: {
  groupId: string;
  sessionId: string;
  /** Dia do encontro, como "2026-08-29". */
  date: string;
  topic: string | null;
  itinerarioTemaId: string | null;
  temas: TemaOferecido[];
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useActionState(editarEncontroAction, initialState);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
        Corrigir
      </button>
    );
  }

  return (
    <form action={acao} className="mt-2 flex w-full flex-col gap-3 rounded-lg bg-sunken p-3.5">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`data-${sessionId}`} className="text-sm font-medium text-muted">
            Data
          </label>
          <input
            id={`data-${sessionId}`}
            name="date"
            type="date"
            required
            defaultValue={date}
            className={INPUT_CLASSES}
          />
        </div>

        {temas.length > 0 && (
          <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            <label htmlFor={`tema-${sessionId}`} className="text-sm font-medium text-muted">
              Tema do itinerário
            </label>
            <select
              id={`tema-${sessionId}`}
              name="itinerarioTemaId"
              defaultValue={itinerarioTemaId ?? ""}
              className={INPUT_CLASSES}
            >
              <option value="">Fora do roteiro</option>
              {temas.map((tema) => (
                <option key={tema.id} value={tema.id}>
                  {tema.ordem}. {tema.titulo}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`topico-${sessionId}`} className="text-sm font-medium text-muted">
          {temas.length > 0 ? "Observações" : "O que foi dado"}
        </label>
        <input
          id={`topico-${sessionId}`}
          name="topic"
          defaultValue={topic ?? ""}
          className={INPUT_CLASSES}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        {/* Apagar o encontro leva junto a chamada dele — dito aqui, e não
            num "tem certeza?" que aparece depois do clique. */}
        <button
          type="submit"
          name="apagar"
          value="sim"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-muted transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
          Apagar encontro e a chamada dele
        </button>
        {estado.error && <p className="w-full text-sm text-error">{estado.error}</p>}
      </div>
    </form>
  );
}
