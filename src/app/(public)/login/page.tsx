import { Card } from "@/components/ui/Card";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string }>;
}) {
  const { convite } = await searchParams;

  return (
    <Card>
      <h1 className="mb-4 font-serif text-xl text-ink-900">Entrar</h1>
      <LoginForm inviteCode={convite ?? null} />
    </Card>
  );
}
