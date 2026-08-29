import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "./LoginForm";

const OAUTH_ERROR_LABELS: Record<string, string> = {
  oauth: "Não foi possível entrar com essa conta.",
  oauth_unavailable: "Esse login social não está disponível no momento.",
  oauth_state: "Sua sessão de login expirou. Tente novamente.",
};

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string; error?: string }>;
}) {
  const { convite, error } = await searchParams;
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
      {errorMessage && <p className="mb-4 text-sm text-error">{errorMessage}</p>}
      <LoginForm inviteCode={convite ?? null} />
    </Card>
  );
}
