import type { Metadata } from "next";
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
export const metadata: Metadata = { title: "Nosso Pároco" };

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

  /*
   * Só oferece agendar quando ele atende ALGUMA coisa pelo aplicativo.
   * Vem do perfil, e não da existência de horários: um padre que confessa
   * todo sábado mas ainda não teve a agenda publicada continua sendo
   * alguém a quem se pede atendimento.
   */
  const atendePeloApp = Boolean(
    registrado && (registrado.ofereceAtendimento || registrado.ofereceConfissao),
  );

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

      {/*
        O caminho prático, e ele tem TRÊS casos, não dois.
        
        Antes eram dois: tem perfil, ou não tem. Faltava o do meio, que é o
        mais comum numa paróquia — o padre existe no app, mas não marca
        atendimento por ele. Esse caso caía no botão de agendar e levava a
        uma tela de "nenhum horário", como se faltasse agenda.
        
        Agora quem não atende pelo aplicativo diz isso e manda para a
        secretaria, que é onde o atendimento dele realmente se combina.
      */}
      <div className="pt-7">
        {paroco.priestProfileId && atendePeloApp ? (
          <LinkButton
            href={`/comunidade/sacerdotes/${paroco.priestProfileId}/agendar`}
            className="w-full"
          >
            <CalendarDays className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
            Solicitar atendimento
          </LinkButton>
        ) : (
          <LinkButton href="/contato" className="w-full">
            <Phone className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
            Falar com a secretaria
          </LinkButton>
        )}
        {paroco.priestProfileId && !atendePeloApp && (
          <p className="mt-2.5 text-center text-[12.5px] leading-relaxed text-muted">
            O atendimento com {paroco.nome} é combinado pela secretaria.
          </p>
        )}
      </div>

      <div className="rule-gold my-7" />
    </div>
  );
}
