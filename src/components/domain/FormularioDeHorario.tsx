"use client";

import { useActionState } from "react";
import { createAvailabilityAction, type ActionState } from "@/server/actions/availability-actions";
import { Button } from "@/components/ui/Button";
import { WEEKDAY_LABELS } from "@/lib/pastoral-care-labels";

const initialState: ActionState = {};

/**
 * Uma janela semanal de atendimento — usado por DUAS mãos.
 *
 * O sacerdote que usa o app cadastra a própria em "Minha disponibilidade";
 * a secretaria cadastra a de quem NÃO usa, pelo painel. É o mesmo
 * formulário porque é a mesma coisa sendo dita, e duas cópias é como os
 * dois lados começam a aceitar valores diferentes.
 *
 * O que muda é a AÇÃO e o dono: quando `priestProfileId` vem preenchido,
 * ele viaja num campo escondido e o servidor confere se aquele sacerdote
 * realmente não tem conta antes de gravar.
 */
export function FormularioDeHorario({
  acao = createAvailabilityAction,
  priestProfileId,
  rotulo = "Adicionar horário",
}: {
  acao?: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  priestProfileId?: string;
  rotulo?: string;
}) {
  const [state, formAction, pending] = useActionState(acao, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      {priestProfileId && (
        <input type="hidden" name="priestProfileId" value={priestProfileId} />
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="weekday" className="text-sm font-medium text-muted">
          Dia da semana
        </label>
        <select
          id="weekday"
          name="weekday"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        >
          {WEEKDAY_LABELS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="startTime" className="text-sm font-medium text-muted">
          Início
        </label>
        <input
          id="startTime"
          name="startTime"
          type="time"
          required
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="endTime" className="text-sm font-medium text-muted">
          Fim
        </label>
        <input
          id="endTime"
          name="endTime"
          type="time"
          required
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="type" className="text-sm font-medium text-muted">
          Tipo
        </label>
        <select
          id="type"
          name="type"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        >
          <option value="atendimento">Atendimento</option>
          <option value="confissao">Confissão</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="slotMinutes" className="text-sm font-medium text-muted">
          Duração
        </label>
        <select
          id="slotMinutes"
          name="slotMinutes"
          defaultValue={30}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
        >
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
          <option value={60}>1 hora</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adicionando..." : rotulo}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
