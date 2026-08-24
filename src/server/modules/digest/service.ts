import "server-only";
import { withTenantContext, withPlatformContext } from "@/server/db/tenant-context";
import { notifyManyUsers } from "@/server/modules/notifications/service";
import { sendToUsers } from "@/server/modules/push/service";
import { brasiliaParts, formatMinutes } from "@/lib/brasilia";

/**
 * "Esta semana na sua paróquia" — o único aviso que alcança QUEM NÃO SERVE.
 *
 * Todo o resto das notificações depende de a pessoa ter um compromisso:
 * escala, mutirão, atendimento. Quem apenas vai à missa aos domingos nunca
 * recebia nada, e é a maioria da comunidade. Era o terceiro achado da
 * análise da trilha de uso.
 */

/** Sábado. O resumo cobre a semana que vem, incluindo a missa de domingo. */
export const DIA_DO_RESUMO = 6;

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"] as const;

export type ResumoDaSemana = {
  parishId: string;
  parishName: string;
  celebracoes: number;
  eventos: number;
  linhas: string[];
};

function rotuloDeQuando(instante: Date, agora: Date): string {
  const d = brasiliaParts(instante);
  const hoje = brasiliaParts(agora);
  const mesmoDia = d.year === hoje.year && d.month === hoje.month && d.day === hoje.day;
  const amanha = new Date(agora.getTime() + 24 * 3_600_000);
  const a = brasiliaParts(amanha);
  const ehAmanha = d.year === a.year && d.month === a.month && d.day === a.day;

  const hora = formatMinutes(d.minutes);
  if (mesmoDia) return `hoje ${hora}`;
  if (ehAmanha) return `amanhã ${hora}`;
  return `${DIAS[d.weekday]} ${d.day}/${String(d.month + 1).padStart(2, "0")} ${hora}`;
}

/**
 * Monta o resumo de uma paróquia. Devolve null quando não há NADA a dizer.
 *
 * Mandar "nada esta semana" é pior do que não mandar: ensina a pessoa que a
 * notificação daqui não vale a pena abrir, e a próxima, que importa, já
 * chega desacreditada.
 */
export async function montarResumo(parishId: string, agora: Date): Promise<ResumoDaSemana | null> {
  const ate = new Date(agora.getTime() + 7 * 24 * 3_600_000);

  return withTenantContext(parishId, async (tx) => {
    const parish = await tx.parish.findUnique({ where: { id: parishId }, select: { name: true } });
    if (!parish) return null;

    const [celebracoes, eventos] = await Promise.all([
      tx.celebration.findMany({
        where: { parishId, canceledAt: null, startsAt: { gte: agora, lt: ate } },
        orderBy: { startsAt: "asc" },
        select: { title: true, type: true, startsAt: true, location: true },
      }),
      tx.event.findMany({
        where: { parishId, status: "published", startsAt: { gte: agora, lt: ate } },
        orderBy: { startsAt: "asc" },
        select: { title: true, startsAt: true },
      }),
    ]);

    if (celebracoes.length === 0 && eventos.length === 0) return null;

    // Três linhas no máximo: o resumo é uma notificação, não uma agenda.
    // Quem quiser a lista inteira abre a Agenda — o toque leva para lá.
    const linhas: string[] = [];
    for (const c of celebracoes.slice(0, 2)) {
      const nome = c.title || (c.type === "missa" ? "Missa" : "Celebração");
      linhas.push(`${nome}, ${rotuloDeQuando(c.startsAt, agora)}`);
    }
    for (const e of eventos.slice(0, 1)) {
      linhas.push(`${e.title}, ${rotuloDeQuando(e.startsAt, agora)}`);
    }

    return {
      parishId,
      parishName: parish.name,
      celebracoes: celebracoes.length,
      eventos: eventos.length,
      linhas,
    };
  });
}

function textoDoResumo(resumo: ResumoDaSemana): string {
  const partes: string[] = [];
  if (resumo.celebracoes > 0) {
    partes.push(
      resumo.celebracoes === 1 ? "1 celebração" : `${resumo.celebracoes} celebrações`,
    );
  }
  if (resumo.eventos > 0) {
    partes.push(resumo.eventos === 1 ? "1 evento" : `${resumo.eventos} eventos`);
  }
  return `${partes.join(" e ")}. ${resumo.linhas.join(" · ")}`;
}

export type ResultadoDoResumo = { paroquias: number; pessoas: number; pulou: number };

/**
 * Envia o resumo semanal de todas as paróquias.
 *
 * Percorre paróquia por paróquia dentro do contexto de cada uma: o job é
 * global, mas nenhuma leitura atravessa o isolamento entre paróquias.
 */
export async function enviarResumoSemanal(agora: Date): Promise<ResultadoDoResumo> {
  const parishIds = await withPlatformContext(async (tx) => {
    const rows = await tx.parish.findMany({ select: { id: true } });
    return rows.map((r) => r.id);
  });

  let pessoas = 0;
  let paroquias = 0;
  let pulou = 0;

  for (const parishId of parishIds) {
    const resumo = await montarResumo(parishId, agora);
    if (!resumo) {
      pulou += 1;
      continue;
    }

    const corpo = textoDoResumo(resumo);
    const titulo = "Esta semana na sua paróquia";

    const destinatarios = await withTenantContext(parishId, async (tx) => {
      const membros = await tx.parishMembership.findMany({
        where: { parishId, status: "active" },
        select: { userId: true },
      });
      const ids = membros.map((m) => m.userId);
      await notifyManyUsers(tx, parishId, ids, "pastoral", titulo, corpo);
      return ids;
    });

    // Push fora do contexto de tenant e tolerante a falha: o aviso já está
    // no app de todo mundo, e uma paróquia com problema de push não pode
    // impedir as seguintes de receber.
    try {
      await sendToUsers(destinatarios, { title: titulo, body: corpo, url: "/agenda", tag: "resumo-semanal" });
    } catch (error) {
      console.error(`Resumo semanal enviado, mas o push falhou (${parishId}):`, error);
    }

    paroquias += 1;
    pessoas += destinatarios.length;
  }

  return { paroquias, pessoas, pulou };
}

/** É dia de mandar o resumo? Decidido em Brasília, não em UTC. */
export function ehDiaDoResumo(agora: Date): boolean {
  return brasiliaParts(agora).weekday === DIA_DO_RESUMO;
}
