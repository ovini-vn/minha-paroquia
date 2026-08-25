"use client";

import { useActionState } from "react";
import { updateParishProfileAction, type ActionState } from "@/server/actions/parish-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

export type ParishProfileFormProps = {
  city: string;
  state: string;
  address: string;
  phone: string;
  whatsapp: string;
  description: string;
  logoUrl: string;
  facebookUrl: string;
  instagramUrl: string;
};

const campo = "rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground";

function Campo({
  nome,
  rotulo,
  ajuda,
  ...rest
}: {
  nome: string;
  rotulo: string;
  ajuda?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`parish-${nome}`} className="text-sm font-medium text-muted">
        {rotulo}
      </label>
      <input id={`parish-${nome}`} name={nome} className={campo} {...rest} />
      {ajuda && <p className="text-xs text-muted">{ajuda}</p>}
    </div>
  );
}

export function ParishProfileForm({
  city,
  state,
  address,
  phone,
  whatsapp,
  description,
  logoUrl,
  facebookUrl,
  instagramUrl,
}: ParishProfileFormProps) {
  const [formState, formAction, pending] = useActionState(updateParishProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Campo nome="city" rotulo="Cidade" defaultValue={city} />
        <Campo nome="state" rotulo="UF" maxLength={2} defaultValue={state} className={`${campo} uppercase`} />
      </div>

      <Campo
        nome="address"
        rotulo="Endereço"
        ajuda="Usado no botão “Como chegar”, que abre o app de navegação."
        defaultValue={address}
      />

      <div className="grid grid-cols-2 gap-3">
        <Campo
          nome="phone"
          rotulo="Telefone"
          type="tel"
          ajuda="Abre o discador."
          defaultValue={phone}
        />
        <Campo
          nome="whatsapp"
          rotulo="WhatsApp"
          type="tel"
          ajuda="Com DDD. Ex.: (43) 99999-0000"
          defaultValue={whatsapp}
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
          className={campo}
        />
      </div>

      <Campo nome="logoUrl" rotulo="URL do logo (opcional)" type="url" defaultValue={logoUrl} />
      <Campo
        nome="instagramUrl"
        rotulo="Instagram (opcional)"
        type="url"
        ajuda="Endereço completo, ex.: https://instagram.com/suaparoquia"
        defaultValue={instagramUrl}
      />
      <Campo
        nome="facebookUrl"
        rotulo="Facebook (opcional)"
        type="url"
        ajuda="Endereço completo, ex.: https://facebook.com/suaparoquia"
        defaultValue={facebookUrl}
      />

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
      {formState.error && <p className="text-sm text-red-600">{formState.error}</p>}
    </form>
  );
}
