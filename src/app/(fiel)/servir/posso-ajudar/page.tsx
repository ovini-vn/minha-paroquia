import { getSessionContext } from "@/server/auth/session";
import { getOwnVolunteerProfile } from "@/server/modules/volunteering/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { VolunteerProfileForm } from "./VolunteerProfileForm";

export default async function VolunteerProfilePage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon="❤️"
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const existing = await getOwnVolunteerProfile(session.membership.parishId, session.userId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-xl text-ink-900">Eu posso ajudar</h1>
        <p className="mt-1 text-sm text-ink-700">
          Conte pra sua comunidade como você pode contribuir. Não é um compromisso — é só um ponto de partida.
        </p>
      </div>
      <Card>
        <VolunteerProfileForm existing={existing} />
      </Card>
    </div>
  );
}
