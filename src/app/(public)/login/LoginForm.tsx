"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { loginAction, type ActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

const initialState: ActionState = {};

/**
 * Entrar pelo Google ou Facebook em primeiro lugar; e-mail e senha
 * recolhidos atrás de um botão.
 *
 * Quem já está logado no celular entra com um toque, sem digitar nada — e
 * quem esquece a senha recupera com o provedor, que faz isso melhor do que
 * nós faríamos. A entrada por senha continua existindo porque nem todo mundo
 * tem conta Google ou Facebook, e porta única é porta que tranca.
 *
 * Os campos SAEM do DOM quando recolhidos, em vez de ficarem escondidos:
 * campo `required` invisível faz o navegador recusar o envio sem conseguir
 * mostrar o erro, e o formulário simplesmente não responde ao clique.
 */
export function LoginForm({ inviteCode }: { inviteCode: string | null }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  // Se o login por senha falhou, o formulário reabre: esconder o campo
  // levaria embora a mensagem que explica o erro.
  const [comSenha, setComSenha] = useState(false);
  const aberto = comSenha || Boolean(state.error);

  return (
    <div className="flex flex-col">
      <OAuthButtons inviteCode={inviteCode} />

      {/*
        O botão fica SEMPRE renderizado, e antes ficava só quando fechado.
        Um controle que some ao ser acionado não pode anunciar `aria-expanded`
        — quem usa leitor de tela ativaria algo que deixa de existir. De
        quebra, resolve um problema de todo mundo: não havia como voltar para
        Google e Facebook depois de abrir o formulário.
      */}
      <button
        type="button"
        onClick={() => setComSenha((atual) => !atual)}
        aria-expanded={aberto}
        // Só aponta para a região quando ela existe: o formulário é
        // desmontado ao fechar, de propósito (ver comentário do estado).
        aria-controls={aberto ? "form-senha" : undefined}
        className="mt-5 flex items-center justify-center gap-2 text-[13.5px] font-medium text-muted transition-colors hover:text-primary"
      >
        <KeyRound className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        Entrar com e-mail e senha
      </button>

      {aberto && (
        <>
          <div className="my-5 flex items-center gap-2.5 text-[10.5px] font-semibold uppercase tracking-eyebrow text-muted">
            <span className="rule-gold flex-1" />
            ou
            <span className="rule-gold flex-1" />
          </div>

          <form action={formAction} id="form-senha">
            {inviteCode && <input type="hidden" name="convite" value={inviteCode} />}
            <FormField label="E-mail" name="email" type="email" required autoComplete="email" />
            <FormField
              label="Senha"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
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
          </form>
        </>
      )}

      <p className="mt-6 text-center text-[12px] text-muted">
        <Link href="/privacidade" className="underline underline-offset-2">
          Política de Privacidade
        </Link>
      </p>
    </div>
  );
}
