import { EmptyState } from "@/components/ui/EmptyState";

export default function ResetSentPage() {
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <EmptyState
      icon="📬"
      title="Se este e-mail existir, enviamos um link"
      description={
        isDev
          ? "Modo desenvolvimento: como ainda não há provedor de e-mail configurado, o link de recuperação foi escrito no console do servidor em vez de enviado."
          : "Confira sua caixa de entrada (e o spam) — o link expira em 1 hora."
      }
    />
  );
}
