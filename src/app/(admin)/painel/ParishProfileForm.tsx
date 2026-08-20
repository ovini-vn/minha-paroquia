"use client";

import { useActionState } from "react";
import { updateParishProfileAction, type ActionState } from "@/server/actions/parish-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

type ParishProfileFormProps = {
  city: string;
  state: string;
  address: string;
  phone: string;
  description: string;
  logoUrl: string;
};

export function ParishProfileForm({ city, state, address, phone, description, logoUrl }: ParishProfileFormProps) {
  const [formState, formAction, pending] = useActionState(updateParishProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="parish-city" className="text-sm font-medium text-muted">
            Cidade
          </label>
          <input
            id="parish-city"
            name="city"
            defaultValue={city}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="parish-state" className="text-sm font-medium text-muted">
            UF
          </label>
          <input
            id="parish-state"
            name="state"
            maxLength={2}
            defaultValue={state}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm uppercase text-foreground"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="parish-address" className="text-sm font-medium text-muted">
          Endereço (opcional)
        </label>
        <input
          id="parish-address"
          name="address"
          defaultValue={address}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="parish-phone" className="text-sm font-medium text-muted">
          Telefone (opcional)
        </label>
        <input
          id="parish-phone"
          name="phone"
          defaultValue={phone}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="parish-description" className="text-sm font-medium text-muted">
          Descrição (opcional)
        </label>
        <textarea
          id="parish-description"
          name="description"
          rows={3}
          defaultValue={description}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="parish-logoUrl" className="text-sm font-medium text-muted">
          URL do logo (opcional)
        </label>
        <input
          id="parish-logoUrl"
          name="logoUrl"
          type="url"
          defaultValue={logoUrl}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
      {formState.error && <p className="text-sm text-red-600">{formState.error}</p>}
    </form>
  );
}
