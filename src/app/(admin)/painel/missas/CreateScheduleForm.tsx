"use client";

import { useActionState, useState } from "react";
import { Repeat } from "lucide-react";
import {
  createCelebrationScheduleAction,
  type ScheduleActionState,
} from "@/server/actions/agenda-actions";
import { Button } from "@/components/ui/Button";
import { CELEBRATION_TYPE_LABELS } from "@/lib/celebration-labels";
import { WEEKDAY_LABELS, WEEK_OF_MONTH_LABELS } from "@/lib/recurrence";
import { parseMinutes } from "@/lib/brasilia";

const initialState: ScheduleActionState = {};

type Priest = { id: string; user: { fullName: string } };

const campo =
  "rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground";

export function CreateScheduleForm({ priests }: { priests: Priest[] }) {
  const [state, formAction, pending] = useActionState(createCelebrationScheduleAction, initialState);
  const [frequency, setFrequency] = useState<"semanal" | "mensal">("semanal");

  return (
    <form
      action={(formData) => {
        // O <input type="time"> devolve "19:30"; o servidor guarda minutos
        // desde a meia-noite. Converter aqui evita mandar formato de tela
        // para dentro do domínio.
        const hora = String(formData.get("hora") ?? "");
        formData.set("timeMinutes", String(parseMinutes(hora) ?? 0));
        formData.delete("hora");
        return formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="s-frequency" className="text-sm font-medium text-muted">
            Repete
          </label>
          <select
            id="s-frequency"
            name="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as "semanal" | "mensal")}
            className={campo}
          >
            <option value="semanal">Toda semana</option>
            <option value="mensal">Uma vez por mês</option>
          </select>
        </div>

        {frequency === "mensal" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="s-weekOfMonth" className="text-sm font-medium text-muted">
              Qual semana
            </label>
            <select id="s-weekOfMonth" name="weekOfMonth" className={campo} defaultValue="1">
              {Object.entries(WEEK_OF_MONTH_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="s-weekday" className="text-sm font-medium text-muted">
            Dia da semana
          </label>
          <select id="s-weekday" name="weekday" className={campo} defaultValue="0">
            {WEEKDAY_LABELS.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="s-hora" className="text-sm font-medium text-muted">
            Horário
          </label>
          <input id="s-hora" name="hora" type="time" required defaultValue="19:00" className={campo} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="s-type" className="text-sm font-medium text-muted">
            Tipo
          </label>
          <select id="s-type" name="type" className={campo}>
            {Object.entries(CELEBRATION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="s-title" className="text-sm font-medium text-muted">
            Título (opcional)
          </label>
          <input id="s-title" name="title" placeholder="Ex.: Missa dominical" className={campo} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="s-location" className="text-sm font-medium text-muted">
            Local (opcional)
          </label>
          <input id="s-location" name="location" placeholder="Igreja Matriz" className={campo} />
        </div>

        {priests.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="s-priest" className="text-sm font-medium text-muted">
              Celebrante (opcional)
            </label>
            <select id="s-priest" name="priestProfileId" className={campo}>
              <option value="">—</option>
              {priests.map((priest) => (
                <option key={priest.id} value={priest.id}>
                  {priest.user.fullName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="s-startsOn" className="text-sm font-medium text-muted">
            A partir de
          </label>
          <input
            id="s-startsOn"
            name="startsOn"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={campo}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="s-endsOn" className="text-sm font-medium text-muted">
            Até (opcional)
          </label>
          <input id="s-endsOn" name="endsOn" type="date" className={campo} />
        </div>
        <Button type="submit" disabled={pending}>
          <Repeat className="h-[17px] w-[17px]" strokeWidth={1.5} aria-hidden />
          {pending ? "Criando…" : "Criar repetição"}
        </Button>
      </div>

      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.ok && <p className="text-sm text-success">{state.ok}</p>}
    </form>
  );
}
