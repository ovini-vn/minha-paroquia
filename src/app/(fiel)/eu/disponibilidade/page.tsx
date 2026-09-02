import type { Metadata } from "next";
import { getSessionContext } from "@/server/auth/session";
import { PERMISSIONS } from "@/server/auth/rbac";
import { getOwnPriestProfile } from "@/server/modules/priests/service";
import { listAvailability } from "@/server/modules/availability/service";
import {
  definirOQueAtendeAction,
  deleteAvailabilityAction,
} from "@/server/actions/availability-actions";
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

      {/*
        O QUE vem antes do QUANDO, e é de propósito.
        
        Um padre que só confessa precisa dizer isso primeiro; se ele
        cadastrar janelas antes, a comunidade passa a poder pedir conversa
        com ele no intervalo entre uma coisa e outra. E quem desmarca as
        duas some da agenda sem precisar apagar janela nenhuma.
      */}
      <Card>
        <Eyebrow className="mb-2">O que eu atendo</Eyebrow>
        <p className="mb-3 text-[13px] leading-relaxed text-muted">
          Nem todo sacerdote atende o público em geral pelo aplicativo. O que estiver desmarcado
          não aparece como motivo para o fiel escolher, e a paróquia continua marcando pelo
          telefone.
        </p>
        <form action={definirOQueAtendeAction} className="flex flex-col gap-2.5">
          <label className="flex items-center gap-2.5 text-[14px] text-foreground">
            <input
              type="checkbox"
              name="ofereceAtendimento"
              value="sim"
              defaultChecked={priest.ofereceAtendimento}
              className="h-4 w-4 accent-[rgb(var(--color-primary))]"
            />
            Conversa, direção espiritual e questões de família
          </label>
          <label className="flex items-center gap-2.5 text-[14px] text-foreground">
            <input
              type="checkbox"
              name="ofereceConfissao"
              value="sim"
              defaultChecked={priest.ofereceConfissao}
              className="h-4 w-4 accent-[rgb(var(--color-primary))]"
            />
            Confissão
          </label>
          <Button type="submit" size="sm" className="mt-1 self-start">
            Salvar
          </Button>
        </form>
      </Card>

      <Card className="mt-4">
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
