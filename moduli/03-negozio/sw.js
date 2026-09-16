// Service worker dell'app Negozio: tiene sull'iPad pagina, font e logo.
// L'app si apre subito anche con rete lenta; i file si rinfrescano in sottofondo (stale-while-revalidate).
// Le chiamate a Supabase non passano mai dalla cache.
const VERSIONE = 'negozio-2026-09-16d';
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
  if (/Controllo\.html$/.test(u.pathname) || /\/controllo\/?$/.test(u.pathname)) return; // la dashboard admin è sempre fresca, mai dalla cache
  // una sola copia per file, senza la parte dopo il "?" (così ?sede=duomo e ?sede=borgo condividono la stessa pagina aggiornata)
  const chiave = new Request(u.origin + u.pathname);
  const pagina = e.request.mode === 'navigate' || e.request.destination === 'document';
  e.respondWith(caches.open(VERSIONE).then(async c => {
    const dallaRete = fetch(e.request).then(r => { if (r && r.ok) c.put(chiave, r.clone()); return r; }).catch(() => null);
    if (pagina) {
      // le PAGINE: prima la rete (così un aggiornamento arriva subito), la copia salvata solo se la rete non risponde entro 4 s
      const attesa = new Promise(res => setTimeout(() => res(null), 4000));
      const r = await Promise.race([dallaRete, attesa]);
      return r || (await c.match(chiave)) || (await dallaRete) || new Response('Niente rete', { status: 503 });
    }
    // font e logo: subito dalla copia salvata, rinfrescati in sottofondo
    const inCache = await c.match(chiave);
    return inCache || (await dallaRete) || new Response('Niente rete', { status: 503 });
  }));
});
