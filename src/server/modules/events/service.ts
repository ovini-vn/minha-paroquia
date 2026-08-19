import { withTenantContext } from "@/server/db/tenant-context";
import type { CreateEventInput } from "./schema";

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
      where: { parishId, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: limit,
    }),
  );
}
