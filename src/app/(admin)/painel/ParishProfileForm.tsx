"use client";

import { useActionState } from "react";
import { updateParishProfileAction, type ActionState } from "@/server/actions/parish-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

type ParishProfileFormProps = {
  address: string;
  phone: string;
  description: string;
  logoUrl: string;
};

export function ParishProfileForm({ address, phone, description, logoUrl }: ParishProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateParishProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="parish-address" className="text-sm font-medium text-ink-700">
          Endereço (opcional)
        </label>
        <input
          id="parish-address"
          name="address"
          defaultValue={address}
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="parish-phone" className="text-sm font-medium text-ink-700">
          Telefone (opcional)
        </label>
        <input
          id="parish-phone"
          name="phone"
          defaultValue={phone}
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="parish-description" className="text-sm font-medium text-ink-700">
          Descrição (opcional)
        </label>
        <textarea
          id="parish-description"
          name="description"
          rows={3}
          defaultValue={description}
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="parish-logoUrl" className="text-sm font-medium text-ink-700">
          URL do logo (opcional)
        </label>
        <input
          id="parish-logoUrl"
          name="logoUrl"
          type="url"
          defaultValue={logoUrl}
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
