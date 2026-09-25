import "server-only";
import { withTenantContext } from "@/server/db/tenant-context";
import { ValidationError } from "@/server/shared/errors";
import { LITURGICAL_ROLE_LABELS } from "@/lib/liturgia-labels";
import { nomeDoSacerdote } from "@/lib/sacerdote";
import { diaDoBanco, paraOBanco } from "@/lib/grupos/cronograma";

/**
 * Os compromissos de uma pessoa, numa lista só.
 *
 * Fase 2 da revisão de 25/09/2026. A escala da missa estava em Servir, o
 * encontro do grupo no Início, o mutirão em Servir de novo, o atendimento
 * em Eu — e ninguém via a própria semana inteira. Quem serve em duas
 * frentes descobria o choque de horário no domingo.
 */

export type Compromisso = {
  chave: string;
  tipo: "escala" | "encontro" | "tarefa" | "mutirao" | "atendimento";
  /** Instante, quando há hora; ou só o dia (encontros e tarefas). */
  quando: Date;
  semHora: boolean;
  titulo: string;
  detalhe: string;
  href: string;
  /** Encontros: a resposta da pessoa, se já respondeu. */
  encontroId?: string;
  vai?: boolean | null;
};

export async function meusCompromissos(parishId: string, userId: string, agora: Date): Promise<Compromisso[]> {
  const hoje = paraOBanco(diaDoBanco(new Date(agora.getTime() - 3 * 3_600_000)));

  return withTenantContext(parishId, async (tx) => {
    const [escalas, grupos, tarefas, interesses, atendimentos] = await Promise.all([
      tx.liturgicalSchedule.findMany({
        where: { parishId, userId, celebration: { startsAt: { gte: agora } } },
        include: { celebration: { select: { startsAt: true, title: true, location: true } } },
      }),
      tx.membroDoGrupo.findMany({
        where: { parishId, userId, group: { status: "ativa" } },
        select: {
          group: {
            select: {
              id: true,
              name: true,
              encontros: {
                where: { OR: [{ data: { gte: hoje } }, { dataFim: { gte: hoje } }] },
                orderBy: { data: "asc" },
                take: 4,
                select: {
                  id: true,
                  data: true,
                  tema: true,
                  pregador: true,
                  respostas: { where: { userId }, select: { vai: true } },
                },
              },
            },
          },
        },
      }),
      tx.tarefaDoEncontro.findMany({
        where: { parishId, responsavelId: userId, encontro: { data: { gte: hoje } } },
        include: { encontro: { select: { data: true, group: { select: { id: true, name: true } } } } },
      }),
      tx.serviceInterest.findMany({
        where: { parishId, userId, status: { not: "declinado" }, opportunity: { startsAt: { gte: agora }, status: "aberta" } },
        include: { opportunity: { select: { title: true, startsAt: true } } },
      }),
      tx.appointment.findMany({
        where: { parishId, fielUserId: userId, scheduledAt: { gte: agora }, status: { in: ["solicitado", "confirmado"] } },
        include: { priestProfile: { include: { user: { select: { fullName: true } } } } },
      }),
    ]);

    const lista: Compromisso[] = [
      ...escalas.map((e) => ({
        chave: `escala-${e.id}`,
        tipo: "escala" as const,
        quando: e.celebration.startsAt,
        semHora: false,
        titulo: `Servir: ${LITURGICAL_ROLE_LABELS[e.roleType]}`,
        detalhe: [e.celebration.title || "Missa", e.celebration.location].filter(Boolean).join(" · "),
        href: "/servir/liturgia",
      })),
      ...grupos.flatMap(({ group }) =>
        group.encontros
          .filter((enc) => enc.data)
          .map((enc) => ({
            chave: `encontro-${enc.id}`,
            tipo: "encontro" as const,
            quando: enc.data!,
            semHora: true,
            titulo: group.name,
            detalhe: [enc.tema, enc.pregador ? `Prega: ${enc.pregador}` : null].filter(Boolean).join(" · "),
            href: `/comunidade/pastorais/${group.id}`,
            encontroId: enc.id,
            vai: enc.respostas[0]?.vai ?? null,
          })),
      ),
      ...tarefas.map((t) => ({
        chave: `tarefa-${t.id}`,
        tipo: "tarefa" as const,
        quando: t.encontro.data!,
        semHora: true,
        titulo: `Você fica com: ${t.descricao}`,
        detalhe: t.encontro.group.name,
        href: `/comunidade/pastorais/${t.encontro.group.id}`,
      })),
      ...interesses.map((i) => ({
        chave: `mutirao-${i.id}`,
        tipo: "mutirao" as const,
        quando: i.opportunity.startsAt!,
        semHora: false,
        titulo: i.opportunity.title,
        detalhe: "Você se ofereceu para ajudar",
        href: "/servir",
      })),
      ...atendimentos.map((a) => ({
        chave: `atendimento-${a.id}`,
        tipo: "atendimento" as const,
        quando: a.scheduledAt,
        semHora: false,
        titulo: a.status === "confirmado" ? "Atendimento confirmado" : "Atendimento pedido",
        detalhe: nomeDoSacerdote(a.priestProfile),
        href: "/eu/atendimentos",
      })),
    ];

    return lista.sort((a, b) => a.quando.getTime() - b.quando.getTime());
  });
}

// ---- vou / não posso -------------------------------------------------------

/** Só quem é do grupo responde ao encontro dele. */
export async function responderEncontro(parishId: string, userId: string, encontroId: string, vai: boolean) {
  return withTenantContext(parishId, async (tx) => {
    const encontro = await tx.encontroDoGrupo.findFirst({ where: { id: encontroId, parishId }, select: { groupId: true } });
    if (!encontro) throw new ValidationError("Encontro não encontrado.");
    const membro = await tx.membroDoGrupo.findUnique({ where: { groupId_userId: { groupId: encontro.groupId, userId } } });
    if (!membro) throw new ValidationError("Só quem é do grupo responde aos encontros dele.");
    await tx.respostaAoEncontro.upsert({
      where: { encontroId_userId: { encontroId, userId } },
      update: { vai },
      create: { parishId, encontroId, userId, vai },
    });
    return encontro.groupId;
  });
}

/** Qualquer pessoa da paróquia responde a um evento dela. */
export async function responderEvento(parishId: string, userId: string, eventId: string, vai: boolean) {
  return withTenantContext(parishId, async (tx) => {
    const evento = await tx.event.findFirst({ where: { id: eventId, parishId }, select: { id: true } });
    if (!evento) throw new ValidationError("Evento não encontrado.");
    await tx.respostaAoEvento.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { vai },
      create: { parishId, eventId, userId, vai },
    });
  });
}

export type Contagem = { vao: number; naoPodem: number };

/** Quantos vão e quantos não podem, por encontro — para a coordenação. */
export async function respostasDosEncontros(parishId: string, encontroIds: string[]): Promise<Map<string, Contagem>> {
  const mapa = new Map<string, Contagem>();
  if (encontroIds.length === 0) return mapa;
  const linhas = await withTenantContext(parishId, (tx) =>
    tx.respostaAoEncontro.groupBy({
      by: ["encontroId", "vai"],
      where: { parishId, encontroId: { in: encontroIds } },
      _count: { _all: true },
    }),
  );
  for (const l of linhas) {
    const c = mapa.get(l.encontroId) ?? { vao: 0, naoPodem: 0 };
    if (l.vai) c.vao += l._count._all;
    else c.naoPodem += l._count._all;
    mapa.set(l.encontroId, c);
  }
  return mapa;
}

/** A resposta da pessoa e a contagem de cada evento, para a agenda. */
export async function respostasDosEventos(parishId: string, userId: string, eventIds: string[]) {
  if (eventIds.length === 0) return { minhas: new Map<string, boolean>(), contagens: new Map<string, Contagem>() };
  return withTenantContext(parishId, async (tx) => {
    const [minhas, todas] = await Promise.all([
      tx.respostaAoEvento.findMany({ where: { parishId, userId, eventId: { in: eventIds } }, select: { eventId: true, vai: true } }),
      tx.respostaAoEvento.groupBy({
        by: ["eventId", "vai"],
        where: { parishId, eventId: { in: eventIds } },
        _count: { _all: true },
      }),
    ]);
    const contagens = new Map<string, Contagem>();
    for (const l of todas) {
      const c = contagens.get(l.eventId) ?? { vao: 0, naoPodem: 0 };
      if (l.vai) c.vao += l._count._all;
      else c.naoPodem += l._count._all;
      contagens.set(l.eventId, c);
    }
    return { minhas: new Map(minhas.map((m) => [m.eventId, m.vai])), contagens };
  });
}

export async function minhaRespostaAoEncontro(parishId: string, userId: string, encontroId: string): Promise<boolean | null> {
  const r = await withTenantContext(parishId, (tx) =>
    tx.respostaAoEncontro.findUnique({ where: { encontroId_userId: { encontroId, userId } }, select: { vai: true } }),
  );
  return r?.vai ?? null;
}
