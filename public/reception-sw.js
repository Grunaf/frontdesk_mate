/* eslint-disable no-restricted-globals */
/* Reception desk PWA — push + notification click only (no HTML caching). */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const fallback = { title: 'Reception', body: 'New update', url: '/', tag: 'reception', refresh: 'context' };
  let payload = fallback;

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        title: typeof parsed.title === 'string' ? parsed.title : fallback.title,
        body: typeof parsed.body === 'string' ? parsed.body : fallback.body,
        url: typeof parsed.url === 'string' ? parsed.url : fallback.url,
        tag: typeof parsed.tag === 'string' ? parsed.tag : fallback.tag,
        refresh: parsed.refresh === 'context' || parsed.refresh == null ? 'context' : parsed.refresh,
      };
    } catch {
      payload = { ...fallback, body: event.data.text() || fallback.body };
    }
  }

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: '/icons/reception-192.png',
        badge: '/icons/reception-192.png',
        tag: payload.tag,
        data: { url: payload.url },
      });

      const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const refresh = payload.refresh ?? 'context';
      for (const client of windowClients) {
        client.postMessage({ type: 'reception:refresh', refresh });
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.focus();
          if ('navigate' in client && typeof client.navigate === 'function') {
            await client.navigate(targetUrl);
          }
          return;
        }
      }
      await clients.openWindow(targetUrl);
    })()
  );
});
