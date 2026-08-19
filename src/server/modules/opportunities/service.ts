import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
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

    return tx.serviceInterest.upsert({
      where: { opportunityId_userId: { opportunityId, userId } },
      update: {},
      create: { opportunityId, userId, parishId },
    });
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
