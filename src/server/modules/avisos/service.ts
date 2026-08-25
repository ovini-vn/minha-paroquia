import { withTenantContext } from "@/server/db/tenant-context";
import { notifyManyUsers } from "@/server/modules/notifications/service";
import { sendToUsers } from "@/server/modules/push/service";
import type { CreateAvisoInput, UpdateAvisoInput } from "./schema";

/** O aviso inteiro não cabe numa notificação; o começo dele, sim. */
function resumir(texto: string, limite = 140): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite - 1).trimEnd()}…`;
}

/**
 * Publica um aviso e AVISA as pessoas.
 *
 * Antes não avisava ninguém: o conteúdo mais sensível ao tempo que a
 * paróquia produz — "neste domingo a missa das 19h será às 18h" — dependia
 * de alguém abrir o app por acaso e ver.
 *
 * Categoria `urgente`, e não `espiritual` como a Palavra do Padre: são
 * coisas diferentes, e quem silenciou uma não deve perder a outra.
 *
 * A notificação carrega o TÍTULO e o começo do texto, não um "confira no
 * app". Um aviso que não diz o que aconteceu obriga a pessoa a abrir para
 * descobrir se era importante — e é a mesma inércia que o aviso existe
 * para vencer.
 *
 * Só na criação. Corrigir um erro de digitação depois não avisa de novo.
 */
export async function createAviso(input: CreateAvisoInput & { parishId: string; createdBy: string }) {
  const { aviso, destinatarios } = await withTenantContext(input.parishId, async (tx) => {
    const aviso = await tx.aviso.create({
      data: { parishId: input.parishId, title: input.title, body: input.body, createdBy: input.createdBy },
    });

    const membros = await tx.parishMembership.findMany({
      where: { parishId: input.parishId, status: "active", userId: { not: input.createdBy } },
      select: { userId: true },
    });
    const destinatarios = membros.map((m) => m.userId);

    await notifyManyUsers(
      tx,
      input.parishId,
      destinatarios,
      "urgente",
      aviso.title,
      resumir(aviso.body),
    );

    return { aviso, destinatarios };
  });

  // Fora da transação: push é rede, e prender a gravação do aviso enquanto
  // se fala com o serviço de notificação seria trocar uma coisa garantida
  // por uma incerta. Falha aqui não desfaz a publicação — o aviso já está
  // no app de todo mundo.
  try {
    await sendToUsers(destinatarios, {
      title: aviso.title,
      body: resumir(aviso.body),
      url: "/comunidade",
      tag: `aviso-${aviso.id}`,
    });
  } catch (error) {
    console.error("Aviso publicado, mas o push falhou:", error);
  }

  return aviso;
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

/**
 * Apaga de vez.
 *
 * Arquivar tira da vista do fiel e serve para aviso que cumpriu seu papel;
 * apagar é para o que nunca deveria ter existido — duplicata, teste, texto
 * errado publicado por engano.
 *
 * A notificação já enviada COPIA título e texto, então ela sobrevive: quem
 * recebeu continua vendo o que recebeu, e o histórico não some por baixo.
 */
export function deleteAviso(parishId: string, id: string) {
  return withTenantContext(parishId, (tx) =>
    tx.aviso.deleteMany({ where: { id, parishId } }),
  );
}
