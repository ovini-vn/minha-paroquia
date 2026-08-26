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

export default async function BookAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session?.membership) return null;

  const priest = await getPriestProfile(session.membership.parishId, id);
  if (!priest) notFound();

  const slots = await getAvailableSlots(session.membership.parishId, id);

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1">
        <Eyebrow tone="accent">Solicitar atendimento com</Eyebrow>
        <h1 className="mt-1 font-serif text-[29px] font-semibold leading-tight text-foreground">
          {priest.user.fullName}
        </h1>
      </div>

      {slots.length === 0 ? (
        <>
          <EmptyState
            icon={CalendarDays}
            title="Nenhum horário disponível no momento"
            description="Este sacerdote ainda não abriu horários por aqui, ou todos já foram reservados."
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
          <AppointmentBookingForm priestProfileId={id} slots={slots} />
        </Card>
      )}
    </div>
  );
}
