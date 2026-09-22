/* Service worker do Recall e Follow-up — Kássila Nasser
 *
 * Duas funções, nesta ordem de importância:
 *   1. existir, porque o Chrome só oferece "Instalar app" se houver um SW
 *      com handler de fetch;
 *   2. guardar os ícones e o manifest, que nunca mudam.
 *
 * O que ele deliberadamente NÃO faz: cachear o index.html nem as chamadas da
 * API. Um app que abre na frente da direção mostrando a carteira de ontem é
 * pior que um app que não abre — o erro é silencioso e ninguém percebe. Então
 * HTML e dados vão sempre à rede.
 */

const CACHE = 'kassila-recall-estatico-v1';
const ESTATICOS = [
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', function (evt) {
  evt.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ESTATICOS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { return self.skipWaiting(); })
  );
});

/* Limpeza de versão antiga.
 *
 * O Recall e o painel de vendas moram no MESMO domínio do GitHub Pages, e o
 * armazenamento de cache do navegador é por domínio, não por pasta. Apagar
 * "todo cache que não é o meu" faria os dois aplicativos derrubarem o cache um
 * do outro a cada abertura. Por isso a limpeza só alcança os caches com o
 * prefixo deste aplicativo. */
const PREFIXO = 'kassila-recall-';

self.addEventListener('activate', function (evt) {
  evt.waitUntil(
    caches.keys()
      .then(function (nomes) {
        return Promise.all(nomes
          .filter(function (n) { return n.indexOf(PREFIXO) === 0 && n !== CACHE; })
          .map(function (n) { return caches.delete(n); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (evt) {
  const req = evt.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // API do Apps Script e qualquer coisa de outro domínio: sempre rede.
  if (url.origin !== self.location.origin) return;

  // O HTML e o config: sempre rede, para nunca abrir uma versão velha.
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') ||
      url.pathname.endsWith('config.js')) return;

  // Ícones e manifest: cache primeiro, é o que dispensa rede.
  evt.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req);
    })
  );
});
