const CACHE = 'tabi-v10';
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      caches
        .open(CACHE)
        .then((cache) => cache.addAll(['/manifest.webmanifest', '/icon.svg'])),
    ]),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith('tabi-') && k !== CACHE)
              .map((k) => caches.delete(k)),
          ),
        ),
    ]),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/auth') ||
    url.pathname.includes('__')
  )
    return;
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok && response.type === 'basic' && !response.redirected) {
          const copy = response.clone();
          event.waitUntil(
            caches
              .open(CACHE)
              .then((cache) => cache.put(event.request, copy))
              .catch(() => {}),
          );
        }
        return response;
      } catch {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (
          event.request.mode === 'navigate' &&
          [
            '/',
            '/scenes',
            '/conversation',
            '/daily',
            '/challenge',
            '/listening',
            '/broadcasts',
            '/menu',
            '/dictionary',
            '/search',
            '/life',
            '/review',
            '/profile',
            '/reading',
          ].includes(url.pathname)
        ) {
          const page = await caches.match(
            new URL(url.pathname, url.origin).href,
          );
          if (page) return page;
        }
        return new Response(
          '此页面尚未离线缓存，请联网后访问一次。已经缓存的课程仍可使用。',
          {
            status: 503,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          },
        );
      }
    })(),
  );
});
