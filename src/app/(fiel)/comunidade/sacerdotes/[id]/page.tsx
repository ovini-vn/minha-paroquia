import { notFound } from "next/navigation";
import { getSessionContext } from "@/server/auth/session";
import { getPriestProfile } from "@/server/modules/priests/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";

export default async function PriestProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session?.membership) return null;

  const priest = await getPriestProfile(session.membership.parishId, id);
  if (!priest) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl">
          {priest.user.fullName.charAt(0).toUpperCase()}
        </div>
        <p className="font-serif text-lg text-foreground">{priest.user.fullName}</p>
        <Badge>{priest.title}</Badge>
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-wide text-primary">Biografia</p>
        <p className="mt-1 text-sm text-muted">{priest.bio || "Biografia em breve."}</p>
      </Card>

      <LinkButton href={`/comunidade/sacerdotes/${priest.id}/agendar`} className="w-full">
        Solicitar atendimento
      </LinkButton>
    </div>
  );
}
