import { UserRound, CalendarDays } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { getParoco } from "@/server/modules/priests/service";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/Typography";
import { TextoRico } from "@/components/ui/TextoRico";

/**
 * "Nosso Pároco" — quem é o padre da casa.
 *
 * Conhecer o pároco pelo nome e pela história é o que faz alguém se sentir
 * à vontade para procurá-lo. Por isso a tela termina no caminho prático:
 * os horários em que ele atende.
 */
export default async function ParocoPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={UserRound}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para conhecer o pároco dela."
      />
    );
  }

  const paroco = await getParoco(session.membership.parishId);

  if (!paroco) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Nosso Pároco" description={session.membership.parishName} />
        <EmptyState
          icon={UserRound}
          title="O pároco ainda não foi apresentado aqui"
          description="A secretaria pode cadastrar a apresentação no Painel da Paróquia, em Nosso Pároco."
        />
        <div className="rule-gold my-7" />
      </div>
    );
  }

  const foto = paroco.photoUrl ?? paroco.user.photoUrl;

  return (
    <div className="flex flex-col">
      <PageHeader title="Nosso Pároco" description={session.membership.parishName} />

      <div className="flex flex-col items-center gap-2.5 pb-6 text-center">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt={paroco.user.fullName}
            className="h-32 w-32 rounded-full border-2 border-gold/50 object-cover"
          />
        ) : (
          <Avatar name={paroco.user.fullName} size="lg" />
        )}
        <p className="mt-1 font-serif text-[25px] font-semibold leading-tight text-foreground">
          {paroco.user.fullName}
        </p>
        <Badge tone="gold">{paroco.title}</Badge>
      </div>

      {paroco.bio ? (
        <TextoRico texto={paroco.bio} />
      ) : (
        <p className="text-[14.5px] leading-relaxed text-muted">
          A história do nosso pároco ainda será escrita aqui.
        </p>
      )}

      <div className="pt-7">
        <LinkButton href={`/comunidade/sacerdotes/${paroco.id}/agendar`} className="w-full">
          <CalendarDays className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
          Horários de atendimento
        </LinkButton>
      </div>

      <div className="rule-gold my-7" />
    </div>
  );
}
