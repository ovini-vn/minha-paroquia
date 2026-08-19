import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { validateInvitation, type InvitationValidation } from "@/server/modules/invitations/service";

type InvalidReason = Extract<InvitationValidation, { valid: false }>["reason"];

const INVALID_REASON_MESSAGE: Record<InvalidReason, string> = {
  not_found: "Não encontramos esse convite. Confira se o link ou código está correto.",
  used: "Este convite já foi utilizado.",
  revoked: "Este convite foi cancelado pela paróquia.",
  expired: "Este convite expirou.",
  exhausted: "Este convite já atingiu o limite de pessoas.",
};

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const validation = await validateInvitation(code);

  if (!validation.valid) {
    return (
      <EmptyState
        icon="✉️"
        title="Convite indisponível"
        description={INVALID_REASON_MESSAGE[validation.reason]}
      />
    );
  }

  return (
    <Card className="text-center">
      <p className="mb-1 text-sm text-terracotta-600">Você foi convidado para fazer parte da</p>
      <h1 className="mb-2 font-serif text-2xl text-ink-900">{validation.invitation.parish.name}</h1>
      <p className="mb-6 text-sm text-ink-700">Seja bem-vindo à sua comunidade.</p>
      <div className="flex flex-col gap-3">
        <LinkButton href={`/cadastro?convite=${code}`} className="w-full">
          Criar conta
        </LinkButton>
        <LinkButton href={`/login?convite=${code}`} variant="secondary" className="w-full">
          Já tenho conta
        </LinkButton>
      </div>
    </Card>
  );
}
