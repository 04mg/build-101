// Cruce push notifications for the founder network.
// A visible Cruce tab shows its own in-app notice, so the system one is skipped.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { title: 'Cruce', body: event.data ? event.data.text() : '' } }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const visible = windows.filter(client => client.visibilityState === 'visible')
    for (const client of windows) client.postMessage({ type: 'cruce-network', action: 'refresh' })
    if (visible.length) return
    await self.registration.showNotification(data.title || 'Cruce', {
      body: data.body || '', tag: data.tag, icon: '/favicon.svg', badge: '/favicon.svg', data: { url: data.url || '/' },
    })
  })())
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin)
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(client => new URL(client.url).origin === url.origin)
    if (existing) {
      await existing.focus()
      existing.postMessage({ type: 'cruce-network', action: 'open', target: url.searchParams.get('network') })
      return
    }
    await self.clients.openWindow(url.href)
  })())
})
