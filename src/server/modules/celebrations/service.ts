import { withTenantContext } from "@/server/db/tenant-context";
import type { CreateCelebrationInput } from "./schema";

export function createCelebration(input: CreateCelebrationInput & { parishId: string; createdBy: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.celebration.create({
      data: {
        parishId: input.parishId,
        type: input.type,
        title: input.title || null,
        startsAt: input.startsAt,
        location: input.location || null,
        priestProfileId: input.priestProfileId || null,
        createdBy: input.createdBy,
      },
    }),
  );
}

export function listUpcomingCelebrations(parishId: string, limit = 10) {
  return withTenantContext(parishId, (tx) =>
    tx.celebration.findMany({
      where: { parishId, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: limit,
      include: { priestProfile: { include: { user: { select: { fullName: true } } } } },
    }),
  );
}

export async function getNextCelebration(parishId: string) {
  const [next] = await listUpcomingCelebrations(parishId, 1);
  return next ?? null;
}
