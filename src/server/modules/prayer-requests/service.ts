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

/**
 * O pedido nasce pendente quando vai ao mural, e aprovado quando é para o
 * padre.
 *
 * O mural é lido pela comunidade inteira, e o campo é texto livre: alguém
 * precisa olhar antes. Já o pedido endereçado ao padre é privado por
 * definição — moderar uma mensagem dirigida a ele, por ele mesmo, seria
 * circular e só atrasaria quem está precisando.
 */
export function createPrayerRequest(input: CreatePrayerRequestInput & { parishId: string; userId: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.prayerRequest.create({
      data: {
        parishId: input.parishId,
        requesterUserId: input.userId,
        contentText: input.contentText,
        visibility: input.visibility,
        isAnonymous: input.isAnonymous,
        status: input.visibility === "comunidade" ? "pendente" : "aprovado",
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
      // Só o aprovado aparece: pendente e recusado ficam fora do mural.
      where: { parishId, visibility: "comunidade", status: "aprovado" },
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
      where: { parishId, visibility: "padre", status: { not: "recusado" } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { requester: { select: { fullName: true } } },
    }),
  );
  return rows.map(toListItem);
}

/**
 * A fila de quem espera aprovação — só os do mural.
 *
 * Traz o nome de quem pediu MESMO quando o pedido é anônimo: quem modera
 * precisa saber de quem veio para decidir, e para conversar se for o caso.
 * O anonimato vale na exibição ao mural, não na moderação.
 */
export function listPendingPrayerRequests(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.prayerRequest.findMany({
      where: { parishId, visibility: "comunidade", status: "pendente" },
      orderBy: { createdAt: "asc" },
      include: { requester: { select: { fullName: true } } },
    }),
  );
}

export function moderatePrayerRequest(
  parishId: string,
  id: string,
  status: "aprovado" | "recusado",
  moderatorUserId: string,
) {
  return withTenantContext(parishId, (tx) =>
    tx.prayerRequest.updateMany({
      where: { id, parishId, visibility: "comunidade" },
      data: { status, moderatedBy: moderatorUserId, moderatedAt: new Date() },
    }),
  );
}

/** Quantos esperam decisão — para o painel avisar sem abrir a tela. */
export function countPendingPrayerRequests(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.prayerRequest.count({ where: { parishId, visibility: "comunidade", status: "pendente" } }),
  );
}
