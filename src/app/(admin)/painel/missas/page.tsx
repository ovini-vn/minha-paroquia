import type { Metadata } from "next";
import type { CelebrationType } from "@prisma/client";
import { requirePermissionForPage } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/rbac";
import {
  listCelebrationSchedules,
  listCelebrationsForAdmin,
} from "@/server/modules/celebrations/service";
import { listPriests } from "@/server/modules/priests/service";
import { toggleCelebrationCanceledAction } from "@/server/actions/agenda-actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Typography";
import { formatDateTime, formatDateOnly } from "@/lib/date";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";
import { FiltroDeCelebracoes } from "./_components/FiltroDeCelebracoes";
import { describeRule } from "@/lib/recurrence";
import { CreateScheduleForm } from "./CreateScheduleForm";
import { DeactivateScheduleButton } from "./DeactivateScheduleButton";
import { Repeat, CalendarDays } from "lucide-react";

export const metadata: Metadata = { title: "Horários das missas" };

export default async function MissasAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const session = await requirePermissionForPage(PERMISSIONS.AGENDA_MANAGE);
  if (!session.membership) return null;

  const { tipo } = await searchParams;
  // Tipo desconhecido no endereço é ignorado, como nas outras telas: estes
  // endereços são guardados e compartilhados.
  const escolhido =
    tipo && tipo in CELEBRATION_TYPE_LABELS ? (tipo as CelebrationType) : null;

  const parishId = session.membership.parishId;
  const [schedules, celebrations, todasParaLegenda, priests] = await Promise.all([
    listCelebrationSchedules(parishId),
    listCelebrationsForAdmin(parishId, 30, escolhido),
    /*
     * Uma consulta só para saber QUAIS tipos a paróquia tem.
     *
     * Sem ela, os tipos oferecidos sairiam da lista já filtrada — e ao
     * filtrar por Adoração o filtro passaria a oferecer só Adoração, sem
     * caminho de volta para os outros.
     */
    listCelebrationsForAdmin(parishId, 300),
    listPriests(parishId),
  ]);

  const todasAsRepeticoes = schedules.filter((s) => s.active);
  const ativas = escolhido
    ? todasAsRepeticoes.filter((s) => s.type === escolhido)
    : todasAsRepeticoes;

  const presentes = [
    ...new Set([
      ...todasParaLegenda.map((c) => c.type),
      ...todasAsRepeticoes.map((s) => s.type),
    ]),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[29px] font-semibold leading-tight text-foreground">
          Horários das missas
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Cadastre uma vez o que se repete toda semana ou todo mês. As datas entram na agenda
          sozinhas, e ficam sempre uns meses à frente.
        </p>
      </div>

      <Card>
        <Eyebrow tone="accent" className="mb-3">
          Nova repetição
        </Eyebrow>
        <CreateScheduleForm priests={priests} />
      </Card>

      {/*
        O filtro fica ANTES das duas seções porque vale para as duas:
        procurar "Adoração" e ver a repetição dela sem as datas, ou o
        contrário, seria meia resposta.
      */}
      <FiltroDeCelebracoes atual={escolhido} presentes={presentes} />

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Repetições cadastradas
        </Eyebrow>
        {ativas.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Nenhuma repetição ainda"
            description="Cadastre acima os horários fixos — depois é só lançar as missas extras avulsas."
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {ativas.map((schedule) => (
              <div key={schedule.id} className="border-b border-border py-3.5 last:border-b-0">
                <div className="flex items-start gap-3">
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                  <Repeat className="h-[19px] w-[19px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground">
                    {schedule.title || CELEBRATION_TYPE_LABELS[schedule.type]}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted">{describeRule(schedule)}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {[
                      schedule.location,
                      schedule.priestProfile?.user.fullName,
                      schedule.endsOn ? `até ${formatDateTime(schedule.endsOn).slice(0, 10)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="shrink-0">
                  <DeactivateScheduleButton scheduleId={schedule.id} />
                </div>
                </div>

                {/* Corrigir sem encerrar: erro de digitação não deveria
                    custar apagar a repetição e recriá-la. */}
                <details className="border-b border-border pb-3.5 last:border-b-0">
                  <summary className="cursor-pointer py-1 text-[13px] text-primary">
                    Editar esta repetição
                  </summary>
                  <div className="pt-3">
                    <CreateScheduleForm priests={priests} schedule={schedule} />
                  </div>
                </details>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <Eyebrow tone="accent" className="mb-3">
          Próximas datas
        </Eyebrow>
        <p className="mb-3 text-[13px] leading-relaxed text-muted">
          Se numa data específica não houver missa, cancele só ela — a repetição continua valendo
          para as outras.
        </p>
        {celebrations.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={
              escolhido
                ? `Nenhuma data de ${CELEBRATION_TYPE_LABELS[escolhido]}`
                : "Nada na agenda"
            }
            description={
              escolhido
                ? "Há celebrações de outros tipos marcadas."
                : "Crie uma repetição acima, ou lance uma celebração avulsa pelo painel."
            }
          />
        ) : (
          <Card className="px-3.5 py-1.5">
            {celebrations.map((celebration) => {
              const cancelada = Boolean(celebration.canceledAt);
              return (
                <div
                  key={celebration.id}
                  className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
                >
                  <div className={`min-w-0 flex-1 ${cancelada ? "opacity-55" : ""}`}>
                    <p className="text-[14.5px] font-medium text-foreground">
                      {celebration.title || CELEBRATION_TYPE_LABELS[celebration.type]}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {celebration.semHora
                        ? formatDateOnly(celebration.startsAt)
                        : formatDateTime(celebration.startsAt)}
                      {celebration.location ? ` · ${celebration.location}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {cancelada && <Badge tone="error">Cancelada</Badge>}
                    {/* Aviso discreto: cancelar aqui deixa gente escalada sem
                        celebração. Quem decide precisa saber disso. */}
                    {!cancelada && celebration._count.liturgicalSchedules > 0 && (
                      <Badge tone="warning">
                        {celebration._count.liturgicalSchedules} escalado
                        {celebration._count.liturgicalSchedules === 1 ? "" : "s"}
                      </Badge>
                    )}
                    {!celebration.scheduleId && <Badge tone="muted">Avulsa</Badge>}
                    <form action={toggleCelebrationCanceledAction}>
                      <input type="hidden" name="celebrationId" value={celebration.id} />
                      <input type="hidden" name="canceled" value={cancelada ? "false" : "true"} />
                      <Button type="submit" variant="ghost" size="sm">
                        {cancelada ? "Reabrir" : "Cancelar"}
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
