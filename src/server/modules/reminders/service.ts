import "server-only";
import { prisma } from "@/server/db/prisma";
import { withTenantContext } from "@/server/db/tenant-context";
import { notifyUser, registrarEnvio } from "@/server/modules/notifications/service";
import { sendToUser } from "@/server/modules/push/service";
import { LITURGICAL_ROLE_LABELS } from "@/lib/liturgia-labels";
import { diaEmBrasilia } from "@/lib/brasilia";
import { nomeDoSacerdote } from "@/lib/sacerdote";

/**
 * Lembretes dos compromissos assumidos — o que a pessoa se comprometeu a
 * fazer pela comunidade.
 *
 * Três origens, que são os três jeitos de se comprometer no app:
 *   1. escala litúrgica (leitura, canto, acolhida...) numa celebração;
 *   2. interesse manifestado numa oportunidade de serviço com data;
 *   3. atendimento pastoral confirmado com um sacerdote.
 *
 * Cada paróquia é lida no SEU contexto de tenant — o job é global, mas
 * nenhuma consulta atravessa o isolamento. Mesmo racional do painel
 * diocesano (ver modules/dioceses/service.ts).
 */

export type Commitment = {
  userId: string;
  parishId: string;
  /** "hoje" ou "amanhã" — muda o texto do aviso. */
  when: "hoje" | "amanha";
  at: Date;
  title: string;
  body: string;
  url: string;
  /** Estável por compromisso: evita empilhar avisos repetidos no aparelho. */
  tag: string;
};

const HORA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Janela do dia D em horário de Brasília, expressa em UTC.
 *
 * Sem isso, "compromissos de amanhã" usaria a meia-noite UTC — que é 21h de
 * hoje em Brasília — e uma missa das 19h cairia no dia errado.
 */
function brasiliaDayRange(reference: Date, offsetDays: number): { from: Date; to: Date } {
  const BRASILIA_OFFSET_HOURS = 3; // UTC-3, sem horário de verão desde 2019
  const local = new Date(reference.getTime() - BRASILIA_OFFSET_HOURS * 3_600_000);
  const dayStartLocal = startOfDayUtc(local);
  const from = new Date(dayStartLocal.getTime() + (offsetDays * 24 + BRASILIA_OFFSET_HOURS) * 3_600_000);
  return { from, to: new Date(from.getTime() + 24 * 3_600_000) };
}

async function commitmentsForParish(
  parishId: string,
  when: "hoje" | "amanha",
  from: Date,
  to: Date,
): Promise<Commitment[]> {
  return withTenantContext(parishId, async (tx) => {
    const [escalas, interesses, atendimentos] = await Promise.all([
      tx.liturgicalSchedule.findMany({
        where: { parishId, celebration: { startsAt: { gte: from, lt: to } } },
        include: { celebration: true },
      }),
      tx.serviceInterest.findMany({
        where: {
          parishId,
          status: { not: "declinado" },
          opportunity: { startsAt: { gte: from, lt: to }, status: "aberta" },
        },
        include: { opportunity: true },
      }),
      tx.appointment.findMany({
        where: { parishId, status: "confirmado", scheduledAt: { gte: from, lt: to } },
        include: { priestProfile: { include: { user: { select: { fullName: true } } } } },
      }),
    ]);

    const quando = when === "hoje" ? "hoje" : "amanhã";

    const deEscala: Commitment[] = escalas.map((e) => ({
      userId: e.userId,
      parishId,
      when,
      at: e.celebration.startsAt,
      title: `Você serve ${quando} na liturgia`,
      body: `${LITURGICAL_ROLE_LABELS[e.roleType]} · ${HORA.format(e.celebration.startsAt)}${
        e.celebration.location ? ` · ${e.celebration.location}` : ""
      }`,
      url: "/servir/liturgia",
      tag: `escala-${e.id}`,
    }));

    const deServico: Commitment[] = interesses
      .filter((i) => i.opportunity.startsAt !== null)
      .map((i) => ({
        userId: i.userId,
        parishId,
        when,
        at: i.opportunity.startsAt!,
        title: `Você se ofereceu para ajudar ${quando}`,
        body: `${i.opportunity.title} · ${HORA.format(i.opportunity.startsAt!)}`,
        url: "/servir",
        tag: `servico-${i.id}`,
      }));

    const deAtendimento: Commitment[] = atendimentos.map((a) => ({
      userId: a.fielUserId,
      parishId,
      when,
      at: a.scheduledAt,
      title: `Seu atendimento é ${quando}`,
      body: `${nomeDoSacerdote(a.priestProfile)} · ${HORA.format(a.scheduledAt)}`,
      url: "/eu/atendimentos",
      tag: `atendimento-${a.id}`,
    }));

    return [...deEscala, ...deServico, ...deAtendimento];
  });
}

/** Todos os compromissos de hoje e de amanhã, em todas as paróquias. */
export async function collectCommitments(reference: Date): Promise<Commitment[]> {
  const parishes = await prisma.parish.findMany({ select: { id: true } });

  const porDia = await Promise.all(
    (["hoje", "amanha"] as const).flatMap((when) => {
      const { from, to } = brasiliaDayRange(reference, when === "hoje" ? 0 : 1);
      return parishes.map((p) => commitmentsForParish(p.id, when, from, to));
    }),
  );

  return porDia.flat();
}

export type ReminderResult = {
  compromissos: number;
  avisosNoApp: number;
  pushEnviados: number;
  /** Compromissos cujo lembrete de hoje já tinha saído. */
  repetidos: number;
};

/**
 * Cria o aviso dentro do app E dispara o push. Os dois, de propósito: o
 * push pode não chegar (permissão negada, aparelho sem rede, iPhone sem o
 * site na Tela de Início) e nesse caso o aviso ainda espera a pessoa
 * dentro do app.
 *
 * Cada compromisso rende no máximo um lembrete "hoje" e um "amanhã", mesmo
 * que o robô rode de novo: a chave carimba usuário, compromisso, qual dos
 * dois avisos e o dia. Sem isso, uma repetição do cron acorda a pessoa duas
 * vezes com a mesma missa.
 */
export async function sendCommitmentReminders(reference: Date): Promise<ReminderResult> {
  const compromissos = await collectCommitments(reference);
  const dia = diaEmBrasilia(reference);
  let avisosNoApp = 0;
  let pushEnviados = 0;
  let repetidos = 0;

  for (const c of compromissos) {
    const chave = `lembrete:${c.userId}:${c.tag}:${c.when}:${dia}`;

    const enviar = await withTenantContext(c.parishId, async (tx) => {
      if (!(await registrarEnvio(tx, c.parishId, chave))) return false;
      await notifyUser(tx, {
        parishId: c.parishId,
        userId: c.userId,
        category: "pessoal",
        // O destino é o do próprio compromisso: escala vai para a liturgia,
        // mutirão para Servir, atendimento para os atendimentos.
        linkPath: c.url,
        title: c.title,
        body: c.body,
      });
      return true;
    });

    if (!enviar) {
      repetidos += 1;
      continue;
    }
    avisosNoApp += 1;

    pushEnviados += await sendToUser(c.userId, {
      title: c.title,
      body: c.body,
      url: c.url,
      tag: c.tag,
    });
  }

  return { compromissos: compromissos.length, avisosNoApp, pushEnviados, repetidos };
}
