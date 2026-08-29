import type { Metadata } from "next";
import { getSessionContext } from "@/server/auth/session";
import { getOwnVolunteerProfile } from "@/server/modules/volunteering/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/Typography";
import { VolunteerProfileForm } from "./VolunteerProfileForm";
import { HeartHandshake } from "lucide-react";

export const metadata: Metadata = { title: "Posso ajudar" };

export default async function VolunteerProfilePage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={HeartHandshake}
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const existing = await getOwnVolunteerProfile(session.membership.parishId, session.userId);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Eu posso ajudar"
        description="Conte pra sua comunidade como você pode contribuir. Não é um compromisso — é só um ponto de partida."
      />
      <Card>
        <VolunteerProfileForm existing={existing} />
      </Card>
    </div>
  );
}
