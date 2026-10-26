// ---------- Service worker ----------
// Only job: show the "new booking" notifications sent by the notify-booking
// Supabase function, and open the Bookings page when one is tapped. It does
// not cache pages (no fetch handler), so it never serves stale files.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Anak Homes', {
    body: data.body || '',
    icon: 'assets/icon-192.png',
    badge: 'assets/icon-192.png',
    tag: data.tag || undefined,
    data: { url: data.url || 'bookings.html' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || 'bookings.html', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const open = windows.find(w => w.url.startsWith(self.registration.scope));
    if (open) return open.navigate(url).then(w => (w || open).focus());
    return self.clients.openWindow(url);
  }));
});
