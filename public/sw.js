/*
 * Service worker do Minha Paróquia.
 *
 * Existe por um motivo só: receber notificação com o app FECHADO. É o
 * navegador que executa este arquivo em segundo plano — por isso ele não
 * pode importar nada do resto do código.
 *
 * Não faz cache de nada de propósito. Cache off-line traria a pergunta
 * "que versão da página a pessoa está vendo?", que num app com dado de
 * paróquia (escala, aviso, horário de missa) é pior do que simplesmente
 * exigir conexão.
 */

self.addEventListener("install", () => {
  // Assume o controle sem esperar as abas antigas fecharem.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Minha Paróquia", body: event.data.text() };
  }

  const title = payload.title || "Minha Paróquia";
  const options = {
    body: payload.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    // Agrupa por assunto: um novo lembrete do mesmo compromisso substitui o
    // anterior em vez de empilhar.
    tag: payload.tag || "minha-paroquia",
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/inicio" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/inicio";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Se já existe uma aba do app aberta, leva ela para o destino em vez
      // de abrir uma segunda.
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(destino);
          return client.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
