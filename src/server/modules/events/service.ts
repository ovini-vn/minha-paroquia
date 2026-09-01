import { withTenantContext } from "@/server/db/tenant-context";
import { brasiliaWallClockToUtc, hojeEmBrasilia } from "@/lib/brasilia";
import type { CreateEventInput, UpdateEventInput } from "./schema";

export function createEvent(input: CreateEventInput & { parishId: string; createdBy: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.event.create({
      data: {
        parishId: input.parishId,
        title: input.title,
        categoria: input.categoria,
        description: input.description || null,
        startsAt: input.startsAt,
        location: input.location || null,
        imageUrl: input.imageUrl || null,
        createdBy: input.createdBy,
      },
    }),
  );
}

export function listUpcomingEvents(parishId: string, limit = 10) {
  return withTenantContext(parishId, (tx) =>
    tx.event.findMany({
      where: { parishId, startsAt: { gte: new Date() }, status: "published" },
      orderBy: { startsAt: "asc" },
      take: limit,
    }),
  );
}

/** Inclui arquivados — tela de gestão do painel, não a agenda pública. */
export type PeriodoDeEventos = "proximos" | "mes" | "passados" | "todos";

/**
 * Os eventos do painel, por período.
 *
 * A ORDEM MUDA COM O PERÍODO, de propósito: "próximos" se lê para a frente,
 * do mais perto ao mais distante; "passados" se lê para trás, do mais
 * recente ao mais antigo. Uma ordem só para os dois deixaria um deles
 * começando pelo item mais irrelevante.
 *
 * O padrão é "próximos". Antes a tela trazia os 196 em ordem decrescente, o
 * que fazia a secretaria abrir em dezembro e caminhar para o passado para
 * chegar ao que vem esta semana.
 */
export function listAllEvents(parishId: string, periodo: PeriodoDeEventos = "proximos") {
  const agora = new Date();

  const janelaDoMes = () => {
    const hoje = hojeEmBrasilia();
    const ano = Number(hoje.slice(0, 4));
    const mes = Number(hoje.slice(5, 7));
    return {
      gte: brasiliaWallClockToUtc(ano, mes - 1, 1, 0),
      lt: brasiliaWallClockToUtc(mes === 12 ? ano + 1 : ano, mes === 12 ? 0 : mes, 1, 0),
    };
  };

  const where =
    periodo === "proximos"
      ? { parishId, startsAt: { gte: agora } }
      : periodo === "passados"
        ? { parishId, startsAt: { lt: agora } }
        : periodo === "mes"
          ? { parishId, startsAt: janelaDoMes() }
          : { parishId };

  return withTenantContext(parishId, (tx) =>
    tx.event.findMany({
      where,
      orderBy: { startsAt: periodo === "proximos" || periodo === "mes" ? "asc" : "desc" },
    }),
  );
}

export function getEvent(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) => tx.event.findFirst({ where: { id, parishId } }));
}

export function updateEvent(parishId: string, id: string, input: UpdateEventInput) {
  return withTenantContext(parishId, (tx) =>
    tx.event.updateMany({
      where: { id, parishId },
      data: {
        title: input.title,
        description: input.description || null,
        startsAt: input.startsAt,
        location: input.location || null,
        imageUrl: input.imageUrl || null,
      },
    }),
  );
}

export function setEventStatus(parishId: string, id: string, status: "published" | "archived") {
  return withTenantContext(parishId, (tx) => tx.event.updateMany({ where: { id, parishId }, data: { status } }));
}

/**
 * Apaga de vez. Arquivar serve para evento que passou; apagar é para
 * duplicata e teste.
 *
 * O cartaz enviado permanece no armazenamento de imagens: apagar o arquivo
 * exigiria saber que nenhuma outra tela o usa, e imagem órfã custa menos
 * que imagem que some de onde ainda aparecia.
 */
export function deleteEvent(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) =>
    tx.event.deleteMany({ where: { id, parishId } }),
  );
}

/** Os eventos de um mês inteiro. Ver `listCelebrationsInMonth` sobre o fuso. */
export function listEventsInMonth(parishId: string, ano: number, mes: number) {
  const de = brasiliaWallClockToUtc(ano, mes - 1, 1, 0);
  const ate = brasiliaWallClockToUtc(mes === 12 ? ano + 1 : ano, mes === 12 ? 0 : mes, 1, 0);

  return withTenantContext(parishId, (tx) =>
    tx.event.findMany({
      where: { parishId, startsAt: { gte: de, lt: ate }, status: "published" },
      orderBy: { startsAt: "asc" },
    }),
  );
}
