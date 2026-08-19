import { withTenantContext } from "@/server/db/tenant-context";
import type { SetContributionInput } from "./schema";

/**
 * Marca ou desmarca a participação de um fiel no dízimo de um período.
 * Sempre acionado por pároco/secretaria (PERMISSIONS.DIZIMO_MANAGE) — nunca
 * pelo próprio fiel, para não virar autodeclaração. Sem valor monetário no
 * P1 (docs/ARQUITETURA.md, ambiguidade #6).
 */
export function setContribution(parishId: string, input: SetContributionInput, registeredBy: string): Promise<void> {
  return withTenantContext(parishId, async (tx) => {
    if (input.contributed) {
      await tx.titheParticipation.upsert({
        where: { userId_period: { userId: input.userId, period: input.period } },
        update: {},
        create: { parishId, userId: input.userId, period: input.period, registeredBy },
      });
    } else {
      await tx.titheParticipation.deleteMany({
        where: { parishId, userId: input.userId, period: input.period },
      });
    }
  });
}

/** Quem contribuiu num período — para a tela de registro do pároco/secretaria. */
export function listContributionsForPeriod(parishId: string, period: string) {
  return withTenantContext(parishId, (tx) =>
    tx.titheParticipation.findMany({ where: { parishId, period } }),
  );
}

/** Histórico do próprio fiel — "Minha Participação" (PRD seção 29), sem valores. */
export function listMyContributions(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.titheParticipation.findMany({
      where: { parishId, userId },
      orderBy: { period: "desc" },
      take: 12,
    }),
  );
}
