const CACHE = __CACHE_VERSION__;
const PRECACHE = __PRECACHE_URLS__;
const PUBLIC_ROUTES = __PUBLIC_ROUTES__;
const rscKey = path => '/__liftide_rsc' + (path === '/' ? '/index' : path);

self.addEventListener('install',event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([...PRECACHE,...PUBLIC_ROUTES]);
    // These routes render public shells; identity and records are loaded via
    // uncached APIs. Never add personalized server-rendered routes to this list.
    await Promise.all(PUBLIC_ROUTES.map(async path => {
      const response = await fetch(path,{headers:{RSC:'1'}});
      if(response.ok && response.headers.get('content-type')?.includes('text/x-component')) await cache.put(rscKey(path),response);
    }));
  })());
});
self.addEventListener('activate',event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('liftide-pwa-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message',event => { if(event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch',event => {
  const request = event.request, url = new URL(request.url);
  if(request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/auth/callback') return;
  const path = url.pathname.replace(/\/$/,'') || '/';
  if(!PRECACHE.includes(path) && !PUBLIC_ROUTES.includes(path)) return;
  const key = request.headers.get('RSC') === '1' ? rscKey(path) : path;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(key) || fetch(request);
  })());
});
