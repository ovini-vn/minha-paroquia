import { withTenantContext } from "@/server/db/tenant-context";
import type { CreatePrayerRequestInput } from "./schema";

export type PrayerRequestListItem = {
  id: string;
  contentText: string;
  createdAt: Date;
  requesterName: string | null;
};

function toListItem(row: {
  id: string;
  contentText: string;
  createdAt: Date;
  isAnonymous: boolean;
  requester: { fullName: string };
}): PrayerRequestListItem {
  return {
    id: row.id,
    contentText: row.contentText,
    createdAt: row.createdAt,
    // Anonimato vale para TODO mundo, inclusive o pároco — o nome de quem
    // pediu nunca aparece na tela quando isAnonymous, mesmo que o
    // requesterUserId continue gravado (moderação futura).
    requesterName: row.isAnonymous ? null : row.requester.fullName,
  };
}

export function createPrayerRequest(input: CreatePrayerRequestInput & { parishId: string; userId: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.prayerRequest.create({
      data: {
        parishId: input.parishId,
        requesterUserId: input.userId,
        contentText: input.contentText,
        visibility: input.visibility,
        isAnonymous: input.isAnonymous,
      },
    }),
  );
}

/** O próprio fiel vê tudo que pediu, sem esconder o próprio nome de si mesmo. */
export function listMyPrayerRequests(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.prayerRequest.findMany({
      where: { parishId, requesterUserId: userId },
      orderBy: { createdAt: "desc" },
    }),
  );
}

/** Mural público — qualquer fiel da paróquia, visibility=comunidade. */
export async function listCommunityPrayerRequests(parishId: string, limit = 20): Promise<PrayerRequestListItem[]> {
  const rows = await withTenantContext(parishId, (tx) =>
    tx.prayerRequest.findMany({
      where: { parishId, visibility: "comunidade" },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { requester: { select: { fullName: true } } },
    }),
  );
  return rows.map(toListItem);
}

/** Só pároco/sacerdote (PERMISSIONS.PRAYER_REQUESTS_VIEW_PRIVATE) — visibility=padre. */
export async function listPrivatePrayerRequests(parishId: string, limit = 30): Promise<PrayerRequestListItem[]> {
  const rows = await withTenantContext(parishId, (tx) =>
    tx.prayerRequest.findMany({
      where: { parishId, visibility: "padre" },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { requester: { select: { fullName: true } } },
    }),
  );
  return rows.map(toListItem);
}
