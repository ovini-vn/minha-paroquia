"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type ActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

const initialState: ActionState = {};

export function LoginForm({ inviteCode }: { inviteCode: string | null }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {inviteCode && <input type="hidden" name="convite" value={inviteCode} />}
      <FormField label="E-mail" name="email" type="email" required autoComplete="email" />
      <FormField label="Senha" name="password" type="password" required autoComplete="current-password" />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
      <div className="flex justify-between text-sm text-terracotta-700">
        <Link href="/recuperar-acesso">Esqueci minha senha</Link>
        <Link href={inviteCode ? `/cadastro?convite=${inviteCode}` : "/cadastro"}>Criar conta</Link>
      </div>
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-ink-700">
        <span className="h-px flex-1 bg-terracotta-100" />
        ou
        <span className="h-px flex-1 bg-terracotta-100" />
      </div>
      <OAuthButtons inviteCode={inviteCode} />
    </form>
  );
}
