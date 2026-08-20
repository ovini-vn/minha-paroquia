import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Typography";
import { validateInvitation, type InvitationValidation } from "@/server/modules/invitations/service";
import { Mail } from "lucide-react";

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
        icon={Mail}
        title="Convite indisponível"
        description={INVALID_REASON_MESSAGE[validation.reason]}
      />
    );
  }

  return (
    <Card className="p-6 text-center shadow">
      <Eyebrow tone="accent">Você foi convidado para fazer parte da</Eyebrow>
      <h1 className="mb-2 mt-1.5 font-serif text-[28px] font-semibold leading-tight text-foreground">
        {validation.invitation.parish.name}
      </h1>
      <p className="text-[13.5px] text-muted">Seja bem-vindo à sua comunidade.</p>

      <div className="rule-gold my-5" />

      <div className="flex flex-col gap-2.5">
        <LinkButton href={`/cadastro?convite=${code}`} className="w-full">
          Criar conta
        </LinkButton>
        <LinkButton href={`/login?convite=${code}`} variant="ghost" className="w-full">
          Já tenho conta
        </LinkButton>
      </div>
    </Card>
  );
}
