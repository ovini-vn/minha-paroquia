"use client";

import { useActionState, useState } from "react";
import { createAppointmentAction, type ActionState } from "@/server/actions/appointment-actions";
import { Button } from "@/components/ui/Button";
import { formatDateLabel, formatTimeLabel } from "@/lib/date";
import { APPOINTMENT_CATEGORY_LABELS, AVAILABILITY_TYPE_LABELS } from "@/lib/pastoral-care-labels";
import { cn } from "@/lib/cn";

const initialState: ActionState = {};

type Slot = { startsAt: Date; type: string };

function groupByDay(slots: Slot[]): Map<string, Slot[]> {
  const groups = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = slot.startsAt.toDateString();
    const group = groups.get(key);
    if (group) group.push(slot);
    else groups.set(key, [slot]);
  }
  return groups;
}

export function AppointmentBookingForm({ priestProfileId, slots }: { priestProfileId: string; slots: Slot[] }) {
  const [state, formAction, pending] = useActionState(createAppointmentAction, initialState);
  const [selected, setSelected] = useState<Slot | null>(null);

  const groups = groupByDay(slots);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="priestProfileId" value={priestProfileId} />
      <input type="hidden" name="scheduledAt" value={selected ? selected.startsAt.toISOString() : ""} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-medium text-ink-700">
          Motivo
        </label>
        <select
          id="category"
          name="category"
          required
          className="rounded-xl border border-terracotta-100 bg-cream-50 px-4 py-3 text-sm text-ink-900"
        >
          {Object.entries(APPOINTMENT_CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-4">
        {Array.from(groups.entries()).map(([dayKey, daySlots]) => (
          <div key={dayKey}>
            <p className="mb-2 text-sm font-medium text-ink-900">{formatDateLabel(new Date(dayKey))}</p>
            <div className="flex flex-wrap gap-2">
              {daySlots.map((slot) => {
                const isSelected = selected?.startsAt.getTime() === slot.startsAt.getTime();
                return (
                  <button
                    key={slot.startsAt.toISOString()}
                    type="button"
                    onClick={() => setSelected(slot)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm transition-colors",
                      isSelected
                        ? "border-terracotta-600 bg-terracotta-600 text-cream-50"
                        : "border-terracotta-100 bg-cream-50 text-ink-900 hover:bg-terracotta-50",
                    )}
                  >
                    {formatTimeLabel(slot.startsAt)}
                    {slot.type === "confissao" && ` · ${AVAILABILITY_TYPE_LABELS.confissao}`}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending || !selected}>
        {pending ? "Solicitando..." : "Solicitar atendimento"}
      </Button>
    </form>
  );
}
