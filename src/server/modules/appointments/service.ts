import { withTenantContext } from "@/server/db/tenant-context";
import { NotFoundError, ValidationError } from "@/server/shared/errors";
import type { CreateAppointmentInput } from "./schema";

const ACTIVE_STATUSES = ["solicitado", "confirmado"] as const;
const DEFAULT_DAYS_AHEAD = 14;
const MAX_SLOTS = 30;

export type AvailableSlot = { startsAt: Date; type: string };

function parseTime(hhmm: string): { hours: number; minutes: number } {
  const [h, m] = hhmm.split(":");
  return { hours: Number(h ?? 0), minutes: Number(m ?? 0) };
}

/**
 * Concretiza as janelas semanais recorrentes (PriestAvailability) em
 * horários reais dos próximos `daysAhead` dias, removendo os que já
 * passaram e os que já têm agendamento ativo. Não persiste nada — é
 * calculado a cada leitura.
 */
export async function getAvailableSlots(
  parishId: string,
  priestProfileId: string,
  daysAhead = DEFAULT_DAYS_AHEAD,
): Promise<AvailableSlot[]> {
  return withTenantContext(parishId, async (tx) => {
    const windows = await tx.priestAvailability.findMany({ where: { parishId, priestProfileId } });
    if (windows.length === 0) return [];

    const now = new Date();
    const rangeEnd = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const existing = await tx.appointment.findMany({
      where: {
        priestProfileId,
        status: { in: [...ACTIVE_STATUSES] },
        scheduledAt: { gte: now, lte: rangeEnd },
      },
      select: { scheduledAt: true },
    });
    const taken = new Set(existing.map((e) => e.scheduledAt.getTime()));

    const slots: AvailableSlot[] = [];
    for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
      const day = new Date(now);
      day.setDate(day.getDate() + dayOffset);
      const weekday = day.getDay();

      for (const window of windows.filter((w) => w.weekday === weekday)) {
        const start = parseTime(window.startTime);
        const end = parseTime(window.endTime);
        const windowStart = new Date(day);
        windowStart.setHours(start.hours, start.minutes, 0, 0);
        const windowEnd = new Date(day);
        windowEnd.setHours(end.hours, end.minutes, 0, 0);

        for (
          let slot = windowStart;
          slot < windowEnd;
          slot = new Date(slot.getTime() + window.slotMinutes * 60 * 1000)
        ) {
          if (slot <= now || taken.has(slot.getTime())) continue;
          slots.push({ startsAt: slot, type: window.type });
        }
      }
    }

    return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).slice(0, MAX_SLOTS);
  });
}

export async function createAppointment(
  input: CreateAppointmentInput & { parishId: string; priestProfileId: string; fielUserId: string },
) {
  return withTenantContext(input.parishId, async (tx) => {
    const priest = await tx.priestProfile.findFirst({
      where: { id: input.priestProfileId, parishId: input.parishId },
    });
    if (!priest) throw new NotFoundError("Sacerdote");

    const conflict = await tx.appointment.findFirst({
      where: {
        priestProfileId: input.priestProfileId,
        scheduledAt: input.scheduledAt,
        status: { in: [...ACTIVE_STATUSES] },
      },
    });
    if (conflict) {
      throw new ValidationError("Este horário acabou de ser reservado por outra pessoa. Escolha outro.");
    }

    return tx.appointment.create({
      data: {
        parishId: input.parishId,
        priestProfileId: input.priestProfileId,
        fielUserId: input.fielUserId,
        category: input.category,
        scheduledAt: input.scheduledAt,
      },
    });
  });
}

export function listMyAppointments(parishId: string, fielUserId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.appointment.findMany({
      where: { parishId, fielUserId },
      orderBy: { scheduledAt: "desc" },
      include: { priestProfile: { include: { user: { select: { fullName: true } } } } },
    }),
  );
}

export function listReceivedAppointments(parishId: string, priestProfileId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.appointment.findMany({
      where: { parishId, priestProfileId },
      orderBy: { scheduledAt: "asc" },
      include: { fiel: { select: { fullName: true } } },
    }),
  );
}

/** Escopado ao próprio priestProfileId — um sacerdote só altera os próprios atendimentos. */
export function updateAppointmentStatus(
  parishId: string,
  id: string,
  priestProfileId: string,
  status: "confirmado" | "cancelado" | "concluido",
) {
  return withTenantContext(parishId, (tx) =>
    tx.appointment.updateMany({ where: { id, priestProfileId }, data: { status } }),
  );
}

/** O fiel só cancela o próprio pedido, e só enquanto ainda está "solicitado". */
export function cancelOwnAppointment(parishId: string, id: string, fielUserId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.appointment.updateMany({
      where: { id, fielUserId, status: "solicitado" },
      data: { status: "cancelado" },
    }),
  );
}
