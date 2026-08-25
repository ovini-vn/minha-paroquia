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
    <form action={formAction}>
      {inviteCode && <input type="hidden" name="convite" value={inviteCode} />}
      <FormField label="E-mail" name="email" type="email" required autoComplete="email" />
      <FormField label="Senha" name="password" type="password" required autoComplete="current-password" />
      {state.error && <p className="mb-3 text-sm text-error">{state.error}</p>}
      <Button type="submit" disabled={pending} className="mt-1 flex w-full">
        {pending ? "Entrando..." : "Entrar"}
      </Button>
      <div className="mt-4 flex justify-between text-[13px] font-medium text-primary">
        <Link href="/recuperar-acesso" className="hover:underline">
          Esqueci minha senha
        </Link>
        <Link
          href={inviteCode ? `/cadastro?convite=${inviteCode}` : "/cadastro"}
          className="hover:underline"
        >
          Criar conta
        </Link>
      </div>
      <div className="my-5 flex items-center gap-2.5 text-[10.5px] font-semibold uppercase tracking-eyebrow text-muted">
        <span className="rule-gold flex-1" />
        ou
        <span className="rule-gold flex-1" />
      </div>
      <OAuthButtons inviteCode={inviteCode} />

      <p className="text-center text-[12px] text-muted">
        <Link href="/privacidade" className="underline underline-offset-2">
          Política de Privacidade
        </Link>
      </p>
    </form>
  );
}
