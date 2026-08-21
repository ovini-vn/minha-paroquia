import "server-only";
import { prisma } from "@/server/db/prisma";
import { withTenantContext } from "@/server/db/tenant-context";
import { notifyUser } from "@/server/modules/notifications/service";
import { sendToUser } from "@/server/modules/push/service";
import { LITURGICAL_ROLE_LABELS } from "@/lib/liturgia-labels";

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
      body: `${a.priestProfile.user.fullName} · ${HORA.format(a.scheduledAt)}`,
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
};

/**
 * Cria o aviso dentro do app E dispara o push. Os dois, de propósito: o
 * push pode não chegar (permissão negada, aparelho sem rede, iPhone sem o
 * site na Tela de Início) e nesse caso o aviso ainda espera a pessoa
 * dentro do app.
 */
export async function sendCommitmentReminders(reference: Date): Promise<ReminderResult> {
  const compromissos = await collectCommitments(reference);
  let avisosNoApp = 0;
  let pushEnviados = 0;

  for (const c of compromissos) {
    await withTenantContext(c.parishId, async (tx) => {
      await notifyUser(tx, {
        parishId: c.parishId,
        userId: c.userId,
        category: "pessoal",
        title: c.title,
        body: c.body,
      });
    });
    avisosNoApp += 1;

    pushEnviados += await sendToUser(c.userId, {
      title: c.title,
      body: c.body,
      url: c.url,
      tag: c.tag,
    });
  }

  return { compromissos: compromissos.length, avisosNoApp, pushEnviados };
}
