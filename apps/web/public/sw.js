// Service Worker for Push Notifications
// This file must remain plain JS (not bundled by Next.js)

const DEFAULT_URL = "/dashboard";

function sameOriginUrl(candidate) {
  try {
    const url = new URL(candidate, self.location.origin);
    return url.origin === self.location.origin ? url.href : DEFAULT_URL;
  } catch {
    return DEFAULT_URL;
  }
}

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    const { title, body, icon, badge, url } = data;

    const options = {
      actions: [{ action: "open", title: "Open" }],
      badge: badge || "/web-app-manifest-192x192.png",
      body: body || "",
      data: { url: sameOriginUrl(url || DEFAULT_URL) },
      icon: icon || "/web-app-manifest-192x192.png",
      vibrate: [100, 50, 100],
    };

    event.waitUntil(
      self.registration.showNotification(title || "Reflet", options)
    );
  } catch {
    // Fallback for non-JSON payloads
    event.waitUntil(
      self.registration.showNotification("Reflet", {
        body: event.data.text(),
        icon: "/web-app-manifest-192x192.png",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = sameOriginUrl(event.notification.data?.url || DEFAULT_URL);

  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true, type: "window" })
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
