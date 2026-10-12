/* These placeholders are replaced by build-pwa.mjs after the static export. */
const CACHE = __CACHE_VERSION__;
const PRECACHE = __PRECACHE_URLS__;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)));
  // Wait for the user to accept updates, or for all existing tabs to close.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('liftide-pwa-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  let path = url.pathname;
  if (request.mode === 'navigate') {
    path = path.replace(/\/$/, '') || '/index';
    if (!path.endsWith('.html')) path += '.html';
  } else if (request.headers.get('RSC') === '1' && !path.endsWith('.txt')) {
    path = (path.replace(/\/$/, '') || '/index') + '.txt';
  }
  // Only serve assets from this build: keeping HTML, RSC and JS together avoids
  // mixing deployments. Query strings do not alter these static resources.
  if (!PRECACHE.includes(path)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(path)) || fetch(request);
  })());
});
