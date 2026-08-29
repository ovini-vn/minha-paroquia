"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { loginAction, type ActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { CampoDeSenha } from "@/components/ui/CampoDeSenha";
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
            <CampoDeSenha label="Senha" name="password" required autoComplete="current-password" />
            {state.error && <p className="mb-3 text-sm text-error">{state.error}</p>}
            <Button type="submit" disabled={pending} className="mt-1 flex w-full">
              {pending ? "Entrando..." : "Entrar"}
            </Button>
            {/* "Esqueci minha senha" fica aqui porque só faz sentido para
                quem está tentando entrar com senha. "Criar conta" saiu: quem
                ainda não tem conta não abre um formulário de senha para
                descobrir como criar uma. */}
            <div className="mt-4 text-[13px] font-medium text-primary">
              <Link href="/recuperar-acesso" className="hover:underline">
                Esqueci minha senha
              </Link>
            </div>
          </form>
        </>
      )}

      {/*
        SEMPRE visível, e antes ficava dentro do formulário de senha: quem
        chegava sem convite e não queria usar Google ou Facebook não
        encontrava como criar conta. É a porta de entrada do produto, e
        estava atrás de um clique que não fazia sentido dar.
      */}
      <p className="mt-6 border-t border-border pt-5 text-center text-[13.5px] text-muted">
        Ainda não tem conta?{" "}
        <Link
          href={inviteCode ? `/cadastro?convite=${inviteCode}` : "/cadastro"}
          className="font-medium text-primary hover:underline"
        >
          Criar conta
        </Link>
      </p>

      {/* O link da política saiu daqui: passou a viver no rodapé da área
          pública, que vale para o cadastro e a recuperação também. Manter
          nos dois lugares o fazia aparecer duas vezes na mesma tela. */}
    </div>
  );
}
