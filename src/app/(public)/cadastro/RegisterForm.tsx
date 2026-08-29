"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { registerAction, type ActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { CampoDeSenha } from "@/components/ui/CampoDeSenha";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

const initialState: ActionState = {};

/**
 * Criar conta pelo Google ou Facebook em primeiro lugar.
 *
 * Pelo caminho social não existe senha para escolher nem para esquecer: a
 * conta nasce do provedor. A criação com senha fica recolhida, para quem não
 * tem nenhuma das duas.
 *
 * Sem inviteCode, a paróquia é escolhida depois de criar a conta.
 */
export function RegisterForm({ inviteCode = "" }: { inviteCode?: string }) {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  // Erro reabre o formulário: esconder levaria embora a explicação.
  const [comSenha, setComSenha] = useState(false);
  const aberto = comSenha || Boolean(state.error);

  return (
    <div className="flex flex-col">
      <OAuthButtons inviteCode={inviteCode} />

      {aberto ? (
        <>
          <div className="my-5 flex items-center gap-2.5 text-[10.5px] font-semibold uppercase tracking-eyebrow text-muted">
            <span className="rule-gold flex-1" />
            ou
            <span className="rule-gold flex-1" />
          </div>

          <form action={formAction} className="flex flex-col gap-4">
            {inviteCode && <input type="hidden" name="convite" value={inviteCode} />}
            <FormField label="Nome completo" name="fullName" required autoComplete="name" />
            <FormField label="E-mail" name="email" type="email" required autoComplete="email" />
            <CampoDeSenha
              label="Senha"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              hint="Pelo menos 8 caracteres."
            />
            {state.error && <p className="text-sm text-error">{state.error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Criando conta..." : "Criar conta e entrar na comunidade"}
            </Button>
          </form>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setComSenha(true)}
          className="mt-5 flex items-center justify-center gap-2 text-[13.5px] font-medium text-muted transition-colors hover:text-primary"
        >
          <KeyRound className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          Criar conta com e-mail e senha
        </button>
      )}

      <p className="mt-5 text-center text-sm text-primary">
        Já tem conta?{" "}
        <Link href={inviteCode ? `/login?convite=${inviteCode}` : "/login"} className="hover:underline">
          Entrar
        </Link>
      </p>

      <p className="mt-4 text-center text-[12px] leading-relaxed text-muted">
        Ao criar sua conta você concorda com a{" "}
        <Link href="/privacidade" className="text-primary underline underline-offset-2">
          Política de Privacidade
        </Link>
        .
      </p>
    </div>
  );
}
