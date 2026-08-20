import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getOwnPriestProfile } from "@/server/modules/priests/service";
import { listAvailability } from "@/server/modules/availability/service";
import { deleteAvailabilityAction } from "@/server/actions/availability-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { WEEKDAY_LABELS, AVAILABILITY_TYPE_LABELS } from "@/lib/pastoral-care-labels";
import { CreateAvailabilityForm } from "./CreateAvailabilityForm";
import { CalendarDays } from "lucide-react";

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
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-xl text-foreground">Minha disponibilidade</h1>

      <Card>
        <CreateAvailabilityForm />
      </Card>

      {windows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhum horário cadastrado"
          description="Adicione um horário acima para que os fiéis possam solicitar atendimento."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {windows.map((window) => (
            <Card key={window.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {WEEKDAY_LABELS[window.weekday]} · {window.startTime} às {window.endTime}
                </p>
                <p className="text-xs text-muted">
                  {AVAILABILITY_TYPE_LABELS[window.type]} · horários de {window.slotMinutes} min
                </p>
              </div>
              <form action={deleteAvailabilityAction}>
                <input type="hidden" name="id" value={window.id} />
                <Button type="submit" variant="ghost">
                  Remover
                </Button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
