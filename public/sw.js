const CACHE = "ders-takvimi-pwa-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  // Uygulama verileri kişiye özeldir; bu worker onları önbelleğe almaz.
});
