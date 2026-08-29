import type { NotificationCategory, Prisma } from "@prisma/client";
import { withTenantContext } from "@/server/db/tenant-context";
import { prisma } from "@/server/db/prisma";

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = ["urgente", "pessoal", "pastoral", "espiritual"];

type NotifyInput = {
  parishId: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** Tela do app onde o assunto vive — ver markNotificationsReadByPath. */
  linkPath?: string | null;
};

/**
 * Cria uma notificação dentro de uma transação já aberta por outro módulo
 * (ex.: confirmar um atendimento, escalar alguém na liturgia, publicar uma
 * palavra do padre) — ver docs/ARQUITETURA.md, seção D.2. Respeita a
 * preferência do usuário para a categoria; ausência de preferência = habilitado.
 */
export async function notifyUser(tx: Prisma.TransactionClient, input: NotifyInput): Promise<void> {
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId_category: { userId: input.userId, category: input.category } },
  });
  if (preference && !preference.enabled) return;

  await tx.notification.create({
    data: {
      parishId: input.parishId,
      userId: input.userId,
      category: input.category,
      title: input.title,
      body: input.body,
      linkPath: input.linkPath ?? null,
    },
  });
}

export async function notifyManyUsers(
  tx: Prisma.TransactionClient,
  parishId: string,
  userIds: string[],
  category: NotificationCategory,
  title: string,
  body: string,
  linkPath?: string | null,
): Promise<void> {
  for (const userId of userIds) {
    await notifyUser(tx, { parishId, userId, category, title, body, linkPath });
  }
}

export function listMyNotifications(parishId: string, userId: string, limit = 30) {
  return withTenantContext(parishId, (tx) =>
    tx.notification.findMany({ where: { parishId, userId }, orderBy: { createdAt: "desc" }, take: limit }),
  );
}

export function countUnreadNotifications(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) => tx.notification.count({ where: { parishId, userId, readAt: null } }));
}

/**
 * Para onde vai uma notificação que não gravou destino próprio.
 *
 * Notificação sem destino vira linha morta: a pessoa lê, toca, e nada
 * acontece. Medido em 29/08/2026 na conta do usuário em produção — três
 * das seis notificações dele não respondiam ao toque. Duas causas, e o
 * mesmo efeito: o resumo semanal nunca gravou destino, e as "Palavra do
 * Padre" mais antigas são anteriores a existir o campo.
 *
 * Este mapa resolve as duas de uma vez, e sem migração de dados: a linha
 * antiga passa a levar a algum lugar sensato na hora em que é aberta. O
 * destino explícito, quando existe, sempre vence — isto é rede de
 * segurança, não a regra.
 *
 * `/inicio` é o último recurso porque é a tela que responde "o que está
 * acontecendo agora", e é para onde qualquer aviso da paróquia converge.
 */
const DESTINO_PADRAO: Record<string, string> = {
  urgente: "/avisos",
  espiritual: "/comunidade",
  pastoral: "/agenda",
  pessoal: "/eu",
};

export function destinoPadraoDaCategoria(categoria: string): string {
  return DESTINO_PADRAO[categoria] ?? "/inicio";
}

/**
 * Dá a notificação por lida e devolve PARA ONDE ela leva.
 *
 * O destino sai do banco, nunca do formulário. Se viesse do formulário,
 * qualquer um poderia forjar um envio e usar o app como trampolim para
 * fora — o clássico open redirect. Aqui o id é a única coisa que a pessoa
 * escolhe, e ele é conferido contra a própria paróquia e o próprio usuário.
 */
export async function openNotification(parishId: string, id: string, userId: string) {
  return withTenantContext(parishId, async (tx) => {
    const notificacao = await tx.notification.findFirst({
      where: { id, parishId, userId },
      select: { linkPath: true, category: true },
    });
    if (!notificacao) return null;

    await tx.notification.updateMany({
      where: { id, parishId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return notificacao.linkPath ?? destinoPadraoDaCategoria(notificacao.category);
  });
}

/** Escopado ao próprio usuário — evita marcar como lida a notificação de outra pessoa por id adivinhado. */
export function markNotificationRead(parishId: string, id: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.notification.updateMany({ where: { id, parishId, userId, readAt: null }, data: { readAt: new Date() } }),
  );
}

export function markAllNotificationsRead(parishId: string, userId: string) {
  return withTenantContext(parishId, (tx) =>
    tx.notification.updateMany({ where: { parishId, userId, readAt: null }, data: { readAt: new Date() } }),
  );
}

/** Preferência não é tenant-scoped (sem parish_id) — ver comentário no schema. */
export async function listMyPreferences(userId: string) {
  const rows = await prisma.notificationPreference.findMany({ where: { userId } });
  const enabledByCategory = new Map(rows.map((row) => [row.category, row.enabled]));
  return NOTIFICATION_CATEGORIES.map((category) => ({
    category,
    enabled: enabledByCategory.get(category) ?? true,
  }));
}

export function setPreference(userId: string, category: NotificationCategory, enabled: boolean) {
  return prisma.notificationPreference.upsert({
    where: { userId_category: { userId, category } },
    update: { enabled },
    create: { userId, category, enabled },
  });
}

/**
 * Dá por lidas as notificações cujo assunto vive na tela que a pessoa
 * acabou de abrir.
 *
 * Antes, o aviso só saía da lista quando o fiel voltava às notificações e
 * tocava em "já vi" — mesmo tendo aberto o vídeo do padre e assistido
 * inteiro. Ler onde a coisa mora é a prova de leitura que importa; pedir um
 * segundo toque em outra tela é burocracia.
 */
export function markNotificationsReadByPath(parishId: string, userId: string, linkPath: string) {
  return withTenantContext(parishId, (tx) =>
    tx.notification.updateMany({
      where: { parishId, userId, linkPath, readAt: null },
      data: { readAt: new Date() },
    }),
  );
}

/**
 * Marca um envio como feito, e diz se ele é INÉDITO.
 *
 * Devolve `true` só na primeira vez para aquela chave; nas seguintes,
 * `false`. Quem chama usa isso para não mandar de novo.
 *
 * Usa `createMany` com `skipDuplicates` em vez de tentar criar e capturar o
 * erro: violação de unicidade dentro de uma transação a aborta inteira, e
 * aqui estamos no meio de um laço que precisa continuar.
 */
export async function registrarEnvio(
  tx: Prisma.TransactionClient,
  parishId: string,
  chave: string,
): Promise<boolean> {
  const { count } = await tx.notificationDispatch.createMany({
    data: [{ parishId, chave }],
    skipDuplicates: true,
  });
  return count === 1;
}

/**
 * Apaga registros de envio velhos.
 *
 * A tabela só existe para responder "isto já saiu?", e essa pergunta nunca
 * é feita sobre semana passada. Sem a poda, ela cresceria para sempre
 * guardando respostas que ninguém vai pedir.
 */
export async function limparEnviosAntigos(agora: Date, dias = 30): Promise<number> {
  const limite = new Date(agora.getTime() - dias * 24 * 3_600_000);
  const { count } = await prisma.notificationDispatch.deleteMany({
    where: { createdAt: { lt: limite } },
  });
  return count;
}
