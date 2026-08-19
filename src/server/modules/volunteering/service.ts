import { withTenantContext } from "@/server/db/tenant-context";
import type { UpsertVolunteerProfileInput } from "./schema";

export function upsertVolunteerProfile(
  input: UpsertVolunteerProfileInput & { parishId: string; userId: string },
) {
  const data = {
    hasTime: input.hasTime,
    timeAreas: input.timeAreas,
    hasTalent: input.hasTalent,
    talents: input.talents,
    wantsToServe: input.wantsToServe,
    serviceAreas: input.serviceAreas,
    availabilityNote: input.availabilityNote || null,
    freeText: input.freeText || null,
  };

  return withTenantContext(input.parishId, (tx) =>
    tx.volunteerProfile.upsert({
      where: { userId_parishId: { userId: input.userId, parishId: input.parishId } },
      update: data,
      create: { userId: input.userId, parishId: input.parishId, ...data },
    }),
  );
}

export function getOwnVolunteerProfile(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.volunteerProfile.findUnique({ where: { userId_parishId: { userId, parishId } } }),
  );
}

export function countVolunteerProfiles(parishId: string) {
  return withTenantContext(parishId, (tx) => tx.volunteerProfile.count({ where: { parishId } }));
}
