import { withTenantContext } from "@/server/db/tenant-context";
import type { CreateAvailabilityInput } from "./schema";

export function createAvailability(
  input: CreateAvailabilityInput & { parishId: string; priestProfileId: string },
) {
  return withTenantContext(input.parishId, (tx) =>
    tx.priestAvailability.create({
      data: {
        parishId: input.parishId,
        priestProfileId: input.priestProfileId,
        weekday: input.weekday,
        startTime: input.startTime,
        endTime: input.endTime,
        type: input.type,
        slotMinutes: input.slotMinutes,
      },
    }),
  );
}

export function listAvailability(parishId: string, priestProfileId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.priestAvailability.findMany({
      where: { parishId, priestProfileId },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    }),
  );
}

/** Escopado ao próprio priestProfileId — um sacerdote não apaga a agenda de outro. */
export function deleteAvailability(parishId: string, id: string, priestProfileId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.priestAvailability.deleteMany({ where: { id, priestProfileId } }),
  );
}
