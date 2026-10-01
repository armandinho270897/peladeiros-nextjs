// Service worker — três responsabilidades, de propósito:
// 1) cachear os arquivos estáticos do build (_next/static, ícones), que
//    têm hash no nome e por isso são seguros pra guardar pra sempre;
// 2) trocar o erro feio do navegador por uma tela própria quando uma
//    navegação falha por falta de internet;
// 3) mostrar notificação push (só isso roda mesmo com o app fechado —
//    é o motivo de existir um service worker nativo em vez de só JS
//    normal da página pra isso).
// NUNCA toca em /api/ nem /auth/ — pelada, chat e placar continuam sempre
// ao vivo, sem risco de mostrar dado velho escondido no cache. Não é um
// app "funciona 100% offline", é "não quebra feio quando o sinal cai".
const CACHE = 'peladeiros-static-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Navegação de página inteira (abrir o app, recarregar, trocar de rota
  // direto na URL): tenta a rede, cai pra tela de offline só se falhar.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Build do Next (JS/CSS com hash) e ícones: cache-first, e guarda cópia
  // nova sempre que passa pela rede — nunca fica desatualizado porque o
  // hash do nome muda a cada build.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cacheada) => {
        if (cacheada) return cacheada;
        return fetch(request).then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copia));
          return resposta;
        });
      })
    );
  }
});

// Payload sempre em JSON (ver lib/webPush.js) — se vier vazio/corrompido
// por algum motivo, mostra um fallback genérico em vez de deixar o evento
// quebrar em silêncio (push some sem nenhum sinal se o handler lançar erro).
self.addEventListener('push', (event) => {
  let dados = { title: 'Peladeiros', body: 'Você tem um aviso novo.', url: '/avisos' };
  try {
    if (event.data) dados = { ...dados, ...event.data.json() };
  } catch {
    // mantém o fallback
  }
  event.waitUntil(
    self.registration.showNotification(dados.title, {
      body: dados.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: dados.tag || undefined,
      data: { url: dados.url || '/avisos' },
      vibrate: [60, 30, 60],
    })
  );
});

// Clicar na notificação foca uma aba já aberta do app (em vez de abrir
// outra por cima) quando existe uma — senão abre uma nova na URL certa.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/avisos';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (cliente.url.startsWith(self.location.origin) && 'focus' in cliente) {
          cliente.navigate(url);
          return cliente.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
