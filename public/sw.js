// Service worker enxuto — só duas responsabilidades, de propósito:
// 1) cachear os arquivos estáticos do build (_next/static, ícones), que
//    têm hash no nome e por isso são seguros pra guardar pra sempre;
// 2) trocar o erro feio do navegador por uma tela própria quando uma
//    navegação falha por falta de internet.
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
