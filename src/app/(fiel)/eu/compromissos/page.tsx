import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, ChevronRight, ClipboardList, HandHeart, MessagesSquare, Users } from "lucide-react";
import { requireSessionForPage } from "@/server/auth/guards";
import { meusCompromissos, type Compromisso } from "@/server/modules/compromissos/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { VouNaoPosso } from "@/components/domain/VouNaoPosso";
import { formatDateOnly, formatDateTime } from "@/lib/date";

export const metadata: Metadata = { title: "Meus compromissos" };

const ICONE: Record<Compromisso["tipo"], typeof Users> = {
  escala: HandHeart,
  encontro: Users,
  tarefa: ClipboardList,
  mutirao: CalendarCheck,
  atendimento: MessagesSquare,
};

/**
 * Tudo o que a pessoa assumiu na comunidade, em ordem de data.
 *
 * A escala da missa, o encontro do grupo, a tarefa do lanche, o mutirão e a
 * conversa com o padre moravam em quatro telas. Aqui eles se encontram — e
 * é aqui que a pessoa percebe o choque de horário antes do domingo.
 */
export default async function MeusCompromissosPage() {
  const session = await requireSessionForPage();
  if (!session.membership) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para acompanhar a vida da comunidade."
      />
    );
  }

  const lista = await meusCompromissos(session.membership.parishId, session.userId, new Date());

  // Agrupados por dia, na ordem em que acontecem.
  const porDia = new Map<string, Compromisso[]>();
  for (const c of lista) {
    const dia = formatDateOnly(c.quando);
    porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Meus compromissos" description="O que você assumiu na comunidade, do mais próximo ao mais distante." />

      {lista.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Nenhum compromisso por enquanto"
          description="Quando você entrar num grupo, assumir uma escala ou se oferecer para ajudar, aparece aqui."
          action={
            <Link href="/servir" className="font-semibold text-primary underline">
              Ver onde servir
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {[...porDia.entries()].map(([dia, doDia]) => (
            <section key={dia}>
              <Eyebrow tone="accent" className="mb-2">
                {dia}
              </Eyebrow>
              <Card className="px-3.5 py-1">
                <ul>
                  {doDia.map((c) => {
                    const Icone = ICONE[c.tipo];
                    return (
                      <li key={c.chave} className="border-b border-border py-3 last:border-b-0">
                        <Link href={c.href} className="flex items-start gap-3 hover:text-primary">
                          <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                            <Icone className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14.5px] font-medium text-foreground">{c.titulo}</span>
                            <span className="mt-0.5 block text-[13px] text-muted">
                              {c.semHora ? "" : `${formatDateTime(c.quando).split(", ").pop()} · `}
                              {c.detalhe}
                            </span>
                          </span>
                          <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-border-strong" strokeWidth={1.5} aria-hidden />
                        </Link>
                        {c.encontroId && (
                          <div className="mt-2 pl-[50px]">
                            <VouNaoPosso alvo="encontro" alvoId={c.encontroId} vaiAtual={c.vai ?? null} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
      <div className="rule-gold my-7" />
    </div>
  );
}
