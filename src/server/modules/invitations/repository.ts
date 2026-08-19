import { withInvitationCodeLookup, withTenantContext } from "@/server/db/tenant-context";

export function findInvitationByCode(code: string) {
  return withInvitationCodeLookup(code, (tx) =>
    tx.invitation.findUnique({ where: { code }, include: { parish: true } }),
  );
}

export function listInvitationsByParish(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.invitation.findMany({
      where: { parishId },
      orderBy: { createdAt: "desc" },
      include: { usedByUser: { select: { fullName: true } } },
    }),
  );
}
