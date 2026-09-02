import type { Metadata } from "next";
import { CalendarDays, UserRound } from "lucide-react";
import { getSessionContext } from "@/server/auth/session";
import { getOwnPriestProfile } from "@/server/modules/priests/service";
import { listMyAppointments, listReceivedAppointments } from "@/server/modules/appointments/service";
import {
  updateAppointmentStatusAction,
  cancelOwnAppointmentAction,
} from "@/server/actions/appointment-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, Eyebrow } from "@/components/ui/Typography";
import { Avatar } from "@/components/ui/Avatar";
import { formatDateTime } from "@/lib/date";
import { APPOINTMENT_CATEGORY_LABELS, APPOINTMENT_STATUS_LABELS } from "@/lib/pastoral-care-labels";
import { LidoAoAbrir } from "@/components/domain/LidoAoAbrir";
import { nomeDoSacerdote } from "@/lib/sacerdote";

/** Tom do badge por situação — cor reforça o texto, nunca o substitui. */
const STATUS_TONE: Record<string, "warning" | "success" | "muted" | "error"> = {
  solicitado: "warning",
  confirmado: "success",
  concluido: "muted",
  cancelado: "error",
};

export const metadata: Metadata = { title: "Meus atendimentos" };

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
    <div className="flex flex-col">
      <LidoAoAbrir caminho="/eu/atendimentos" />
      <PageHeader
        title="Atendimentos"
        description="Conversas e confissões que você pediu — e, se você é sacerdote, as que pediram a você."
      />

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Meus pedidos
        </Eyebrow>
        {myAppointments.length === 0 ? (
          <>
            <EmptyState
              icon={CalendarDays}
              title="Nenhum pedido ainda"
              description="Confissão, direção espiritual ou uma conversa — escolha com quem falar."
            />
            {/* Antes esta tela DESCREVIA o caminho ("a partir do perfil de
                um sacerdote, em Comunidade") em vez de levar até ele. */}
            <LinkButton href="/comunidade/sacerdotes" className="mt-3 w-full">
              <UserRound className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
              Falar com um sacerdote
            </LinkButton>
          </>
        ) : (
          <Card className="px-3.5 py-1.5">
            {myAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex flex-wrap items-center gap-3 border-b border-border py-3.5 last:border-b-0"
              >
                <Avatar name={nomeDoSacerdote(appointment.priestProfile)} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground">
                    {APPOINTMENT_CATEGORY_LABELS[appointment.category]}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {nomeDoSacerdote(appointment.priestProfile)} ·{" "}
                    {formatDateTime(appointment.scheduledAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={STATUS_TONE[appointment.status] ?? "muted"}>
                    {APPOINTMENT_STATUS_LABELS[appointment.status]}
                  </Badge>
                  {appointment.status === "solicitado" && (
                    <form action={cancelOwnAppointmentAction}>
                      <input type="hidden" name="id" value={appointment.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Cancelar
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      {priest && (
        <section className="pt-7">
          <Eyebrow tone="accent" className="mb-3">
            Pedidos recebidos
          </Eyebrow>
          {received.length === 0 ? (
            <EmptyState
              icon={UserRound}
              title="Nenhum pedido recebido"
              description="Quando alguém da comunidade pedir um atendimento com você, ele aparece aqui."
            />
          ) : (
            <Card className="px-3.5 py-1.5">
              {received.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border py-3.5 last:border-b-0"
                >
                  <Avatar name={appointment.fiel.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-medium text-foreground">
                      {appointment.fiel.fullName}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {APPOINTMENT_CATEGORY_LABELS[appointment.category]} ·{" "}
                      {formatDateTime(appointment.scheduledAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge tone={STATUS_TONE[appointment.status] ?? "muted"}>
                      {APPOINTMENT_STATUS_LABELS[appointment.status]}
                    </Badge>
                    {appointment.status === "solicitado" && (
                      <>
                        <form action={updateAppointmentStatusAction}>
                          <input type="hidden" name="id" value={appointment.id} />
                          <input type="hidden" name="status" value="confirmado" />
                          <Button type="submit" size="sm">
                            Confirmar
                          </Button>
                        </form>
                        <form action={updateAppointmentStatusAction}>
                          <input type="hidden" name="id" value={appointment.id} />
                          <input type="hidden" name="status" value="cancelado" />
                          <Button type="submit" variant="ghost" size="sm">
                            Recusar
                          </Button>
                        </form>
                      </>
                    )}
                    {appointment.status === "confirmado" && (
                      <form action={updateAppointmentStatusAction}>
                        <input type="hidden" name="id" value={appointment.id} />
                        <input type="hidden" name="status" value="concluido" />
                        <Button type="submit" variant="ghost" size="sm">
                          Concluir
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>
      )}

      <div className="rule-gold my-7" />
    </div>
  );
}
