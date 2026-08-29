import type { Metadata } from "next";
import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getOwnPriestProfile } from "@/server/modules/priests/service";
import { listAvailability } from "@/server/modules/availability/service";
import { deleteAvailabilityAction } from "@/server/actions/availability-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { WEEKDAY_LABELS, AVAILABILITY_TYPE_LABELS } from "@/lib/pastoral-care-labels";
import { CreateAvailabilityForm } from "./CreateAvailabilityForm";
import { CalendarDays } from "lucide-react";

export const metadata: Metadata = { title: "Minha disponibilidade" };

export default async function AvailabilityPage() {
  const session = await getSessionContext();

  if (!session?.membership || !session.permissions.includes(PERMISSIONS.AVAILABILITY_MANAGE)) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Esta área é para sacerdotes"
        description="Gerenciar horários de atendimento é reservado a quem tem um perfil de sacerdote na paróquia."
      />
    );
  }

  const priest = await getOwnPriestProfile(session.membership.parishId, session.userId);
  if (!priest) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Perfil de sacerdote não encontrado"
        description="Fale com a secretaria da sua paróquia."
      />
    );
  }

  const windows = await listAvailability(session.membership.parishId, priest.id);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Minha disponibilidade"
        description="Janelas em que a comunidade pode pedir atendimento com você. O app divide cada janela em horários."
      />

      <Card>
        <CreateAvailabilityForm />
      </Card>

      <section className="pt-7">
        <Eyebrow tone="accent" className="mb-3">
          Janelas cadastradas
        </Eyebrow>
        {windows.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum horário cadastrado"
            description="Adicione um horário acima para que os fiéis possam solicitar atendimento."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {windows.map((window) => (
              <div
                key={window.id}
                className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0"
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <CalendarDays className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground">
                    {WEEKDAY_LABELS[window.weekday]} · {window.startTime} às {window.endTime}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {AVAILABILITY_TYPE_LABELS[window.type]} · horários de {window.slotMinutes} min
                  </p>
                </div>
                <form action={deleteAvailabilityAction} className="shrink-0">
                  <input type="hidden" name="id" value={window.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Remover
                  </Button>
                </form>
              </div>
            ))}
          </Card>
        )}
      </section>

      <div className="rule-gold my-7" />
    </div>
  );
}
