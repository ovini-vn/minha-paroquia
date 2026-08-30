import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import { resumirLancamento } from "@/lib/lancamento-de-conteudo";
import type {
  CreateGroupInput,
  CreateSessionInput,
  CreateRiteInput,
  CriarItinerarioInput,
  CriarTemaInput,
} from "./schema";

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

    // O tema precisa ser do itinerário DESTA turma. Sem esta conferência, um
    // id colado no formulário ligaria o encontro ao roteiro de outra turma e
    // a evolução das duas sairia errada.
    let temaId: string | null = null;
    if (input.itinerarioTemaId) {
      const tema = await tx.itinerarioTema.findFirst({
        where: { id: input.itinerarioTemaId, parishId, itinerarioId: group.itinerarioId ?? "" },
        select: { id: true },
      });
      if (!tema) throw new ValidationError("Esse tema não pertence ao itinerário da turma.");
      temaId = tema.id;
    }

    return tx.catechismSession.create({
      data: {
        parishId,
        catechismGroupId: groupId,
        date: input.date,
        topic: input.topic || null,
        itinerarioTemaId: temaId,
      },
    });
  });
}

export function listSessions(parishId: string, groupId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismSession.findMany({
      where: { parishId, catechismGroupId: groupId },
      orderBy: { date: "desc" },
      // O tema junto: a lista mostra o que foi dado, e é por ele que a
      // catequista reconhece o encontro — a data sozinha não diz nada.
      include: { tema: { select: { titulo: true, ordem: true } } },
    }),
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

/**
 * Um upsert por matrícula — a chamada re-grava a lista inteira do encontro.
 *
 * Ignora matrícula que não seja da turma DO ENCONTRO. Os ids vêm do
 * formulário, e sem esse filtro dava para gravar presença de aluno de outra
 * turma passando o id dele.
 */
export function recordAttendance(
  parishId: string,
  sessionId: string,
  entries: { enrollmentId: string; present: boolean }[],
) {
  return withTenantContext(parishId, async (tx) => {
    const encontro = await tx.catechismSession.findFirst({
      where: { id: sessionId, parishId },
      select: { catechismGroupId: true },
    });
    if (!encontro) throw new ValidationError("Encontro não encontrado.");

    const daTurma = await tx.catechismEnrollment.findMany({
      where: { parishId, catechismGroupId: encontro.catechismGroupId },
      select: { id: true },
    });
    const permitidas = new Set(daTurma.map((e) => e.id));

    return Promise.all(
      entries
        .filter((entry) => permitidas.has(entry.enrollmentId))
        .map((entry) =>
          tx.catechismAttendance.upsert({
            where: { sessionId_enrollmentId: { sessionId, enrollmentId: entry.enrollmentId } },
            update: { present: entry.present },
            create: { parishId, sessionId, enrollmentId: entry.enrollmentId, present: entry.present },
          }),
        ),
    );
  });
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

// ---- Autorização por turma ---------------------------------------------------

/**
 * Confirma que a pessoa pode agir sobre ESTA matrícula, e devolve a turma.
 *
 * Existe porque a permissão sozinha não basta: CATEQUESE_TEACH diz "é
 * catequista", não "é catequista DESTA turma". As telas já respeitavam esse
 * limite na leitura (getGroup com catechistOnly), mas as ações de escrita
 * recebiam enrollmentId/sessionId do formulário e gravavam sem conferir —
 * qualquer catequista da paróquia podia lançar presença ou registrar rito
 * de aluno de outra turma.
 */
export async function requireEnrollmentAccess(
  parishId: string,
  enrollmentId: string,
  userId: string,
  coordena: boolean,
): Promise<string> {
  const linha = await withTenantContext(parishId, (tx) =>
    tx.catechismEnrollment.findFirst({
      where: { id: enrollmentId, parishId },
      select: { catechismGroupId: true, group: { select: { catechistUserId: true } } },
    }),
  );
  if (!linha) throw new ValidationError("Matrícula não encontrada.");
  if (!coordena && linha.group.catechistUserId !== userId) {
    throw new ValidationError("Esta turma não é sua.");
  }
  return linha.catechismGroupId;
}

/** Idem para um encontro. */
export async function requireSessionAccess(
  parishId: string,
  sessionId: string,
  userId: string,
  coordena: boolean,
): Promise<string> {
  const linha = await withTenantContext(parishId, (tx) =>
    tx.catechismSession.findFirst({
      where: { id: sessionId, parishId },
      select: { catechismGroupId: true, group: { select: { catechistUserId: true } } },
    }),
  );
  if (!linha) throw new ValidationError("Encontro não encontrado.");
  if (!coordena && linha.group.catechistUserId !== userId) {
    throw new ValidationError("Esta turma não é sua.");
  }
  return linha.catechismGroupId;
}

/** Idem para um rito já registrado. */
export async function requireRiteAccess(
  parishId: string,
  riteId: string,
  userId: string,
  coordena: boolean,
): Promise<string> {
  const linha = await withTenantContext(parishId, (tx) =>
    tx.catechismRite.findFirst({
      where: { id: riteId, parishId },
      select: { enrollment: { select: { catechismGroupId: true, group: { select: { catechistUserId: true } } } } },
    }),
  );
  if (!linha) throw new ValidationError("Rito não encontrado.");
  if (!coordena && linha.enrollment.group.catechistUserId !== userId) {
    throw new ValidationError("Esta turma não é sua.");
  }
  return linha.enrollment.catechismGroupId;
}

// ---------------------------------------------------------------------------
// Itinerário: o plano que a turma segue.
//
// A paróquia escreve o dela. Nada aqui vem pronto de propósito — o material
// da catequese muda de arquidiocese, e um roteiro embutido estaria errado
// para quase todo mundo.
// ---------------------------------------------------------------------------

export function listarItinerarios(parishId: string, incluirInativos = false) {
  return withTenantContext(parishId, (tx) =>
    tx.itinerario.findMany({
      where: { parishId, ...(incluirInativos ? {} : { ativo: true }) },
      orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { temas: true, grupos: true } },
      },
    }),
  );
}

export function obterItinerario(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) =>
    tx.itinerario.findFirst({
      where: { id, parishId },
      include: {
        // Empate na ordem resolve pela criação: é o que permite a ordem não
        // ser única e ainda assim a lista sair estável.
        temas: { orderBy: [{ ordem: "asc" }, { createdAt: "asc" }] },
        grupos: { select: { id: true, name: true, year: true } },
      },
    }),
  );
}

export function criarItinerario(parishId: string, input: CriarItinerarioInput) {
  return withTenantContext(parishId, (tx) =>
    tx.itinerario.create({
      data: {
        parishId,
        nome: input.nome,
        descricao: input.descricao || null,
        ordem: input.ordem ?? 0,
      },
    }),
  );
}

/**
 * Aposentar um itinerário, e não apagar.
 *
 * As turmas antigas continuam apontando para ele, e o histórico do que uma
 * criança percorreu não pode sumir porque a paróquia trocou de material.
 */
export function arquivarItinerario(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) =>
    tx.itinerario.updateMany({ where: { id, parishId }, data: { ativo: false } }),
  );
}

export async function criarTema(parishId: string, itinerarioId: string, input: CriarTemaInput) {
  return withTenantContext(parishId, async (tx) => {
    const itinerario = await tx.itinerario.findFirst({
      where: { id: itinerarioId, parishId },
      select: { id: true },
    });
    if (!itinerario) return null;

    // Sem ordem informada, entra no fim: a coordenação digita os encontros
    // na sequência em que eles acontecem, e numerar à mão seria trabalho.
    const ordem =
      input.ordem ??
      ((await tx.itinerarioTema.aggregate({
        where: { parishId, itinerarioId },
        _max: { ordem: true },
      }))._max.ordem ?? 0) + 1;

    return tx.itinerarioTema.create({
      data: {
        parishId,
        itinerarioId,
        titulo: input.titulo,
        descricao: input.descricao || null,
        ordem,
      },
    });
  });
}

export function removerTema(parishId: string, temaId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.itinerarioTema.deleteMany({ where: { id: temaId, parishId } }),
  );
}

export function definirItinerarioDaTurma(
  parishId: string,
  groupId: string,
  itinerarioId: string | null,
) {
  return withTenantContext(parishId, (tx) =>
    tx.catechismGroup.updateMany({ where: { id: groupId, parishId }, data: { itinerarioId } }),
  );
}

/** Os temas oferecidos ao catequista na hora de lançar o encontro. */
export function listarTemasDaTurma(parishId: string, groupId: string) {
  return withTenantContext(parishId, async (tx) => {
    const grupo = await tx.catechismGroup.findFirst({
      where: { id: groupId, parishId },
      select: { itinerarioId: true },
    });
    if (!grupo?.itinerarioId) return [];
    return tx.itinerarioTema.findMany({
      where: { parishId, itinerarioId: grupo.itinerarioId },
      orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
    });
  });
}

/**
 * O andamento de uma turma: quanto do itinerário já foi dado, e o que está
 * sem lançamento.
 *
 * `dados` conta TEMAS distintos já lançados, não encontros: dois encontros
 * sobre o mesmo tema não fazem a turma andar duas casas.
 */
export async function obterAndamentoDaTurma(parishId: string, groupId: string, agora: Date) {
  return withTenantContext(parishId, async (tx) => {
    const grupo = await tx.catechismGroup.findFirst({
      where: { id: groupId, parishId },
      include: { itinerario: { include: { _count: { select: { temas: true } } } } },
    });
    if (!grupo) return null;

    const encontros = await tx.catechismSession.findMany({
      where: { parishId, catechismGroupId: groupId },
      orderBy: { date: "asc" },
      select: { id: true, date: true, topic: true, itinerarioTemaId: true },
    });

    const temasDados = new Set(
      encontros.map((e) => e.itinerarioTemaId).filter((id): id is string => Boolean(id)),
    );

    return {
      itinerario: grupo.itinerario,
      previstos: grupo.itinerario?._count.temas ?? 0,
      dados: temasDados.size,
      encontros,
      lancamento: resumirLancamento(encontros, agora),
    };
  });
}

/**
 * O quadro da coordenação: uma linha por turma, com o sinal do que trava.
 *
 * Faz UMA consulta de encontros para todas as turmas, e não uma por turma —
 * numa paróquia com vinte turmas isso seria vinte idas ao banco para montar
 * uma tela só.
 */
export async function obterQuadroDaCoordenacao(parishId: string, agora: Date) {
  return withTenantContext(parishId, async (tx) => {
    const [grupos, encontros] = await Promise.all([
      tx.catechismGroup.findMany({
        where: { parishId },
        orderBy: [{ year: "desc" }, { name: "asc" }],
        include: {
          catechist: { select: { fullName: true } },
          itinerario: { include: { _count: { select: { temas: true } } } },
          _count: { select: { enrollments: true } },
        },
      }),
      tx.catechismSession.findMany({
        where: { parishId },
        select: { id: true, date: true, topic: true, itinerarioTemaId: true, catechismGroupId: true },
      }),
    ]);

    const porTurma = new Map<string, typeof encontros>();
    for (const e of encontros) {
      const lista = porTurma.get(e.catechismGroupId) ?? [];
      lista.push(e);
      porTurma.set(e.catechismGroupId, lista);
    }

    return grupos.map((grupo) => {
      const meus = porTurma.get(grupo.id) ?? [];
      const temasDados = new Set(
        meus.map((e) => e.itinerarioTemaId).filter((id): id is string => Boolean(id)),
      );
      return {
        id: grupo.id,
        nome: grupo.name,
        ano: grupo.year,
        catequista: grupo.catechist?.fullName ?? null,
        matriculados: grupo._count.enrollments,
        itinerario: grupo.itinerario ? { id: grupo.itinerario.id, nome: grupo.itinerario.nome } : null,
        previstos: grupo.itinerario?._count.temas ?? 0,
        dados: temasDados.size,
        encontrosRealizados: meus.filter((e) => e.date <= agora).length,
        lancamento: resumirLancamento(meus, agora),
      };
    });
  });
}
