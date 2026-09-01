import { withTenantContext } from "@/server/db/tenant-context";
import { brasiliaWallClockToUtc } from "@/lib/brasilia";
import type { CreateEventInput, UpdateEventInput } from "./schema";

export function createEvent(input: CreateEventInput & { parishId: string; createdBy: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.event.create({
      data: {
        parishId: input.parishId,
        title: input.title,
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
export function listAllEvents(parishId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.event.findMany({ where: { parishId }, orderBy: { startsAt: "desc" } }),
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
