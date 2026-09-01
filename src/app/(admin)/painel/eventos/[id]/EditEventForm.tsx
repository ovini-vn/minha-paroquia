"use client";

import { useActionState } from "react";
import { updateEventAction, type ActionState } from "@/server/actions/agenda-actions";
import { Button } from "@/components/ui/Button";
import { CATEGORIAS, ORDEM_DA_LEGENDA } from "@/lib/agenda-categorias";

const initialState: ActionState = {};

type EditEventFormProps = {
  id: string;
  title: string;
  description: string;
  startsAtLocal: string;
  location: string;
  /** O tipo que dá a cor na agenda. */
  categoria: string;
};

export function EditEventForm({
  id,
  title,
  description,
  startsAtLocal,
  location,
  categoria,
}: EditEventFormProps) {
  const [state, formAction, pending] = useActionState(updateEventAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-title" className="text-sm font-medium text-muted">
          Título
        </label>
        <input
          id="event-title"
          name="title"
          required
          defaultValue={title}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-categoria" className="text-sm font-medium text-muted">
          Tipo
        </label>
        <select
          id="event-categoria"
          name="categoria"
          defaultValue={categoria}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        >
          {ORDEM_DA_LEGENDA.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORIAS[cat].rotulo} — {CATEGORIAS[cat].descricao}
            </option>
          ))}
        </select>
        {/* Dito aqui porque a consequência é fora desta tela: é o tipo que
            dá a cor do evento na agenda e o deixa achável pelo filtro. */}
        <p className="text-[12px] leading-relaxed text-muted">
          Define a cor do evento na agenda e permite filtrá-lo por lá.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-description" className="text-sm font-medium text-muted">
          Descrição (opcional)
        </label>
        <textarea
          id="event-description"
          name="description"
          rows={3}
          defaultValue={description}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-startsAt" className="text-sm font-medium text-muted">
          Data e hora
        </label>
        <input
          id="event-startsAt"
          name="startsAt"
          type="datetime-local"
          required
          defaultValue={startsAtLocal}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-location" className="text-sm font-medium text-muted">
          Local (opcional)
        </label>
        <input
          id="event-location"
          name="location"
          defaultValue={location}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
