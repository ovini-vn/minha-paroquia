"use client";

import { useActionState } from "react";
import { createAvailabilityAction, type ActionState } from "@/server/actions/availability-actions";
import { Button } from "@/components/ui/Button";
import { WEEKDAY_LABELS } from "@/lib/pastoral-care-labels";

const initialState: ActionState = {};

export function CreateAvailabilityForm() {
  const [state, formAction, pending] = useActionState(createAvailabilityAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="weekday" className="text-sm font-medium text-ink-700">
          Dia da semana
        </label>
        <select
          id="weekday"
          name="weekday"
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          {WEEKDAY_LABELS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="startTime" className="text-sm font-medium text-ink-700">
          Início
        </label>
        <input
          id="startTime"
          name="startTime"
          type="time"
          required
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="endTime" className="text-sm font-medium text-ink-700">
          Fim
        </label>
        <input
          id="endTime"
          name="endTime"
          type="time"
          required
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="type" className="text-sm font-medium text-ink-700">
          Tipo
        </label>
        <select
          id="type"
          name="type"
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          <option value="atendimento">Atendimento</option>
          <option value="confissao">Confissão</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="slotMinutes" className="text-sm font-medium text-ink-700">
          Duração
        </label>
        <select
          id="slotMinutes"
          name="slotMinutes"
          defaultValue={30}
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
          <option value={60}>1 hora</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adicionando..." : "Adicionar horário"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
