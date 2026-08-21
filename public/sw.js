/*
 * Service worker do Minha Paróquia.
 *
 * Existe por um motivo só: receber notificação com o app FECHADO. É o
 * navegador que executa este arquivo em segundo plano — por isso ele não
 * pode importar nada do resto do código.
 *
 * Não guarda NENHUM dado de paróquia em cache, de propósito. Cache
 * off-line traria a pergunta "que versão da página a pessoa está vendo?",
 * que com escala, aviso e horário de missa é pior do que exigir conexão:
 * ela confiaria num horário que já mudou.
 *
 * A única coisa guardada é a página de "sem conexão", que não contém dado
 * nenhum. Ela existe por dois motivos: a pessoa ver uma tela nossa em vez
 * do erro cru do navegador, e o app poder ser INSTALADO — o navegador só
 * oferece instalar quando o service worker sabe responder alguma coisa
 * sem rede, e é a instalação que destrava a notificação no iPhone.
 */

const CACHE = "minha-paroquia-v1";
const PAGINA_SEM_CONEXAO = "/offline.html";
// Arquivos fixos da nossa marca, sem dado de paróquia nenhum. Só estes
// podem sair do cache — é o que faz a página de "sem conexão" aparecer
// inteira, em vez de com o emblema quebrado no meio.
const GUARDADOS = [PAGINA_SEM_CONEXAO, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(GUARDADOS)),
  );
  // Assume o controle sem esperar as abas antigas fecharem.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Apaga versões antigas do cache. Sem isso, mudar a página de "sem
    // conexão" não teria efeito: a versão velha ficaria para sempre.
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nossos arquivos de marca: cache primeiro. Trocar a arte exige subir o
  // número do CACHE acima — é o preço de servir sem rede.
  if (url.origin === self.location.origin && GUARDADOS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((r) => r || fetch(event.request)));
    return;
  }

  // Fora isso, só navegação. Todo o resto passa direto para a rede, sem o
  // service worker no meio — é o que garante que nunca se veja escala,
  // aviso ou horário de missa de uma versão velha.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(PAGINA_SEM_CONEXAO).then((r) => r || Response.error()),
    ),
  );
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
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
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
