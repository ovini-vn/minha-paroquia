import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Typography";
import { validateInvitation } from "@/server/modules/invitations/service";
import { RegisterForm } from "./RegisterForm";
import { Mail } from "lucide-react";

export const metadata: Metadata = { title: "Criar conta" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string }>;
}) {
  const { convite } = await searchParams;

  // Sem convite, a conta é criada do mesmo jeito e a paróquia é escolhida
  // no passo seguinte. Exigir convite para ver o horário da missa afastava
  // justamente quem o app deveria alcançar; a trava agora está no acesso às
  // pessoas, não na porta de entrada.
  if (!convite) {
    return (
      <Card className="p-6 shadow">
        <Eyebrow tone="accent">Criar conta</Eyebrow>
        <h1 className="mb-2 mt-1 font-serif text-2xl font-semibold leading-tight text-foreground">
          Bem-vindo ao Minha Paróquia
        </h1>
        <p className="mb-5 text-[13.5px] leading-relaxed text-muted">
          Você escolhe a sua paróquia logo depois de criar a conta.
        </p>
        <RegisterForm />
      </Card>
    );
  }

  const validation = await validateInvitation(convite);
  if (!validation.valid) {
    return (
      <EmptyState
        icon={Mail}
        title="Este convite não é mais válido"
        description="O link pode ter expirado ou já ter sido usado. Peça um novo convite à sua paróquia."
      />
    );
  }

  return (
    <Card className="p-6 shadow">
      <Eyebrow tone="accent">Você foi convidado para</Eyebrow>
      <h1 className="mb-5 mt-1 font-serif text-2xl font-semibold leading-tight text-foreground">
        {validation.invitation.parish.name}
      </h1>
      <RegisterForm inviteCode={convite} />
    </Card>
  );
}
