import { withTenantContext } from "@/server/db/tenant-context";
import { notifyUser } from "@/server/modules/notifications/service";
import { SACRAMENT_TYPE_LABELS } from "@/lib/caminhada-labels";
import { formatDateOnly } from "@/lib/date";
import type { RegisterMassParticipationInput, RegisterSacramentInput, RegisterConfessionInput } from "./schema";

// ---- Missas e reflexão ------------------------------------------------

export function registerMassParticipation(
  input: RegisterMassParticipationInput & { parishId: string; userId: string },
) {
  return withTenantContext(input.parishId, (tx) =>
    tx.massParticipation.create({
      data: {
        parishId: input.parishId,
        userId: input.userId,
        participatedAt: input.participatedAt,
        reflectionText: input.reflectionText || null,
      },
    }),
  );
}

/** Só o próprio usuário lê a própria reflexão — nunca chamado com outro userId a partir de uma tela administrativa. */
export function listMyMassParticipations(parishId: string, userId: string, limit = 20) {
  return withTenantContext(parishId, (tx) =>
    tx.massParticipation.findMany({
      where: { parishId, userId },
      orderBy: { participatedAt: "desc" },
      take: limit,
    }),
  );
}

const MIN_AGGREGATE_SAMPLE = 5;

/**
 * Único caminho pelo qual a paróquia enxerga algo sobre reflexões — nunca
 * texto, nunca por pessoa. Abaixo do limiar mínimo, não retorna nada
 * utilizável (evita expor indivíduo por dedução numa comunidade pequena).
 * PRD seção 24.
 */
export type ReflectionAggregate =
  | { available: true; total: number; withReflection: number; rate: number }
  | { available: false; total: number };

export async function getReflectionAggregate(parishId: string, days = 30): Promise<ReflectionAggregate> {
  return withTenantContext(parishId, async (tx) => {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [total, withReflection] = await Promise.all([
      tx.massParticipation.count({ where: { parishId, participatedAt: { gte: since } } }),
      tx.massParticipation.count({
        where: { parishId, participatedAt: { gte: since }, reflectionText: { not: null } },
      }),
    ]);

    if (total < MIN_AGGREGATE_SAMPLE) {
      return { available: false, total };
    }
    return { available: true, total, withReflection, rate: Math.round((withReflection / total) * 100) };
  });
}

// ---- Sacramentos --------------------------------------------------------

export function registerSacrament(input: RegisterSacramentInput & { parishId: string; userId: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.sacrament.create({
      data: {
        parishId: input.parishId,
        userId: input.userId,
        type: input.type,
        date: input.date,
        location: input.location || null,
        priestProfileId: input.priestProfileId || null,
        note: input.note || null,
      },
    }),
  );
}

export function listMySacraments(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.sacrament.findMany({
      where: { parishId, userId },
      orderBy: { date: "desc" },
      include: { priestProfile: { include: { user: { select: { fullName: true } } } } },
    }),
  );
}

/** Todos os sacramentos da paróquia — tela de validação (pároco/secretaria). */
export function listSacramentsForValidation(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.sacrament.findMany({
      where: { parishId },
      orderBy: [{ status: "asc" }, { date: "desc" }],
      include: { user: { select: { fullName: true } } },
    }),
  );
}

/**
 * Confirma (ou reverte) que um sacramento autodeclarado bate com o registro
 * oficial da paróquia — nunca automático, sempre uma ação humana explícita
 * de quem tem PERMISSIONS.SACRAMENTS_VALIDATE. Ver comentário no schema.
 */
export async function setSacramentValidation(
  parishId: string,
  id: string,
  validated: boolean,
  validatedBy: string,
) {
  return withTenantContext(parishId, async (tx) => {
    const sacrament = await tx.sacrament.findFirst({ where: { id, parishId } });
    if (!sacrament) return { count: 0 };

    await tx.sacrament.update({
      where: { id: sacrament.id },
      data: validated
        ? { status: "validated", validatedBy, validatedAt: new Date() }
        : { status: "self_reported", validatedBy: null, validatedAt: null },
    });

    if (validated) {
      await notifyUser(tx, {
        parishId,
        userId: sacrament.userId,
        category: "espiritual",
        title: "Sacramento validado",
        body: `Seu registro de ${SACRAMENT_TYPE_LABELS[sacrament.type]} (${formatDateOnly(sacrament.date)}) foi confirmado pela paróquia.`,
      });
    }

    return { count: 1 };
  });
}

// ---- Confissão (só data — ver schema.prisma) -----------------------------

export function registerConfession(input: RegisterConfessionInput & { parishId: string; userId: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.confessionLog.create({
      data: { parishId: input.parishId, userId: input.userId, date: input.date },
    }),
  );
}

export function listMyConfessions(parishId: string, userId: string, limit = 20) {
  return withTenantContext(parishId, (tx) =>
    tx.confessionLog.findMany({
      where: { parishId, userId },
      orderBy: { date: "desc" },
      take: limit,
    }),
  );
}
