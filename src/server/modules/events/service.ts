import { withTenantContext } from "@/server/db/tenant-context";
import type { CreateEventInput, UpdateEventInput } from "./schema";

export function createEvent(input: CreateEventInput & { parishId: string; createdBy: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.event.create({
      data: {
        parishId: input.parishId,
        title: input.title,
        description: input.description || null,
        startsAt: input.startsAt,
        location: input.location || null,
        createdBy: input.createdBy,
      },
    }),
  );
}

export function listUpcomingEvents(parishId: string, limit = 10) {
  return withTenantContext(parishId, (tx) =>
    tx.event.findMany({
      where: { parishId, startsAt: { gte: new Date() }, status: "published" },
      orderBy: { startsAt: "asc" },
      take: limit,
    }),
  );
}

/** Inclui arquivados — tela de gestão do painel, não a agenda pública. */
export function listAllEvents(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.event.findMany({ where: { parishId }, orderBy: { startsAt: "desc" } }),
  );
}

export function getEvent(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) => tx.event.findFirst({ where: { id, parishId } }));
}

export function updateEvent(parishId: string, id: string, input: UpdateEventInput) {
  return withTenantContext(parishId, (tx) =>
    tx.event.updateMany({
      where: { id, parishId },
      data: {
        title: input.title,
        description: input.description || null,
        startsAt: input.startsAt,
        location: input.location || null,
      },
    }),
  );
}

export function setEventStatus(parishId: string, id: string, status: "published" | "archived") {
  return withTenantContext(parishId, (tx) => tx.event.updateMany({ where: { id, parishId }, data: { status } }));
}
