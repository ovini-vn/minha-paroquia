import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { TriangleAlert } from "lucide-react";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <EmptyState icon={TriangleAlert} title="Link inválido" description="Peça um novo link de recuperação de acesso." />;
  }

  return (
    <Card className="p-6 shadow">
      <h1 className="mb-5 font-serif text-2xl font-semibold text-foreground">
        Escolha uma nova senha
      </h1>
      <ResetPasswordForm token={token} />
    </Card>
  );
}
