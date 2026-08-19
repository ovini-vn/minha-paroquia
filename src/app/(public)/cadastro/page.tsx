import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { validateInvitation } from "@/server/modules/invitations/service";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string }>;
}) {
  const { convite } = await searchParams;

  if (!convite) {
    return (
      <EmptyState
        icon="✉️"
        title="Você precisa de um convite"
        description="A Comunidade cresce por convite da própria paróquia — peça ao seu pároco, secretaria ou a alguém da comunidade o link ou QR Code de convite."
      />
    );
  }

  const validation = await validateInvitation(convite);
  if (!validation.valid) {
    return (
      <EmptyState
        icon="✉️"
        title="Este convite não é mais válido"
        description="O link pode ter expirado ou já ter sido usado. Peça um novo convite à sua paróquia."
      />
    );
  }

  return (
    <Card>
      <p className="mb-1 text-sm text-terracotta-600">Você foi convidado para</p>
      <h1 className="mb-4 font-serif text-xl text-ink-900">{validation.invitation.parish.name}</h1>
      <RegisterForm inviteCode={convite} />
    </Card>
  );
}
