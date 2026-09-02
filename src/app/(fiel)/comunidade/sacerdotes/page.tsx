import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, UserRound, Phone } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { listPriestsWithOpenings } from "@/server/modules/priests/service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/Typography";
import { Avatar } from "@/components/ui/Avatar";
import { oQueAtende } from "@/lib/pastoral-care-labels";
import { nomeDoSacerdote } from "@/lib/sacerdote";

/**
 * Quem atende, e quem tem horário aberto agora.
 *
 * "Falar com um sacerdote" levava para /comunidade e parava no alto de uma
 * tela longa — missas, eventos, avisos, mensagens do padre — com a lista de
 * sacerdotes lá embaixo. Quem procurava confissão tinha que rolar até achar
 * e adivinhar em quem tocar.
 *
 * A contagem de horários fica aqui, na lista, e não só na tela de agendar:
 * escolher um nome para descobrir depois que ele não abriu horário nenhum
 * faz a pessoa voltar e tentar outro às cegas.
 */
export const metadata: Metadata = { title: "Falar com um sacerdote" };

export default async function SacerdotesPage() {
  const session = await getSessionContext();
  if (!session?.membership) return null;

  const priests = await listPriestsWithOpenings(session.membership.parishId);
  const algumComVaga = priests.some((p) => p.vagas > 0);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Falar com um sacerdote"
        description="Confissão, direção espiritual ou uma conversa. Escolha com quem."
      />

      {priests.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Nenhum sacerdote cadastrado"
          description="Os sacerdotes da paróquia aparecem aqui assim que forem vinculados. Enquanto isso, a secretaria atende pelo telefone."
        />
      ) : (
        <Card className="px-3.5 py-1.5">
          {priests.map((priest) => (
            <Link
              key={priest.id}
              href={`/comunidade/sacerdotes/${priest.id}`}
              className="flex items-center gap-3.5 border-b border-border px-1 py-[15px] transition-colors last:border-b-0 hover:bg-primary-tint"
            >
              <Avatar name={nomeDoSacerdote(priest)} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-medium text-foreground">
                  {nomeDoSacerdote(priest)}
                </span>
                {/* O que ele atende vem junto do cargo, e não numa
                    tarja à parte: é a mesma pergunta — "quem é este e o
                    que dá para pedir a ele?". */}
                <span className="mt-0.5 block text-[12.5px] text-muted">
                  {priest.title}
                  {oQueAtende(priest) ? ` · ${oQueAtende(priest)}` : ""}
                </span>
              </span>
              {/* O número exato não ajuda a decidir e envelhece rápido; o
                  que importa é se vale tocar. */}
              {/*
                "Sem horários" dizia duas coisas ao mesmo tempo: "ainda não
                abriu" e "não faz isso". Quem procurava confissão desistia
                de um padre que confessa todo sábado. Agora quem não atende
                nada pelo app diz isso, e não finge que faltou agenda.
              */}
              <Badge
                tone={
                  !priest.ofereceAtendimento && !priest.ofereceConfissao
                    ? "muted"
                    : priest.vagas > 0
                      ? "success"
                      : "muted"
                }
              >
                {!priest.ofereceAtendimento && !priest.ofereceConfissao
                  ? "Pela secretaria"
                  : priest.vagas > 0
                    ? "Com horários"
                    : "Sem horários"}
              </Badge>
              <ChevronRight className="h-4 w-4 shrink-0 text-border-strong" strokeWidth={1.5} aria-hidden />
            </Link>
          ))}
        </Card>
      )}

      {/* A saída para quem não achou horário. Sem isto, a tela é um beco:
          "ninguém tem vaga" e ponto, como se não houvesse telefone. */}
      {priests.length > 0 && !algumComVaga && (
        <Card className="mt-4 border-gold/45 bg-gold/[0.07]">
          <p className="text-[14.5px] font-medium text-foreground">
            Nenhum horário aberto no momento
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Os sacerdotes ainda não publicaram horários por aqui. Isso não quer dizer que não haja
            atendimento — a secretaria marca por telefone e sabe das confissões antes das missas.
          </p>
          <LinkButton href="/contato" variant="gold" size="sm" className="mt-3.5">
            <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Falar com a paróquia
          </LinkButton>
        </Card>
      )}
    </div>
  );
}
