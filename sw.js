/* Studio JM - Web Push | service worker no escopo do site */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = String(data.title || "Studio JM — Novo agendamento").slice(0, 120);
  const options = {
    body: String(data.body || "Você tem um novo agendamento.").slice(0, 300),
    tag: data.tag || undefined,
    data: { url: "/app/admin.html#agenda" },
    icon: "/img/brand/logo.jpg",
    badge: "/img/brand/logo.jpg"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL("/app/admin.html#agenda", self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(destination);
        return client.focus();
      }
    }
    return self.clients.openWindow(destination);
  })());
});
