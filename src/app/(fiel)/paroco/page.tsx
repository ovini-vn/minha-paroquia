import { UserRound, CalendarDays, Phone } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { getParish } from "@/server/modules/parishes/service";
import { resolverParoco } from "@/server/modules/parishes/paroco";
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
 * à vontade para procurá-lo. Por isso a tela termina num caminho prático:
 * os horários dele, quando ele usa o aplicativo; o contato da secretaria,
 * quando não usa.
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

  const parishId = session.membership.parishId;
  const [parish, registrado] = await Promise.all([getParish(parishId), getParoco(parishId)]);
  const paroco = parish ? resolverParoco(parish, registrado) : null;

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

  return (
    <div className="flex flex-col">
      <PageHeader title="Nosso Pároco" description={session.membership.parishName} />

      <div className="flex flex-col items-center gap-2.5 pb-6 text-center">
        {paroco.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={paroco.fotoUrl}
            alt={paroco.nome}
            className="h-32 w-32 rounded-full border-2 border-gold/50 object-cover"
          />
        ) : (
          <Avatar name={paroco.nome} size="lg" />
        )}
        <p className="mt-1 font-serif text-[25px] font-semibold leading-tight text-foreground">
          {paroco.nome}
        </p>
        <Badge tone="gold">{paroco.titulo}</Badge>
      </div>

      {paroco.historia ? (
        <TextoRico texto={paroco.historia} />
      ) : (
        <p className="text-[14.5px] leading-relaxed text-muted">
          A história do nosso pároco ainda será escrita aqui.
        </p>
      )}

      <div className="pt-7">
        {paroco.priestProfileId ? (
          <LinkButton href={`/comunidade/sacerdotes/${paroco.priestProfileId}/agendar`} className="w-full">
            <CalendarDays className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
            Horários de atendimento
          </LinkButton>
        ) : (
          // Sem conta no aplicativo não há agenda para consultar; quem marca
          // atendimento com ele é a secretaria.
          <LinkButton href="/contato" className="w-full">
            <Phone className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
            Falar com a secretaria
          </LinkButton>
        )}
      </div>

      <div className="rule-gold my-7" />
    </div>
  );
}
