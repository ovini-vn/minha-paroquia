import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import { notifyManyUsers } from "@/server/modules/notifications/service";
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

  return withTenantContext(parishId, async (tx) => {
    const jaExistia = await tx.pastoralGroupInterest.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    const interest = await tx.pastoralGroupInterest.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: {},
      create: { parishId, groupId, userId },
    });

    // Mesmo problema das oportunidades de serviço: sem aviso, o interesse
    // ficava numa lista que alguém precisava lembrar de abrir.
    //
    // leaderName é texto livre (nem todo coordenador tem conta), então não
    // dá para avisar "o coordenador" diretamente — avisa quem criou a
    // pastoral e quem responde pela área.
    if (!jaExistia) {
      const quem = await tx.user.findUnique({
        where: { id: userId },
        select: { fullName: true, phone: true },
      });

      const responsaveis = await tx.parishMembership.findMany({
        where: {
          parishId,
          status: "active",
          role: { rolePermissions: { some: { permission: { code: "opportunities.manage" } } } },
        },
        select: { userId: true },
      });
      const destinatarios = new Set([group.createdBy, ...responsaveis.map((r) => r.userId)]);
      destinatarios.delete(userId);

      const contato = quem?.phone ? ` · ${quem.phone}` : "";
      await notifyManyUsers(
        tx,
        parishId,
        [...destinatarios],
        "pastoral",
        "Alguém quer entrar numa pastoral",
        `${quem?.fullName ?? "Um fiel"} demonstrou interesse em ${group.name}${contato}. Entre em contato para acolher.`,
      );
    }

    return interest;
  });
}

export function withdrawGroupInterest(parishId: string, groupId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.pastoralGroupInterest.deleteMany({ where: { parishId, groupId, userId } }),
  );
}
