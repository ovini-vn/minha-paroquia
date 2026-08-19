import { withTenantContext } from "@/server/db/tenant-context";
import type { CreateAvisoInput, UpdateAvisoInput } from "./schema";

export function createAviso(input: CreateAvisoInput & { parishId: string; createdBy: string }) {
  return withTenantContext(input.parishId, (tx) =>
    tx.aviso.create({
      data: { parishId: input.parishId, title: input.title, body: input.body, createdBy: input.createdBy },
    }),
  );
}

export function getAviso(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) => tx.aviso.findFirst({ where: { id, parishId } }));
}

export function updateAviso(parishId: string, id: string, input: UpdateAvisoInput) {
  return withTenantContext(parishId, (tx) =>
    tx.aviso.updateMany({ where: { id, parishId }, data: { title: input.title, body: input.body } }),
  );
}

export function setAvisoStatus(parishId: string, id: string, status: "published" | "archived") {
  return withTenantContext(parishId, (tx) => tx.aviso.updateMany({ where: { id, parishId }, data: { status } }));
}

/** Avisos publicados, mais recente primeiro — Home e Minha Comunidade. */
export function listPublishedAvisos(parishId: string, limit = 5) {
  return withTenantContext(parishId, (tx) =>
    tx.aviso.findMany({
      where: { parishId, status: "published" },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  );
}

/** Inclui arquivados — tela de gestão do painel. */
export function listAllAvisos(parishId: string) {
  return withTenantContext(parishId, (tx) => tx.aviso.findMany({ where: { parishId }, orderBy: { createdAt: "desc" } }));
}
