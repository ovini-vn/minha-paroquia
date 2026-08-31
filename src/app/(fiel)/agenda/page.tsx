import type { Metadata } from "next";
import { CalendarDays, Church, PartyPopper } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { listUpcomingCelebrations } from "@/server/modules/celebrations/service";
import { listUpcomingEvents } from "@/server/modules/events/service";
import { listPriests } from "@/server/modules/priests/service";
import { isUploadConfigured, diagnosticoDoUpload } from "@/server/modules/uploads/service";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/Typography";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";
import { AcoesRapidas } from "@/components/domain/AcoesRapidas";
import { ProximosEncontros, type Encontro } from "@/components/domain/ProximosEncontros";
import { CreateCelebrationForm } from "@/app/(admin)/painel/CreateCelebrationForm";
import { CreateEventForm } from "@/app/(admin)/painel/CreateEventForm";

/**
 * A agenda da PARÓQUIA: o que vai acontecer, em ordem.
 *
 * Antes esta tela agrupava por dia e misturava os atendimentos pessoais de
 * quem estava olhando — o que fazia "Agenda" significar duas coisas ao mesmo
 * tempo. Atendimento é assunto pessoal e vive em Eu → Meus atendimentos.
 *
 * A lista é o mesmo componente da Comunidade, para as duas não divergirem
 * de novo: antes só a de lá mostrava o cartaz do evento.
 */
export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage() {
  const session = await getSessionContext();
  if (!session?.membership) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Você ainda não pertence a uma comunidade"
        description="Escolha a sua paróquia para acompanhar as missas, celebrações e eventos."
      />
    );
  }

  const parishId = session.membership.parishId;
  const podeLancar =
    session.isPlatformAdmin || session.permissions.includes(PERMISSIONS.AGENDA_MANAGE);

  const [celebrations, events, priests] = await Promise.all([
    listUpcomingCelebrations(parishId, 30),
    listUpcomingEvents(parishId, 30),
    podeLancar ? listPriests(parishId) : Promise.resolve([]),
  ]);

  const encontros: Encontro[] = [
    ...celebrations.map((c) => ({
      id: `celebration-${c.id}`,
      startsAt: c.startsAt,
      label: c.title || CELEBRATION_TYPE_LABELS[c.type],
      location: c.location,
      description: null,
      imageUrl: null,
      semHora: c.semHora,
    })),
    ...events.map((e) => ({
      id: `event-${e.id}`,
      startsAt: e.startsAt,
      label: e.title,
      location: e.location,
      description: e.description,
      imageUrl: e.imageUrl,
      semHora: e.semHora,
    })),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Agenda"
        description="Os próximos encontros da sua comunidade."
      />

      {podeLancar && (
        <AcoesRapidas
          acoes={[
            {
              id: "celebracao",
              label: "Celebração avulsa",
              icone: <Church className="h-4 w-4" strokeWidth={1.5} aria-hidden />,
              conteudo: <CreateCelebrationForm priests={priests} />,
            },
            {
              id: "evento",
              label: "Evento",
              icone: <PartyPopper className="h-4 w-4" strokeWidth={1.5} aria-hidden />,
              conteudo: (
                <CreateEventForm
                  podeEnviarArquivo={isUploadConfigured()}
                  motivoIndisponivel={diagnosticoDoUpload()}
                />
              ),
            },
          ]}
        />
      )}

      <ProximosEncontros encontros={encontros} />

      <div className="rule-gold my-7" />
    </div>
  );
}
