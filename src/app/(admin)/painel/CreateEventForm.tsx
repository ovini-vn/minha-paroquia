"use client";

import { useActionState } from "react";
import { createEventAction, type ActionState } from "@/server/actions/agenda-actions";
import { Button } from "@/components/ui/Button";

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

      <div className="flex w-full flex-col gap-1.5">
        <label htmlFor="event-imageFile" className="text-sm font-medium text-muted">
          Cartaz do evento (opcional)
        </label>
        {podeEnviarArquivo ? (
          <>
            {/* capture não é usado: no celular, deixar escolher da galeria é
                o caso comum — o cartaz costuma vir pronto do WhatsApp. */}
            <input
              id="event-imageFile"
              name="imageFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary-tint file:px-3 file:py-1.5 file:text-sm file:text-primary"
            />
            <p className="text-[12px] text-muted">Até 5 MB. Ou cole um link abaixo.</p>
          </>
        ) : (
          <p className="text-[12px] text-muted">
            O envio de arquivo não está disponível. Cole o link da imagem abaixo.
            {motivoIndisponivel ? ` (${motivoIndisponivel})` : ""}
          </p>
        )}
        <input
          name="imageUrl"
          type="url"
          placeholder="https://..."
          aria-label="Link do cartaz"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Novo evento"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
