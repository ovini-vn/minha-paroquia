import { withTenantContext } from "@/server/db/tenant-context";

export { ensurePriestProfile, isPriestRole } from "./ensure-priest-profile";

export function listPriests(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.priestProfile.findMany({
      where: { parishId },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      include: { user: { select: { fullName: true, photoUrl: true } } },
    }),
  );
}

export function getPriestProfile(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) =>
    tx.priestProfile.findFirst({
      where: { id, parishId },
      include: { user: { select: { fullName: true, photoUrl: true } } },
    }),
  );
}

/** Usado para saber "sou eu mesmo um sacerdote nesta paróquia" (ex.: publicar Palavra do Padre). */
export function getOwnPriestProfile(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.priestProfile.findUnique({ where: { userId_parishId: { userId, parishId } } }),
  );
}
