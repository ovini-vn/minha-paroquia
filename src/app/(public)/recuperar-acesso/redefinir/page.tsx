import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <EmptyState icon="⚠️" title="Link inválido" description="Peça um novo link de recuperação de acesso." />;
  }

  return (
    <Card>
      <h1 className="mb-4 font-serif text-xl text-ink-900">Escolha uma nova senha</h1>
      <ResetPasswordForm token={token} />
    </Card>
  );
}
