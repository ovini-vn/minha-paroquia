"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type ActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

const initialState: ActionState = {};

/** Sem inviteCode, a paróquia é escolhida depois de criar a conta. */
export function RegisterForm({ inviteCode = "" }: { inviteCode?: string }) {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {inviteCode && <input type="hidden" name="convite" value={inviteCode} />}
      <FormField label="Nome completo" name="fullName" required autoComplete="name" />
      <FormField label="E-mail" name="email" type="email" required autoComplete="email" />
      <FormField
        label="Senha"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Criando conta..." : "Criar conta e entrar na comunidade"}
      </Button>
      <p className="text-center text-sm text-primary">
        Já tem conta? <Link href={inviteCode ? `/login?convite=${inviteCode}` : "/login"}>Entrar</Link>
      </p>
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>
      <OAuthButtons inviteCode={inviteCode} />

      <p className="text-center text-[12px] leading-relaxed text-muted">
        Ao criar sua conta você concorda com a{" "}
        <Link href="/privacidade" className="text-primary underline underline-offset-2">
          Política de Privacidade
        </Link>
        .
      </p>
    </form>
  );
}
