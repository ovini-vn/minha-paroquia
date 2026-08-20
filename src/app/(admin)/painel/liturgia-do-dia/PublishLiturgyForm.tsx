"use client";

import { useActionState } from "react";
import { publishLiturgyAction, type ActionState } from "@/server/actions/liturgy-actions";
import { Button } from "@/components/ui/Button";
import { FormField, INPUT_CLASSES } from "@/components/ui/FormField";

const initialState: ActionState = {};

export function PublishLiturgyForm({ defaultDate }: { defaultDate: string }) {
  const [state, formAction, pending] = useActionState(publishLiturgyAction, initialState);

  return (
    <form action={formAction}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Dia" name="date" type="date" required defaultValue={defaultDate} />
        <FormField
          label="Evangelho"
          name="gospelReference"
          required
          placeholder="Mt 20, 1-16"
          hint="Só a referência."
        />
      </div>

      <FormField
        label="Título da passagem (opcional)"
        name="gospelTitle"
        placeholder="Os trabalhadores da vinha"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="1ª leitura (opcional)" name="firstReading" placeholder="Is 55, 6-9" />
        <FormField label="Salmo (opcional)" name="psalm" placeholder="Sl 144" />
        <FormField label="2ª leitura (opcional)" name="secondReading" placeholder="Fl 1, 20-24" />
      </div>

      <div className="mb-3.5">
        <label
          htmlFor="liturgy-reflection"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-muted"
        >
          Reflexão (opcional)
        </label>
        <textarea
          id="liturgy-reflection"
          name="reflection"
          rows={4}
          className={INPUT_CLASSES}
          placeholder="Uma pergunta ou provocação para a comunidade levar no dia."
        />
        <p className="mt-1.5 text-xs text-muted">
          Escreva com suas palavras. Não copie o texto bíblico de uma edição publicada — as
          traduções são protegidas por direito autoral.
        </p>
      </div>

      {state.error && <p className="mb-3 text-sm text-error">{state.error}</p>}
      {state.ok && <p className="mb-3 text-sm text-success">Leituras publicadas.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Publicando..." : "Publicar"}
      </Button>
    </form>
  );
}
