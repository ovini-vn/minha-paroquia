import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import type { PastoralGroupStatus } from "@prisma/client";

/**
 * Pastorais e grupos da paróquia.
 *
 * REGRA (PRD seção 21, mesma do ServiceInterest): manifestar interesse NÃO
 * inscreve ninguém na pastoral. Só registra que a pessoa se ofereceu, para
 * o coordenador procurá-la. Entrar num grupo continua sendo uma conversa
 * entre pessoas — nada aqui faz match automático.
 */

export type PastoralGroupInput = {
  name: string;
  description?: string | null;
  leaderName?: string | null;
  meetsWhen?: string | null;
  meetsWhere?: string | null;
};

export function listActiveGroups(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.pastoralGroup.findMany({
      where: { parishId, status: "ativa" },
      orderBy: { name: "asc" },
      include: { _count: { select: { interests: true } } },
    }),
  );
}

/** Inclui as inativas — só para a gestão. */
export function listAllGroups(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.pastoralGroup.findMany({
      where: { parishId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { _count: { select: { interests: true } } },
    }),
  );
}

export function listMyGroupInterests(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.pastoralGroupInterest.findMany({ where: { parishId, userId } }),
  );
}

export function listInterestsForParish(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.pastoralGroupInterest.findMany({
      where: { parishId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { fullName: true, email: true } },
        group: { select: { name: true } },
      },
    }),
  );
}

export async function createGroup(parishId: string, createdBy: string, input: PastoralGroupInput) {
  const name = input.name.trim();
  if (!name) throw new ValidationError("Informe o nome da pastoral.");

  return withTenantContext(parishId, (tx) =>
    tx.pastoralGroup.create({
      data: {
        parishId,
        createdBy,
        name,
        description: input.description?.trim() || null,
        leaderName: input.leaderName?.trim() || null,
        meetsWhen: input.meetsWhen?.trim() || null,
        meetsWhere: input.meetsWhere?.trim() || null,
      },
    }),
  );
}

export function setGroupStatus(parishId: string, groupId: string, status: PastoralGroupStatus) {
  return withTenantContext(parishId, (tx) =>
    tx.pastoralGroup.updateMany({ where: { id: groupId, parishId }, data: { status } }),
  );
}

/**
 * Idempotente: manifestar interesse duas vezes não duplica o registro nem
 * reabre um contato que o coordenador já tratou.
 */
export async function expressGroupInterest(parishId: string, groupId: string, userId: string) {
  const group = await withTenantContext(parishId, (tx) =>
    tx.pastoralGroup.findFirst({ where: { id: groupId, parishId } }),
  );
  if (!group) throw new ValidationError("Pastoral não encontrada.");
  if (group.status !== "ativa") {
    throw new ValidationError("Esta pastoral não está recebendo interessados no momento.");
  }

  return withTenantContext(parishId, (tx) =>
    tx.pastoralGroupInterest.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: {},
      create: { parishId, groupId, userId },
    }),
  );
}

export function withdrawGroupInterest(parishId: string, groupId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.pastoralGroupInterest.deleteMany({ where: { parishId, groupId, userId } }),
  );
}
