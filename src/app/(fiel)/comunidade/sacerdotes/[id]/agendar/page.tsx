import { notFound } from "next/navigation";
import { getSessionContext } from "@/server/auth/session";
import { getPriestProfile } from "@/server/modules/priests/service";
import { getAvailableSlots } from "@/server/modules/appointments/service";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppointmentBookingForm } from "./AppointmentBookingForm";

export default async function BookAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session?.membership) return null;

  const priest = await getPriestProfile(session.membership.parishId, id);
  if (!priest) notFound();

  const slots = await getAvailableSlots(session.membership.parishId, id);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-terracotta-600">Solicitar atendimento com</p>
        <h1 className="font-serif text-xl text-ink-900">{priest.user.fullName}</h1>
      </div>

      {slots.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="Nenhum horário disponível no momento"
          description="Este sacerdote ainda não abriu horários de atendimento, ou todos já foram reservados. Tente novamente em breve."
        />
      ) : (
        <Card>
          <AppointmentBookingForm priestProfileId={id} slots={slots} />
        </Card>
      )}
    </div>
  );
}
