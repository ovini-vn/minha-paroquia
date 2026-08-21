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

/** Turmas onde o usuário é o catequista designado — base da visão do catequista em /catequese. */
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
 * /catequese. Considera QUALQUER guardião do dependente, não só
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

// ---- Presença na missa ------------------------------------------------------

/**
 * Marca ou desmarca a presença do catequizando numa missa.
 *
 * A chave é (matrícula, dia): lançar o mesmo domingo duas vezes não pode
 * inflar o acompanhamento que a família vê.
 */
export function setMassAttendance(
  parishId: string,
  enrollmentId: string,
  attendedOn: Date,
  present: boolean,
  notedBy: string,
  celebrationId?: string | null,
) {
  return withTenantContext(parishId, async (tx) => {
    if (!present) {
      return tx.catechismMassAttendance.deleteMany({ where: { parishId, enrollmentId, attendedOn } });
    }
    return tx.catechismMassAttendance.upsert({
      where: { enrollmentId_attendedOn: { enrollmentId, attendedOn } },
      update: { celebrationId: celebrationId ?? null, notedBy },
      create: { parishId, enrollmentId, attendedOn, celebrationId: celebrationId ?? null, notedBy },
    });
  });
}

export function listMassAttendance(parishId: string, enrollmentId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismMassAttendance.findMany({
      where: { parishId, enrollmentId },
      orderBy: { attendedOn: "desc" },
      include: { celebration: { select: { title: true, startsAt: true } } },
    }),
  );
}

// ---- Visões ------------------------------------------------------------------

/**
 * Números da catequese inteira — a visão de quem coordena.
 *
 * Conta catequistas pelas turmas COM catequista designado, não pelo papel:
 * o que interessa a quem coordena é quantas turmas estão cobertas, não
 * quantas pessoas têm o papel no cadastro.
 */
export async function getCatequeseOverview(parishId: string) {
  return withTenantContext(parishId, async (tx) => {
    const [turmas, matriculas, comCatequista, semCatequista, proximosRitos, proximosEncontros] =
      await Promise.all([
        tx.catechismGroup.count({ where: { parishId } }),
        tx.catechismEnrollment.count({ where: { parishId } }),
        tx.catechismGroup.findMany({
          where: { parishId, catechistUserId: { not: null } },
          select: { catechistUserId: true },
          distinct: ["catechistUserId"],
        }),
        tx.catechismGroup.count({ where: { parishId, catechistUserId: null } }),
        tx.catechismRite.findMany({
          where: { parishId, completedAt: null, scheduledAt: { not: null } },
          orderBy: { scheduledAt: "asc" },
          take: 5,
          include: {
            enrollment: {
              include: { familyMember: { select: { fullName: true } }, group: { select: { name: true } } },
            },
          },
        }),
        tx.catechismSession.findMany({
          where: { parishId, date: { gte: new Date() } },
          orderBy: { date: "asc" },
          take: 5,
          include: { group: { select: { name: true } } },
        }),
      ]);

    return {
      turmas,
      matriculas,
      catequistas: comCatequista.length,
      turmasSemCatequista: semCatequista,
      proximosRitos,
      proximosEncontros,
    };
  });
}

/**
 * Só a turma da matrícula, sem trazer nome de ninguém.
 *
 * Existe para a autorização acontecer ANTES de buscar a ficha. O payload do
 * React Server Components carrega o que foi lido durante o render — mesmo
 * quando a página termina em notFound(), o dado já buscado viaja na
 * resposta. Autorizar primeiro é o que impede o nome do catequizando de
 * sair para quem não pode vê-lo.
 */
export async function getEnrollmentGroupId(parishId: string, enrollmentId: string) {
  const linha = await withTenantContext(parishId, (tx) =>
    tx.catechismEnrollment.findFirst({
      where: { id: enrollmentId, parishId },
      select: { catechismGroupId: true },
    }),
  );
  return linha?.catechismGroupId ?? null;
}

/**
 * A ficha de um catequizando: encontros, presença e ritos.
 *
 * Usada pela família (só o próprio filho) e pelo catequista (os da turma
 * dele). Quem chama já decidiu que esta pessoa pode ver ESTA matrícula.
 */
export async function getEnrollmentProgress(parishId: string, enrollmentId: string) {
  return withTenantContext(parishId, async (tx) => {
    const enrollment = await tx.catechismEnrollment.findFirst({
      where: { id: enrollmentId, parishId },
      include: {
        familyMember: { select: { fullName: true } },
        group: { include: { catechist: { select: { fullName: true } } } },
      },
    });
    if (!enrollment) return null;

    const [encontros, presencas, ritos, missas] = await Promise.all([
      tx.catechismSession.findMany({
        where: { parishId, catechismGroupId: enrollment.catechismGroupId },
        orderBy: { date: "desc" },
      }),
      tx.catechismAttendance.findMany({ where: { parishId, enrollmentId } }),
      tx.catechismRite.findMany({ where: { parishId, enrollmentId }, orderBy: { createdAt: "desc" } }),
      tx.catechismMassAttendance.findMany({
        where: { parishId, enrollmentId },
        orderBy: { attendedOn: "desc" },
      }),
    ]);

    const presencaPorSessao = new Map(presencas.map((p) => [p.sessionId, p.present]));
    // Só conta encontros JÁ REALIZADOS: incluir os futuros faria a família
    // ver "3 de 10" e achar que o filho está faltando.
    const realizados = encontros.filter((e) => e.date <= new Date());
    const presentes = realizados.filter((e) => presencaPorSessao.get(e.id) === true).length;

    return {
      enrollment,
      encontros,
      presencaPorSessao,
      ritos,
      missas,
      resumo: {
        encontrosRealizados: realizados.length,
        presencas: presentes,
        missas: missas.length,
      },
    };
  });
}

/** Matrículas das turmas de um catequista — a lista de "meus catequizandos". */
export function listEnrollmentsForCatechist(parishId: string, catechistUserId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismEnrollment.findMany({
      where: { parishId, group: { catechistUserId } },
      orderBy: [{ group: { name: "asc" } }, { familyMember: { fullName: "asc" } }],
      include: {
        familyMember: { select: { fullName: true, guardianName: true, guardianPhone: true } },
        group: { select: { id: true, name: true, year: true } },
      },
    }),
  );
}
