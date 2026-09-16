// Service worker dell'app Negozio: tiene sull'iPad pagina, font e logo.
// L'app si apre subito anche con rete lenta; i file si rinfrescano in sottofondo (stale-while-revalidate).
// Le chiamate a Supabase non passano mai dalla cache.
const VERSIONE = 'negozio-2026-09-16b';
const SHELL = [
  './Negozio-v2.html',
  './Cassa.html',
  '../../shared/fonts/Miso-Regular.woff2',
  '../../shared/fonts/Miso-Bold.woff2',
  '../../shared/logo-tondo.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSIONE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Supabase e tutto il resto: rete diretta
  // una sola copia per file, senza la parte dopo il "?" (così ?sede=duomo e ?sede=borgo condividono la stessa pagina aggiornata)
  const chiave = new Request(u.origin + u.pathname);
  e.respondWith(caches.open(VERSIONE).then(async c => {
    const inCache = await c.match(chiave);
    const dallaRete = fetch(e.request).then(r => { if (r && r.ok) c.put(chiave, r.clone()); return r; }).catch(() => null);
    return inCache || (await dallaRete) || new Response('Niente rete', { status: 503 });
  }));
});
