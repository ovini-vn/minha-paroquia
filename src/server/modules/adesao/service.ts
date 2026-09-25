import "server-only";
import { withTenantContext } from "@/server/db/tenant-context";

const DIA = 86_400_000;
const SEMANAS = 8;

/** Segunda-feira 00:00 UTC da semana de `d` — a semana da paróquia começa na segunda. */
export function inicioDaSemana(d: Date): Date {
  const dia = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const recuo = (dia.getUTCDay() + 6) % 7;
  return new Date(dia.getTime() - recuo * DIA);
}

/** As últimas `n` semanas, da mais antiga para a atual. */
export function semanas(agora: Date, n = SEMANAS): Date[] {
  const atual = inicioDaSemana(agora);
  return Array.from({ length: n }, (_, i) => new Date(atual.getTime() - (n - 1 - i) * 7 * DIA));
}

/** Mediana em horas; nula sem dados. */
export function medianaEmHoras(intervalosMs: number[]): number | null {
  if (intervalosMs.length === 0) return null;
  const ordenados = [...intervalosMs].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  const ms = ordenados.length % 2 ? ordenados[meio]! : (ordenados[meio - 1]! + ordenados[meio]!) / 2;
  return ms / 3_600_000;
}

export type Semana = { inicio: Date; valor: number; de?: number };

/**
 * As quatro perguntas do piloto, com número:
 *
 * 1. Quantos se cadastram, e quantos terminam as boas-vindas?
 * 2. Quem se oferece para uma pastoral é respondido? Em quanto tempo?
 * 3. As pessoas vão aos encontros? (semana a semana, pela chamada)
 * 4. Quantos fiéis têm ao menos um compromisso na comunidade?
 *
 * É o que responde se o app está fazendo mais gente participar — o
 * objetivo dele. Contagens, sem nome: ninguém é medido individualmente.
 */
export async function medidasDaAdesao(parishId: string, agora = new Date()) {
  const lista = semanas(agora);
  const desde = lista[0]!;

  return withTenantContext(parishId, async (tx) => {
    const [vinculos, interesses, presencas, membros, escalas, tarefas] = await Promise.all([
      tx.parishMembership.findMany({
        where: { parishId, status: "active" },
        select: { userId: true, joinedAt: true, user: { select: { onboardedAt: true } } },
      }),
      tx.pastoralGroupInterest.findMany({
        where: { parishId },
        select: { status: true, createdAt: true, respondidoEm: true },
      }),
      tx.presencaNoEncontro.findMany({
        where: { parishId, encontro: { data: { gte: desde } } },
        select: { presente: true, encontro: { select: { data: true } } },
      }),
      tx.membroDoGrupo.findMany({ where: { parishId, group: { status: "ativa" } }, select: { userId: true } }),
      tx.liturgicalSchedule.findMany({
        where: { parishId, celebration: { startsAt: { gte: agora, lte: new Date(agora.getTime() + 30 * DIA) } } },
        select: { userId: true },
      }),
      tx.tarefaDoEncontro.findMany({ where: { parishId, responsavelId: { not: null } }, select: { responsavelId: true } }),
    ]);

    // 1. Cadastros e boas-vindas
    const cadastrosPorSemana: Semana[] = lista.map((inicio) => ({
      inicio,
      valor: vinculos.filter((v) => v.joinedAt >= inicio && v.joinedAt.getTime() < inicio.getTime() + 7 * DIA).length,
    }));
    const concluiram = vinculos.filter((v) => v.user.onboardedAt !== null).length;

    // 2. Interesses respondidos
    const respondidos = interesses.filter((i) => i.status !== "manifestado");
    const esperando = interesses.filter((i) => i.status === "manifestado");
    const tempos = interesses
      .filter((i) => i.respondidoEm)
      .map((i) => i.respondidoEm!.getTime() - i.createdAt.getTime());
    const esperandoHaMaisDeUmaSemana = esperando.filter((i) => agora.getTime() - i.createdAt.getTime() > 7 * DIA).length;

    // 3. Presença nos encontros
    const presencaPorSemana: Semana[] = lista.map((inicio) => {
      const daSemana = presencas.filter(
        (p) => p.encontro.data && p.encontro.data >= inicio && p.encontro.data.getTime() < inicio.getTime() + 7 * DIA,
      );
      return { inicio, valor: daSemana.filter((p) => p.presente).length, de: daSemana.length };
    });

    // 4. Fiéis com ao menos um compromisso
    const ativos = new Set(vinculos.map((v) => v.userId));
    const comCompromisso = new Set(
      [...membros.map((m) => m.userId), ...escalas.map((e) => e.userId), ...tarefas.map((t) => t.responsavelId!)].filter(
        (id) => ativos.has(id),
      ),
    );

    return {
      fieis: vinculos.length,
      cadastrosPorSemana,
      concluiram,
      interesses: {
        total: interesses.length,
        respondidos: respondidos.length,
        esperando: esperando.length,
        esperandoHaMaisDeUmaSemana,
        medianaEmHoras: medianaEmHoras(tempos),
      },
      presencaPorSemana,
      comCompromisso: comCompromisso.size,
    };
  });
}
