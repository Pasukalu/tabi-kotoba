export const offlineCache = 'tabi-v10';
export const publicBasePath =
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BASE_PATH || '' : '';
export const learningRoutes = [
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
  '/manifest.webmanifest',
  '/icon.svg',
].map((route) => `${publicBasePath}${route}`);
export function cacheableLearningUrl(value: string, origin: string) {
  try {
    const url = new URL(value, origin);
    if (
      url.origin !== origin ||
      !['http:', 'https:'].includes(url.protocol) ||
      /^\/api(?:\/|$)/.test(url.pathname) ||
      /auth|__|^\/@|\/node_modules\//.test(url.pathname)
    )
      return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}
export async function cacheLearningPages(
  signal: AbortSignal,
  progress: (done: number, total: number) => void,
) {
  if (!('caches' in window) || !('serviceWorker' in navigator))
    throw Error('此浏览器不支持离线课程保存。');
  const registration = await navigator.serviceWorker.register(
    `${publicBasePath}/sw.js`,
  );
  if (!registration.active && !navigator.serviceWorker.controller) {
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(Error('离线功能尚未就绪，请稍后重试。')),
          10000,
        ),
      ),
    ]);
  }
  const urls = [
    ...new Set(
      [
        ...learningRoutes,
        ...performance.getEntriesByType('resource').map((entry) => entry.name),
      ]
        .map((url) => cacheableLearningUrl(url, location.origin))
        .filter((url): url is string => !!url),
    ),
  ];
  const cache = await caches.open(offlineCache);
  const failed: string[] = [];
  let done = 0;
  for (const url of urls) {
    if (signal.aborted) throw new DOMException('保存已取消', 'AbortError');
    const request = new AbortController();
    const abort = () => request.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 10000);
    try {
      const response = await fetch(url, {
        signal: request.signal,
        credentials: 'same-origin',
      });
      if (!response.ok || response.redirected || response.type === 'opaque')
        throw Error('Page unavailable');
      await cache.put(url, response);
    } catch {
      if (signal.aborted) throw new DOMException('保存已取消', 'AbortError');
      failed.push(new URL(url).pathname);
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    }
    progress(++done, urls.length);
  }
  return { saved: urls.length - failed.length, total: urls.length, failed };
}
