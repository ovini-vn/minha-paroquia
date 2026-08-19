import { getSessionContext } from "@/server/auth/session";
import { listPriests } from "@/server/modules/priests/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SacramentForm } from "./SacramentForm";

export default async function NewSacramentPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon="🙏"
        title="Você ainda não pertence a uma comunidade"
        description="Peça ao seu pároco, secretaria ou a alguém da paróquia um link ou QR Code de convite para entrar."
      />
    );
  }

  const priests = await listPriests(session.membership.parishId);

  return (
    <Card>
      <h1 className="mb-4 font-serif text-xl text-foreground">Registrar sacramento</h1>
      <SacramentForm priests={priests} />
    </Card>
  );
}
