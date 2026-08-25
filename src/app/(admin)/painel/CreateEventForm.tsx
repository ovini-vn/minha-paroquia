"use client";

import { useActionState } from "react";
import { createEventAction, type ActionState } from "@/server/actions/agenda-actions";
import { Button } from "@/components/ui/Button";
import { CampoDeImagem } from "@/components/ui/CampoDeImagem";

const initialState: ActionState = {};

export function CreateEventForm({
  podeEnviarArquivo = false,
  motivoIndisponivel = "",
}: {
  podeEnviarArquivo?: boolean;
  /** Só para quem administra: por que o envio não está disponível. */
  motivoIndisponivel?: string;
}) {
  const [state, formAction, pending] = useActionState(createEventAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-title" className="text-sm font-medium text-muted">
          Título
        </label>
        <input
          id="event-title"
          name="title"
          required
          placeholder="Ex.: Festa da Padroeira"
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
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex w-full flex-col gap-1.5">
        <label htmlFor="event-description" className="text-sm font-medium text-muted">
          Descrição (opcional)
        </label>
        <textarea
          id="event-description"
          name="description"
          rows={3}
          maxLength={500}
          placeholder="O que vai acontecer, quem pode participar, o que levar…"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>

      <div className="w-full">
        <CampoDeImagem
          nomeDoArquivo="imageFile"
          nomeDoLink="imageUrl"
          rotulo="Cartaz do evento (opcional)"
          podeEnviarArquivo={podeEnviarArquivo}
          motivoIndisponivel={motivoIndisponivel}
          ajuda="Ou cole um link acima."
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Novo evento"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
