import { notFound } from "next/navigation";
import { getSessionContext } from "@/server/auth/session";
import { getPriestProfile } from "@/server/modules/priests/service";
import { getAvailableSlots } from "@/server/modules/appointments/service";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Typography";
import { AppointmentBookingForm } from "./AppointmentBookingForm";
import { CalendarDays, Phone } from "lucide-react";
import { nomeDoSacerdote } from "@/lib/sacerdote";

export default async function BookAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session?.membership) return null;

  const priest = await getPriestProfile(session.membership.parishId, id);
  if (!priest) notFound();

  const slots = await getAvailableSlots(session.membership.parishId, id);
  const naoAtendePeloApp = !priest.ofereceAtendimento && !priest.ofereceConfissao;

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1">
        <Eyebrow tone="accent">Solicitar atendimento com</Eyebrow>
        <h1 className="mt-1 font-serif text-[29px] font-semibold leading-tight text-foreground">
          {nomeDoSacerdote(priest)}
        </h1>
      </div>

      {slots.length === 0 ? (
        <>
          {/* Quem não atende pelo app não "está sem horário": ele não marca
              por aqui, e dizer a mesma frase nos dois casos faz a pessoa
              voltar amanhã para conferir uma agenda que nunca vai encher. */}
          <EmptyState
            icon={CalendarDays}
            title={
              naoAtendePeloApp
                ? "Este sacerdote não marca pelo aplicativo"
                : "Nenhum horário disponível no momento"
            }
            description={
              naoAtendePeloApp
                ? "O atendimento dele é combinado pela secretaria da paróquia."
                : "Este sacerdote ainda não abriu horários por aqui, ou todos já foram reservados."
            }
          />
          {/* "Tente novamente em breve" era tudo o que esta tela dizia — um
              beco. Não ter horário publicado no app não significa que não
              haja atendimento: a secretaria marca por telefone e sabe das
              confissões antes das missas. */}
          <Card className="border-gold/45 bg-gold/[0.07]">
            <p className="text-[13px] leading-relaxed text-muted">
              Ainda dá para falar com a paróquia: a secretaria marca atendimento por telefone e
              sabe os horários de confissão antes das missas.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <LinkButton href="/contato" variant="gold" size="sm">
                <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Falar com a paróquia
              </LinkButton>
              <LinkButton href="/comunidade/sacerdotes" variant="ghost" size="sm">
                Ver outros sacerdotes
              </LinkButton>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <AppointmentBookingForm
            priestProfileId={id}
            slots={slots}
            ofereceAtendimento={priest.ofereceAtendimento}
            ofereceConfissao={priest.ofereceConfissao}
          />
        </Card>
      )}
    </div>
  );
}
