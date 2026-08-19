"use client";

import { useActionState } from "react";
import { createPrayerRequestAction, type ActionState } from "@/server/actions/prayer-request-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

export function PrayerRequestForm() {
  const [state, formAction, pending] = useActionState(createPrayerRequestAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="prayer-content" className="text-sm font-medium text-ink-700">
          Seu pedido
        </label>
        <textarea
          id="prayer-content"
          name="contentText"
          required
          rows={3}
          placeholder="Ex.: Peço orações pela saúde da minha mãe."
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="prayer-visibility" className="text-sm font-medium text-ink-700">
          Quem pode ver
        </label>
        <select
          id="prayer-visibility"
          name="visibility"
          defaultValue="padre"
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          <option value="padre">Só o pároco/sacerdote</option>
          <option value="comunidade">Mural da comunidade</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" name="isAnonymous" className="h-4 w-4" />
        Não mostrar meu nome
      </label>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Enviando..." : "Enviar pedido"}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
