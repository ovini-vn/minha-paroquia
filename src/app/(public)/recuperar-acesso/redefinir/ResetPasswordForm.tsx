"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/Button";
import { CampoDeSenha } from "@/components/ui/CampoDeSenha";

const initialState: ActionState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <CampoDeSenha
        label="Nova senha"
        name="password"
        required
        minLength={8}
        autoComplete="new-password"
        hint="Pelo menos 8 caracteres."
      />
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
