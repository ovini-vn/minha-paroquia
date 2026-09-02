import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { getPriestProfile } from "@/server/modules/priests/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Eyebrow } from "@/components/ui/Typography";
import { nomeDoSacerdote } from "@/lib/sacerdote";

export default async function PriestProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session?.membership) return null;

  const priest = await getPriestProfile(session.membership.parishId, id);
  if (!priest) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-2 py-6 text-center">
        <Avatar name={nomeDoSacerdote(priest)} size="lg" />
        <p className="mt-1 font-serif text-2xl font-semibold text-foreground">
          {nomeDoSacerdote(priest)}
        </p>
        <Badge>{priest.title}</Badge>
      </Card>

      <Card>
        <Eyebrow tone="accent">Biografia</Eyebrow>
        <p className="mt-2 font-serif text-[17px] leading-relaxed text-foreground">
          {priest.bio || "Biografia em breve."}
        </p>
      </Card>

      <LinkButton href={`/comunidade/sacerdotes/${priest.id}/agendar`} className="w-full">
        <CalendarDays className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
        Solicitar atendimento
      </LinkButton>

      <div className="rule-gold my-4" />
    </div>
  );
}
