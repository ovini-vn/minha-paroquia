"use client";

import { useActionState } from "react";
import { createInvitationAction, type ActionState } from "@/server/actions/invitation-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

export function CreateInviteForm() {
  const [state, formAction, pending] = useActionState(createInvitationAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="type" className="text-sm font-medium text-muted">
          Tipo
        </label>
        <select
          id="type"
          name="type"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        >
          <option value="link">Link</option>
          <option value="qrcode">QR Code</option>
          <option value="individual">Individual</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="role" className="text-sm font-medium text-muted">
          Vínculo
        </label>
        <select
          id="role"
          name="role"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        >
          <option value="FIEL">Fiel</option>
          <option value="SACERDOTE">Sacerdote</option>
          <option value="SECRETARIA">Secretaria</option>
          <option value="COORDENADOR_PASTORAL">Coordenador de Pastoral</option>
          <option value="CATEQUISTA">Catequista</option>
          <option value="COORDENADOR_LITURGIA">Coordenador de Liturgia</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="expiresInDays" className="text-sm font-medium text-muted">
          Validade (dias, opcional)
        </label>
        <input
          id="expiresInDays"
          name="expiresInDays"
          type="number"
          min={1}
          placeholder="Sem validade"
          className="w-40 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar convite"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
