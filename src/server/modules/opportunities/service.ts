import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import { notifyManyUsers } from "@/server/modules/notifications/service";
import type { CreateOpportunityInput } from "./schema";

export function createOpportunity(input: CreateOpportunityInput & { parishId: string; createdBy: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.serviceOpportunity.create({
      data: {
        parishId: input.parishId,
        title: input.title,
        description: input.description || null,
        startsAt: input.startsAt ?? null,
        createdBy: input.createdBy,
      },
    }),
  );
}

/** `createdByOnly` — mesma regra de listOpportunitiesForAdmin: um coordenador só encerra a própria. */
export function closeOpportunity(parishId: string, id: string, createdByOnly?: string) {
  return withTenantContext(parishId, (tx) =>
    tx.serviceOpportunity.updateMany({
      where: { id, parishId, ...(createdByOnly ? { createdBy: createdByOnly } : {}) },
      data: { status: "encerrada" },
    }),
  );
}

export function listOpenOpportunities(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.serviceOpportunity.findMany({
      where: { parishId, status: "aberta" },
      orderBy: { createdAt: "desc" },
    }),
  );
}

/**
 * Para o painel: todas as oportunidades (abertas e encerradas), com os
 * interesses recebidos. `createdByOnly` restringe a quem criou a
 * oportunidade — usado para Coordenador de Pastoral, que deve ver só o que
 * é da própria área, não de outros ministérios (Pároco/Secretaria passam
 * `createdByOnly: undefined` e enxergam tudo, como supervisão geral).
 */
export function listOpportunitiesForAdmin(parishId: string, createdByOnly?: string) {
  return withTenantContext(parishId, (tx) =>
    tx.serviceOpportunity.findMany({
      where: { parishId, ...(createdByOnly ? { createdBy: createdByOnly } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        interests: { include: { user: { select: { fullName: true, email: true } } } },
      },
    }),
  );
}

export function listMyInterests(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.serviceInterest.findMany({ where: { parishId, userId }, select: { opportunityId: true } }),
  );
}

/** service_interests é a manifestação (PRD seção 21) — nunca muda status de outra tabela sozinha. */
export async function expressInterest(parishId: string, opportunityId: string, userId: string) {
  return withTenantContext(parishId, async (tx) => {
    const opportunity = await tx.serviceOpportunity.findFirst({
      where: { id: opportunityId, parishId, status: "aberta" },
    });
    if (!opportunity) {
      throw new ValidationError("Esta oportunidade não está mais disponível.");
    }

    const jaExistia = await tx.serviceInterest.findUnique({
      where: { opportunityId_userId: { opportunityId, userId } },
    });

    const interest = await tx.serviceInterest.upsert({
      where: { opportunityId_userId: { opportunityId, userId } },
      update: {},
      create: { opportunityId, userId, parishId },
    });

    // Avisa quem responde pela oportunidade. Antes, o fiel se oferecia e
    // NINGUÉM era avisado: o interesse ficava numa lista que alguém
    // precisava lembrar de abrir. Quem se dispõe a servir e não recebe
    // resposta não se dispõe uma segunda vez.
    //
    // Só na primeira vez: reapertar o botão não pode gerar aviso repetido.
    if (!jaExistia) {
      const quem = await tx.user.findUnique({
        where: { id: userId },
        select: { fullName: true, phone: true },
      });

      // Quem criou, mais quem responde pela área — se a pessoa que criou
      // saiu da paróquia, o aviso ainda chega a alguém.
      const responsaveis = await tx.parishMembership.findMany({
        where: {
          parishId,
          status: "active",
          role: { rolePermissions: { some: { permission: { code: "opportunities.manage" } } } },
        },
        select: { userId: true },
      });
      const destinatarios = new Set([opportunity.createdBy, ...responsaveis.map((r) => r.userId)]);
      destinatarios.delete(userId); // quem se ofereceu não precisa se avisar

      const contato = quem?.phone ? ` · ${quem.phone}` : "";
      await notifyManyUsers(
        tx,
        parishId,
        [...destinatarios],
        "pastoral",
        "Alguém se ofereceu para servir",
        `${quem?.fullName ?? "Um fiel"} se ofereceu para "${opportunity.title}"${contato}. Entre em contato para acolher.`,
      );
    }

    return interest;
  });
}

/**
 * Mudar status é uma ação humana explícita do responsável, nunca automática
 * (PRD seção 21). `createdByOnly` filtra pela oportunidade dona do
 * interesse: um coordenador só move o status de quem se candidatou nas
 * oportunidades que ele mesmo criou.
 */
export function updateInterestStatus(
  parishId: string,
  id: string,
  status: "em_contato" | "acolhido" | "declinado",
  createdByOnly?: string,
) {
  return withTenantContext(parishId, (tx) =>
    tx.serviceInterest.updateMany({
      where: { id, parishId, ...(createdByOnly ? { opportunity: { createdBy: createdByOnly } } : {}) },
      data: { status },
    }),
  );
}
