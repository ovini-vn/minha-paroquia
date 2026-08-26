import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import { notifyUser } from "@/server/modules/notifications/service";
import { LITURGICAL_ROLE_LABELS } from "@/lib/liturgia-labels";
import { formatDateTime } from "@/lib/date";
import type { CreateAvailabilityInput, CreateScheduleInput } from "./schema";

// ---- Disponibilidade ------------------------------------------------------

export function upsertAvailability(input: CreateAvailabilityInput & { parishId: string; userId: string }) {
  const data = {
    weekdayPref: input.weekdayPref ?? null,
    notes: input.notes || null,
  };

  return withTenantContext(input.parishId, (tx) =>
    tx.liturgicalAvailability.upsert({
      where: { userId_roleType: { userId: input.userId, roleType: input.roleType } },
      update: data,
      create: { parishId: input.parishId, userId: input.userId, roleType: input.roleType, ...data },
    }),
  );
}

export function listMyAvailability(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.liturgicalAvailability.findMany({ where: { parishId, userId }, orderBy: { roleType: "asc" } }),
  );
}

/** Escopado ao próprio usuário — evita apagar disponibilidade de outra pessoa por id adivinhado. */
export function deleteAvailability(parishId: string, id: string, userId: string) {
  return withTenantContext(parishId, (tx) => tx.liturgicalAvailability.deleteMany({ where: { id, parishId, userId } }));
}

/** Todas as disponibilidades da paróquia, para montar o formulário de escala agrupado por papel. */
export function listAllAvailability(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.liturgicalAvailability.findMany({
      where: { parishId },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { roleType: "asc" },
    }),
  );
}

// ---- Escala -----------------------------------------------------------------

export async function createSchedule(
  parishId: string,
  celebrationId: string,
  input: CreateScheduleInput,
) {
  return withTenantContext(parishId, async (tx) => {
    const celebration = await tx.celebration.findFirst({ where: { id: celebrationId, parishId } });
    if (!celebration) throw new ValidationError("Celebração não encontrada.");

    const existing = await tx.liturgicalSchedule.findUnique({
      where: {
        celebrationId_roleType_userId: { celebrationId, roleType: input.roleType, userId: input.userId },
      },
    });
    if (existing) throw new ValidationError("Esta pessoa já está escalada para essa função nesta celebração.");

    const schedule = await tx.liturgicalSchedule.create({
      data: { parishId, celebrationId, roleType: input.roleType, userId: input.userId },
    });

    await notifyUser(tx, {
      parishId,
      userId: input.userId,
      category: "pastoral",
        linkPath: "/servir/liturgia",
      title: "Você foi escalado na liturgia",
      body: `Você foi escalado como ${LITURGICAL_ROLE_LABELS[input.roleType]} para ${formatDateTime(celebration.startsAt)}.`,
    });

    return schedule;
  });
}

export function removeSchedule(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) => tx.liturgicalSchedule.deleteMany({ where: { id, parishId } }));
}

export function listScheduleForCelebration(parishId: string, celebrationId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.liturgicalSchedule.findMany({
      where: { parishId, celebrationId },
      include: { user: { select: { fullName: true } } },
      orderBy: { roleType: "asc" },
    }),
  );
}

/** Escalas futuras do próprio fiel — "Fiel recebe sua escala" (PRD seção 22). */
export function listMySchedule(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.liturgicalSchedule.findMany({
      where: { parishId, userId, celebration: { startsAt: { gte: new Date() } } },
      include: { celebration: true },
      orderBy: { celebration: { startsAt: "asc" } },
    }),
  );
}

/** O próprio fiel confirmando presença — ação humana explícita, nunca automática. */
export function confirmMySchedule(parishId: string, id: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.liturgicalSchedule.updateMany({ where: { id, parishId, userId }, data: { confirmed: true } }),
  );
}
