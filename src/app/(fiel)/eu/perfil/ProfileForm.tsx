"use client";

import { useActionState } from "react";
import { updateProfileAction, type ActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/Button";

const initialState: ActionState = {};

type ProfileFormProps = {
  fullName: string;
  phone: string;
  birthDate: string;
  photoUrl: string;
};

export function ProfileForm({ fullName, phone, birthDate, photoUrl }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-sm font-medium text-muted">
          Nome completo
        </label>
        <input
          id="fullName"
          name="fullName"
          required
          defaultValue={fullName}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-medium text-muted">
          Telefone (opcional)
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={phone}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="birthDate" className="text-sm font-medium text-muted">
          Data de nascimento (opcional)
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          defaultValue={birthDate}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="photoUrl" className="text-sm font-medium text-muted">
          URL da foto (opcional)
        </label>
        <input
          id="photoUrl"
          name="photoUrl"
          type="url"
          defaultValue={photoUrl}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
