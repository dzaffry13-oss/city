/* Service worker сайта CITY: показывает уведомления. Страницы не кэшируются. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: 'CITY', body: event.data ? event.data.text() : '' }; }
  const title = d.title || 'CITY';
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: d.url || '/' },
    tag: d.url || 'city',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.location.origin) && 'focus' in c) { await c.focus(); if ('navigate' in c) return c.navigate(url); return; }
    }
    return self.clients.openWindow(url);
  })());
});
