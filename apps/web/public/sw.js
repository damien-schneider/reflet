// Service Worker for Push Notifications
// This file must remain plain JS (not bundled by Next.js)

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    const { title, body, icon, badge, url } = data;

    const options = {
      body: body || "",
      icon: icon || "/icon-192x192.png",
      badge: badge || "/icon-192x192.png",
      data: { url: url || "/dashboard" },
      vibrate: [100, 50, 100],
      actions: [{ action: "open", title: "Open" }],
    };

    event.waitUntil(
      self.registration.showNotification(title || "Reflet", options)
    );
  } catch {
    // Fallback for non-JSON payloads
    event.waitUntil(
      self.registration.showNotification("Reflet", {
        body: event.data.text(),
        icon: "/icon-192x192.png",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes("/dashboard") && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Otherwise open a new window
        return self.clients.openWindow(url);
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
