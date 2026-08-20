import { getSessionContext } from "@/server/auth/session";
import { getOwnPriestProfile } from "@/server/modules/priests/service";
import { listMyAppointments, listReceivedAppointments } from "@/server/modules/appointments/service";
import { updateAppointmentStatusAction, cancelOwnAppointmentAction } from "@/server/actions/appointment-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/date";
import { APPOINTMENT_CATEGORY_LABELS, APPOINTMENT_STATUS_LABELS } from "@/lib/pastoral-care-labels";
import { CalendarDays } from "lucide-react";

export default async function AppointmentsPage() {
  const session = await getSessionContext();
  if (!session?.membership) return null;

  const parishId = session.membership.parishId;
  const [myAppointments, priest] = await Promise.all([
    listMyAppointments(parishId, session.userId),
    getOwnPriestProfile(parishId, session.userId),
  ]);
  const received = priest ? await listReceivedAppointments(parishId, priest.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-xl text-foreground">Meus atendimentos</h1>

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-primary">Meus pedidos</p>
        {myAppointments.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum pedido ainda"
            description="Peça um atendimento a partir do perfil de um sacerdote em Comunidade."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {myAppointments.map((appointment) => (
              <Card key={appointment.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {APPOINTMENT_CATEGORY_LABELS[appointment.category]} com {appointment.priestProfile.user.fullName}
                  </p>
                  <p className="text-xs text-muted">{formatDateTime(appointment.scheduledAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{APPOINTMENT_STATUS_LABELS[appointment.status]}</Badge>
                  {appointment.status === "solicitado" && (
                    <form action={cancelOwnAppointmentAction}>
                      <input type="hidden" name="id" value={appointment.id} />
                      <Button type="submit" variant="ghost">
                        Cancelar
                      </Button>
                    </form>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {priest && (
        <section>
          <p className="mb-2 text-xs uppercase tracking-wide text-primary">Pedidos recebidos</p>
          {received.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">Nenhum pedido recebido ainda.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {received.map((appointment) => (
                <Card key={appointment.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {APPOINTMENT_CATEGORY_LABELS[appointment.category]} com {appointment.fiel.fullName}
                    </p>
                    <p className="text-xs text-muted">{formatDateTime(appointment.scheduledAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{APPOINTMENT_STATUS_LABELS[appointment.status]}</Badge>
                    {appointment.status === "solicitado" && (
                      <>
                        <form action={updateAppointmentStatusAction}>
                          <input type="hidden" name="id" value={appointment.id} />
                          <input type="hidden" name="status" value="confirmado" />
                          <Button type="submit" variant="secondary">
                            Confirmar
                          </Button>
                        </form>
                        <form action={updateAppointmentStatusAction}>
                          <input type="hidden" name="id" value={appointment.id} />
                          <input type="hidden" name="status" value="cancelado" />
                          <Button type="submit" variant="ghost">
                            Recusar
                          </Button>
                        </form>
                      </>
                    )}
                    {appointment.status === "confirmado" && (
                      <form action={updateAppointmentStatusAction}>
                        <input type="hidden" name="id" value={appointment.id} />
                        <input type="hidden" name="status" value="concluido" />
                        <Button type="submit" variant="secondary">
                          Concluir
                        </Button>
                      </form>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
