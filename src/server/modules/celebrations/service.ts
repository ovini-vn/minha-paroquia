import type { CelebrationType, Prisma } from "@prisma/client";
import { withTenantContext, withPlatformContext } from "@/server/db/tenant-context";
import { brasiliaWallClockToUtc } from "@/lib/brasilia";
import { occurrencesBetween, type RecurrenceRule } from "@/lib/recurrence";
import { ValidationError } from "@/server/shared/errors";
import type { CreateCelebrationInput, CreateCelebrationScheduleInput } from "./schema";

/**
 * Quanto tempo à frente as ocorrências ficam criadas.
 *
 * Precisa ser longo o bastante para a secretaria montar escala com folga,
 * e curto o bastante para mudar a regra não significar mexer em centenas
 * de linhas. Um trimestre cobre o planejamento real de uma paróquia.
 */
export const HORIZONTE_DIAS = 120;

export function createCelebration(input: CreateCelebrationInput & { parishId: string; createdBy: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.celebration.create({
      data: {
        parishId: input.parishId,
        type: input.type,
        title: input.title || null,
        startsAt: input.startsAt,
        location: input.location || null,
        priestProfileId: input.priestProfileId || null,
        createdBy: input.createdBy,
      },
    }),
  );
}

export function listUpcomingCelebrations(parishId: string, limit = 10) {
  return withTenantContext(parishId, (tx) =>
    tx.celebration.findMany({
      // canceledAt: null — missa cancelada não some da base (a escala
      // dela continua apontando para cá), mas não pode aparecer como se
      // fosse acontecer.
      where: { parishId, startsAt: { gte: new Date() }, canceledAt: null },
      orderBy: { startsAt: "asc" },
      take: limit,
      include: { priestProfile: { include: { user: { select: { fullName: true } } } } },
    }),
  );
}

export async function getNextCelebration(parishId: string) {
  const [next] = await listUpcomingCelebrations(parishId, 1);
  return next ?? null;
}

// ---------------------------------------------------------------------------
// Repetição
// ---------------------------------------------------------------------------

function toRule(schedule: {
  frequency: string;
  weekday: number;
  weekOfMonth: number | null;
  timeMinutes: number;
  startsOn: Date;
  endsOn: Date | null;
}): RecurrenceRule {
  return {
    frequency: schedule.frequency as "semanal" | "mensal",
    weekday: schedule.weekday,
    weekOfMonth: schedule.weekOfMonth,
    timeMinutes: schedule.timeMinutes,
    startsOn: schedule.startsOn,
    endsOn: schedule.endsOn,
  };
}

type ScheduleRow = {
  id: string;
  parishId: string;
  type: string;
  title: string | null;
  location: string | null;
  priestProfileId: string | null;
  createdBy: string;
  frequency: string;
  weekday: number;
  weekOfMonth: number | null;
  timeMinutes: number;
  startsOn: Date;
  endsOn: Date | null;
};

/**
 * Cria as ocorrências que faltam de UMA regra, dentro do horizonte.
 *
 * Idempotente por construção: `skipDuplicates` somado à restrição única
 * (schedule_id, starts_at) faz a segunda passagem não criar nada. Isso
 * importa porque a geração roda todo dia — sem isso, uma semana de job
 * viraria sete missas empilhadas no mesmo horário.
 *
 * Nunca apaga nem altera ocorrência existente: se a secretaria ajustou o
 * horário de uma missa específica, ou se já há escala montada, mexer aqui
 * desfaria trabalho feito à mão.
 */
async function generateForSchedule(
  tx: Prisma.TransactionClient,
  schedule: ScheduleRow,
  agora: Date,
): Promise<number> {
  const ate = new Date(agora.getTime() + HORIZONTE_DIAS * 24 * 3_600_000);
  const instantes = occurrencesBetween(toRule(schedule), agora, ate);
  if (instantes.length === 0) return 0;

  const { count } = await tx.celebration.createMany({
    data: instantes.map((startsAt) => ({
      parishId: schedule.parishId,
      type: schedule.type as never,
      title: schedule.title,
      startsAt,
      location: schedule.location,
      priestProfileId: schedule.priestProfileId,
      scheduleId: schedule.id,
      createdBy: schedule.createdBy,
    })),
    skipDuplicates: true,
  });

  return count;
}

export async function createCelebrationSchedule(
  input: CreateCelebrationScheduleInput & { parishId: string; createdBy: string },
) {
  return withTenantContext(input.parishId, async (tx) => {
    // Barra a regra repetida. Sem isso, cadastrar "domingo 19h" duas vezes
    // faz a MESMA missa aparecer duplicada na agenda do fiel — as duas
    // regras geram ocorrências distintas no mesmo horário, e a restrição
    // única (schedule_id, starts_at) não pega, porque os schedule_id
    // diferem. Quem vê a agenda não entende o que aconteceu.
    const igual = await tx.celebrationSchedule.findFirst({
      where: {
        parishId: input.parishId,
        active: true,
        type: input.type,
        frequency: input.frequency,
        weekday: input.weekday,
        weekOfMonth: input.frequency === "mensal" ? (input.weekOfMonth ?? 1) : null,
        timeMinutes: input.timeMinutes,
      },
    });
    if (igual) {
      throw new ValidationError(
        "Já existe uma repetição igual nesse dia e horário. Encerre a anterior antes de criar outra.",
      );
    }

    const schedule = await tx.celebrationSchedule.create({
      data: {
        parishId: input.parishId,
        type: input.type,
        title: input.title || null,
        location: input.location || null,
        priestProfileId: input.priestProfileId || null,
        frequency: input.frequency,
        weekday: input.weekday,
        weekOfMonth: input.frequency === "mensal" ? (input.weekOfMonth ?? 1) : null,
        timeMinutes: input.timeMinutes,
        startsOn: input.startsOn,
        endsOn: input.endsOn ?? null,
        createdBy: input.createdBy,
      },
    });

    // Gera na hora, para a secretaria ver o resultado imediatamente em vez
    // de esperar o job da madrugada e achar que não funcionou.
    const criadas = await generateForSchedule(tx, schedule, new Date());
    return { schedule, criadas };
  });
}

export function listCelebrationSchedules(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.celebrationSchedule.findMany({
      where: { parishId },
      orderBy: [{ active: "desc" }, { weekday: "asc" }, { timeMinutes: "asc" }],
      include: { priestProfile: { include: { user: { select: { fullName: true } } } } },
    }),
  );
}

/**
 * Desativa a regra e remove as ocorrências FUTURAS que ninguém tocou.
 *
 * "Que ninguém tocou" é a parte que importa: ocorrência com escala montada
 * ou presença registrada fica de pé. Apagar levaria a escala junto (a FK é
 * Cascade) e o registro de quem participou perderia o vínculo — trabalho de
 * gente desfeito por uma mudança de configuração.
 */
/**
 * Corrige uma repetição já cadastrada.
 *
 * Existia só "encerrar", o que obrigava a apagar e recriar por causa de um
 * erro de digitação — e apagar leva junto escala e participação já
 * registradas.
 *
 * O título e o local ficam COPIADOS em cada missa gerada, então corrigir a
 * regra tem que corrigir as ocorrências futuras: senão o erro continua na
 * agenda de quem lê.
 *
 * Se o dia ou o horário mudarem, as ocorrências futuras não correspondem
 * mais e são refeitas. As que já têm escala ou participação são preservadas
 * no horário antigo — apagá-las perderia trabalho de gente — e a função
 * devolve quantas ficaram, para a secretaria decidir o que fazer com elas.
 */
export async function updateCelebrationSchedule(
  parishId: string,
  scheduleId: string,
  input: CreateCelebrationScheduleInput,
) {
  return withTenantContext(parishId, async (tx) => {
    const atual = await tx.celebrationSchedule.findFirst({ where: { id: scheduleId, parishId } });
    if (!atual) throw new ValidationError("Repetição não encontrada.");

    const weekOfMonth = input.frequency === "mensal" ? (input.weekOfMonth ?? 1) : null;

    const mudouOHorario =
      atual.frequency !== input.frequency ||
      atual.weekday !== input.weekday ||
      atual.weekOfMonth !== weekOfMonth ||
      atual.timeMinutes !== input.timeMinutes ||
      atual.startsOn.getTime() !== input.startsOn.getTime() ||
      (atual.endsOn?.getTime() ?? null) !== (input.endsOn?.getTime() ?? null);

    // A barreira de duplicata só vale quando o dia ou o horário mudam.
    // Numa correção de texto a duplicata, se existir, já existia antes — e
    // bloquear a correção deixaria a paróquia presa ao erro de digitação,
    // sem nenhum ganho.
    if (mudouOHorario) {
      const igual = await tx.celebrationSchedule.findFirst({
        where: {
          parishId,
          active: true,
          id: { not: scheduleId },
          type: input.type,
          frequency: input.frequency,
          weekday: input.weekday,
          weekOfMonth,
          timeMinutes: input.timeMinutes,
        },
      });
      if (igual) {
        throw new ValidationError(
          "Já existe outra repetição nesse dia e horário. Encerre uma delas antes.",
        );
      }
    }

    const schedule = await tx.celebrationSchedule.update({
      where: { id: scheduleId },
      data: {
        type: input.type,
        title: input.title || null,
        location: input.location || null,
        priestProfileId: input.priestProfileId || null,
        frequency: input.frequency,
        weekday: input.weekday,
        weekOfMonth,
        timeMinutes: input.timeMinutes,
        startsOn: input.startsOn,
        endsOn: input.endsOn ?? null,
      },
    });

    const agora = new Date();

    if (!mudouOHorario) {
      // Só mudou a descrição: as ocorrências ficam onde estão e recebem o
      // texto corrigido.
      const { count } = await tx.celebration.updateMany({
        where: { parishId, scheduleId, startsAt: { gte: agora } },
        data: {
          type: input.type,
          title: input.title || null,
          location: input.location || null,
          priestProfileId: input.priestProfileId || null,
        },
      });
      return { schedule, atualizadas: count, criadas: 0, mantidasNoHorarioAntigo: 0 };
    }

    await tx.celebration.deleteMany({
      where: {
        parishId,
        scheduleId,
        startsAt: { gte: agora },
        liturgicalSchedules: { none: {} },
        massParticipations: { none: {} },
      },
    });

    const mantidasNoHorarioAntigo = await tx.celebration.count({
      where: { parishId, scheduleId, startsAt: { gte: agora } },
    });

    const criadas = await generateForSchedule(tx, schedule, agora);
    return { schedule, atualizadas: 0, criadas, mantidasNoHorarioAntigo };
  });
}

export async function deactivateCelebrationSchedule(parishId: string, scheduleId: string) {
  return withTenantContext(parishId, async (tx) => {
    const schedule = await tx.celebrationSchedule.findFirst({ where: { id: scheduleId, parishId } });
    if (!schedule) throw new ValidationError("Repetição não encontrada.");

    await tx.celebrationSchedule.update({ where: { id: scheduleId }, data: { active: false } });

    const { count } = await tx.celebration.deleteMany({
      where: {
        parishId,
        scheduleId,
        startsAt: { gte: new Date() },
        liturgicalSchedules: { none: {} },
        massParticipations: { none: {} },
      },
    });

    const mantidas = await tx.celebration.count({
      where: { parishId, scheduleId, startsAt: { gte: new Date() } },
    });

    return { removidas: count, mantidas };
  });
}

/**
 * Lista para o painel: inclui as CANCELADAS, ao contrário da agenda pública.
 * Quem administra precisa enxergar o que cancelou para poder reabrir.
 */
/**
 * As próximas celebrações do painel, opcionalmente de um tipo só.
 *
 * O filtro vai ao BANCO, e não à lista já carregada: a consulta traz as
 * trinta próximas, e filtrar essas trinta diria "nenhum batizado" só porque
 * o batizado é o quadragésimo. Assim "Batizado" traz os trinta próximos
 * batizados, que é o que a pergunta quer dizer.
 */
export function listCelebrationsForAdmin(
  parishId: string,
  limit = 30,
  tipo?: CelebrationType | null,
) {
  return withTenantContext(parishId, (tx) =>
    tx.celebration.findMany({
      where: { parishId, startsAt: { gte: new Date() }, ...(tipo ? { type: tipo } : {}) },
      orderBy: { startsAt: "asc" },
      take: limit,
      include: {
        priestProfile: { include: { user: { select: { fullName: true } } } },
        schedule: { select: { id: true } },
        _count: { select: { liturgicalSchedules: true } },
      },
    }),
  );
}

/** Cancelar/reabrir UMA ocorrência — a missa que não vai ter neste feriado. */
export function setCelebrationCanceled(parishId: string, celebrationId: string, canceled: boolean) {
  return withTenantContext(parishId, (tx) =>
    tx.celebration.updateMany({
      where: { id: celebrationId, parishId },
      data: { canceledAt: canceled ? new Date() : null },
    }),
  );
}

/**
 * Repõe o horizonte de todas as paróquias. Roda no job diário.
 *
 * Percorre paróquia por paróquia dentro do contexto de cada uma, em vez de
 * uma consulta global com bypass: o job é global, mas nenhuma leitura
 * atravessa o isolamento entre paróquias.
 */
export async function generateAllUpcomingOccurrences(agora = new Date()): Promise<{
  paroquias: number;
  criadas: number;
}> {
  const parishIds = await withPlatformContext(async (tx) => {
    const rows = await tx.celebrationSchedule.findMany({
      where: { active: true },
      select: { parishId: true },
      distinct: ["parishId"],
    });
    return rows.map((r) => r.parishId);
  });

  let criadas = 0;
  for (const parishId of parishIds) {
    criadas += await withTenantContext(parishId, async (tx) => {
      const schedules = await tx.celebrationSchedule.findMany({
        where: { parishId, active: true },
      });
      let total = 0;
      for (const schedule of schedules) {
        total += await generateForSchedule(tx, schedule, agora);
      }
      return total;
    });
  }

  return { paroquias: parishIds.length, criadas };
}

/**
 * As celebrações de um mês inteiro — inclusive as que já passaram.
 *
 * A agenda por mês olha para trás e para a frente: quem abre "setembro" no
 * dia 20 quer o mês, e não os dez dias que sobraram. É a diferença entre um
 * calendário e uma fila.
 *
 * A janela é em horário de Brasília e vai da meia-noite do dia 1 até a
 * meia-noite do dia 1 do mês seguinte. Montá-la com `new Date(ano, mes)`
 * usaria o fuso de quem executa — e em produção quem executa é UTC.
 */
export function listCelebrationsInMonth(parishId: string, ano: number, mes: number) {
  const de = brasiliaWallClockToUtc(ano, mes - 1, 1, 0);
  const ate = brasiliaWallClockToUtc(mes === 12 ? ano + 1 : ano, mes === 12 ? 0 : mes, 1, 0);

  return withTenantContext(parishId, (tx) =>
    tx.celebration.findMany({
      where: { parishId, startsAt: { gte: de, lt: ate }, canceledAt: null },
      orderBy: { startsAt: "asc" },
      include: { priestProfile: { include: { user: { select: { fullName: true } } } } },
    }),
  );
}
