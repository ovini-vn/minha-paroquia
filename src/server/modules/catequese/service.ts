import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import type { CreateGroupInput, CreateSessionInput, CreateRiteInput } from "./schema";

// ---- Turmas -------------------------------------------------------------

export function createGroup(input: CreateGroupInput & { parishId: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.catechismGroup.create({
      data: {
        parishId: input.parishId,
        name: input.name,
        year: input.year,
        catechistUserId: input.catechistUserId || null,
      },
    }),
  );
}

export function listGroups(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismGroup.findMany({
      where: { parishId },
      orderBy: [{ year: "desc" }, { name: "asc" }],
      include: { catechist: { select: { fullName: true } }, _count: { select: { enrollments: true } } },
    }),
  );
}

/** Turmas onde o usuário é o catequista designado — base de /eu/catequese. */
export function listGroupsForCatechist(parishId: string, catechistUserId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismGroup.findMany({
      where: { parishId, catechistUserId },
      orderBy: [{ year: "desc" }, { name: "asc" }],
    }),
  );
}

/** `catechistOnly` restringe a leitura a turmas do próprio catequista — mesmo padrão de Servir (isFullAdmin). */
export function getGroup(parishId: string, id: string, catechistOnly?: string) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismGroup.findFirst({
      where: { id, parishId, ...(catechistOnly ? { catechistUserId: catechistOnly } : {}) },
      include: { catechist: { select: { fullName: true } } },
    }),
  );
}

// ---- Matrícula ------------------------------------------------------------

export async function enrollFamilyMember(parishId: string, groupId: string, familyMemberId: string) {
  return withTenantContext(parishId, async (tx) => {
    const familyMember = await tx.familyMember.findFirst({ where: { id: familyMemberId, parishId } });
    if (!familyMember) throw new ValidationError("Dependente não encontrado.");

    const existing = await tx.catechismEnrollment.findUnique({
      where: { catechismGroupId_familyMemberId: { catechismGroupId: groupId, familyMemberId } },
    });
    if (existing) throw new ValidationError("Este dependente já está matriculado nesta turma.");

    return tx.catechismEnrollment.create({
      data: { parishId, catechismGroupId: groupId, familyMemberId },
    });
  });
}

export function listEnrollments(parishId: string, groupId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismEnrollment.findMany({
      where: { parishId, catechismGroupId: groupId },
      orderBy: { enrolledAt: "asc" },
      include: { familyMember: { include: { responsible: { select: { fullName: true } } } } },
    }),
  );
}

/**
 * Matrículas dos próprios dependentes — base da visão do responsável em
 * /comunidade/catequese. Considera QUALQUER guardião do dependente, não só
 * quem cadastrou originalmente (múltiplos vínculos simultâneos, P2).
 */
export function listMyChildrenEnrollments(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismEnrollment.findMany({
      where: { parishId, familyMember: { guardians: { some: { userId } } } },
      include: { familyMember: true, group: true },
    }),
  );
}

// ---- Encontros e presença --------------------------------------------------

export function createSession(
  parishId: string,
  groupId: string,
  input: CreateSessionInput,
  catechistOnly?: string,
) {
  return withTenantContext(parishId, async (tx) => {
    const group = await tx.catechismGroup.findFirst({
      where: { id: groupId, parishId, ...(catechistOnly ? { catechistUserId: catechistOnly } : {}) },
    });
    if (!group) throw new ValidationError("Turma não encontrada.");

    return tx.catechismSession.create({
      data: { parishId, catechismGroupId: groupId, date: input.date, topic: input.topic || null },
    });
  });
}

export function listSessions(parishId: string, groupId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismSession.findMany({ where: { parishId, catechismGroupId: groupId }, orderBy: { date: "desc" } }),
  );
}

export function getNextSessionForGroup(parishId: string, groupId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismSession.findFirst({
      where: { parishId, catechismGroupId: groupId, date: { gte: new Date() } },
      orderBy: { date: "asc" },
    }),
  );
}

export function listAttendanceForSession(parishId: string, sessionId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismAttendance.findMany({ where: { parishId, sessionId } }),
  );
}

/** Um upsert por matrícula — a chamada re-grava a lista inteira da chamada de um encontro. */
export function recordAttendance(
  parishId: string,
  sessionId: string,
  entries: { enrollmentId: string; present: boolean }[],
) {
  return withTenantContext(parishId, (tx) =>
    Promise.all(
      entries.map((entry) =>
        tx.catechismAttendance.upsert({
          where: { sessionId_enrollmentId: { sessionId, enrollmentId: entry.enrollmentId } },
          update: { present: entry.present },
          create: { parishId, sessionId, enrollmentId: entry.enrollmentId, present: entry.present },
        }),
      ),
    ),
  );
}

// ---- Ritos ------------------------------------------------------------------

export function createRite(parishId: string, enrollmentId: string, input: CreateRiteInput) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismRite.create({
      data: {
        parishId,
        enrollmentId,
        name: input.name,
        scheduledAt: input.scheduledAt ?? null,
      },
    }),
  );
}

export function completeRite(parishId: string, riteId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismRite.updateMany({ where: { id: riteId, parishId }, data: { completedAt: new Date() } }),
  );
}

export function listRitesForEnrollment(parishId: string, enrollmentId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismRite.findMany({ where: { parishId, enrollmentId }, orderBy: { createdAt: "desc" } }),
  );
}
