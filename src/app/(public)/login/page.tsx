import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "./LoginForm";
import { CONVITES_ATIVOS } from "@/lib/funcionalidades";

const OAUTH_ERROR_LABELS: Record<string, string> = {
  oauth: "Não foi possível entrar com essa conta.",
  oauth_unavailable: "Esse login social não está disponível no momento.",
  oauth_state: "Sua sessão de login expirou. Tente novamente.",
};

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string; error?: string; conta?: string }>;
}) {
  const { convite, error, conta } = await searchParams;
  const errorMessage = error ? (OAUTH_ERROR_LABELS[error] ?? error) : null;

  return (
    <Card className="p-6 shadow">
      <h1 className="font-serif text-2xl font-semibold text-foreground">Entrar</h1>
      {/*
        Quem chega aqui pela primeira vez não sabia o que o aplicativo faz —
        a tela pedia senha antes de dizer para quê. Uma linha resolve, e ela
        vem da própria promessa do produto.
      */}
      <p className="mb-5 mt-1.5 text-[13.5px] leading-relaxed text-muted">
        A vida da sua paróquia durante a semana: missas, avisos, a palavra do padre e a Bíblia.
      </p>
      {conta === "excluida" && (
        <p className="mb-4 rounded-md bg-sunken px-3 py-2.5 text-[13.5px] text-foreground">
          Sua conta foi excluída. Obrigado por ter caminhado com a comunidade.
        </p>
      )}
      {errorMessage && <p className="mb-4 text-sm text-error">{errorMessage}</p>}
      {/* Convites desligados: o código do endereço não segue adiante
          (ver src/lib/funcionalidades.ts). */}
      <LoginForm inviteCode={CONVITES_ATIVOS ? (convite ?? null) : null} />
    </Card>
  );
}
