import "server-only";
import webpush from "web-push";

import { withOwnMembershipLookup, withPlatformContext } from "@/server/db/tenant-context";

/**
 * Web Push — a notificação que chega com o app FECHADO.
 *
 * Escolhido no lugar de e-mail e SMS por três razões: não depende de
 * domínio verificado (o e-mail transacional ainda depende), não tem custo
 * por mensagem, e não exige contrato com operadora.
 *
 * LIMITE REAL, e não pequeno: no iPhone, notificação web só funciona se a
 * pessoa adicionar o site à Tela de Início (iOS 16.4+). No Android e no
 * computador funciona direto pelo navegador. Isso está dito na tela onde a
 * pessoa ativa, não escondido aqui.
 */

export type PushPayload = {
  title: string;
  body: string;
  /** Para onde levar ao tocar na notificação. */
  url?: string;
  /** Notificações com a mesma tag se substituem em vez de empilhar. */
  tag?: string;
};

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function getPublicVapidKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

function configure(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas.");
  }
  // O "subject" identifica quem envia, exigido pelo padrão VAPID.
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contato@minhaparoquia.app",
    publicKey,
    privateKey,
  );
}

export type SubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
};

/** Registra este aparelho. Reinscrever o mesmo endpoint atualiza, não duplica. */
export function saveSubscription(userId: string, input: SubscriptionInput) {
  return withOwnMembershipLookup(userId, (tx) =>
    tx.webPushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: { userId, p256dh: input.p256dh, auth: input.auth, userAgent: input.userAgent ?? null },
      create: {
        userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
      },
    }),
  );
}

export function removeSubscription(userId: string, endpoint: string) {
  return withOwnMembershipLookup(userId, (tx) =>
    tx.webPushSubscription.deleteMany({ where: { userId, endpoint } }),
  );
}

export function listOwnSubscriptions(userId: string) {
  return withOwnMembershipLookup(userId, (tx) =>
    tx.webPushSubscription.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  );
}

/**
 * Envia para todos os aparelhos de uma pessoa.
 *
 * Usa withPlatformContext porque o job diário precisa alcançar aparelhos de
 * várias pessoas, e não há contexto de usuário logado ali. Quem chama é
 * responsável por ter decidido que ESTA pessoa deve ser notificada.
 *
 * Endpoint morto (410/404) é apagado: navegador desinstalado, permissão
 * revogada, aparelho trocado. Sem isso a tabela vira lixo que falha todo
 * dia para sempre.
 */
export async function sendToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!isPushConfigured()) return 0;
  configure();

  const subscriptions = await withPlatformContext((tx) =>
    tx.webPushSubscription.findMany({ where: { userId } }),
  );
  if (subscriptions.length === 0) return 0;

  const mortos: string[] = [];
  let enviados = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        enviados += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          mortos.push(sub.endpoint);
        } else {
          // Falha transitória do serviço de push não pode derrubar o job
          // inteiro — as outras pessoas ainda precisam ser avisadas.
          console.error(`Falha ao enviar push para ${sub.endpoint}:`, error);
        }
      }
    }),
  );

  if (mortos.length > 0) {
    await withPlatformContext((tx) =>
      tx.webPushSubscription.deleteMany({ where: { endpoint: { in: mortos } } }),
    );
  }

  return enviados;
}

/**
 * Envia para várias pessoas de uma vez.
 *
 * Existe separado de sendToUser porque aviso de paróquia vai para TODO
 * mundo: chamar sendToUser em laço faria uma consulta ao banco por pessoa,
 * dentro de uma requisição. Aqui é uma consulta só.
 *
 * Continua sendo trabalho síncrono dentro do pedido — aceitável para a
 * escala de uma paróquia (dezenas a poucas centenas de aparelhos). Se um
 * dia uma paróquia passar disso, este é o ponto que vira fila.
 */
export async function sendToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  if (!isPushConfigured() || userIds.length === 0) return 0;
  configure();

  const subscriptions = await withPlatformContext((tx) =>
    tx.webPushSubscription.findMany({ where: { userId: { in: userIds } } }),
  );
  if (subscriptions.length === 0) return 0;

  const mortos: string[] = [];
  let enviados = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        enviados += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) mortos.push(sub.endpoint);
        else console.error(`Falha ao enviar push para ${sub.endpoint}:`, error);
      }
    }),
  );

  if (mortos.length > 0) {
    await withPlatformContext((tx) =>
      tx.webPushSubscription.deleteMany({ where: { endpoint: { in: mortos } } }),
    );
  }

  return enviados;
}

/** Só para a pessoa conferir que a permissão funcionou. */
export function sendTestToUser(userId: string) {
  return sendToUser(userId, {
    title: "Notificações ativadas",
    body: "É assim que os lembretes da sua paróquia vão chegar.",
    url: "/eu/notificacoes",
    tag: "teste",
  });
}
