/* ===========================================================
   Catalogo Wha — Service Worker (PWA)
   Estrategia:
   - HTML: network-first (contenido fresco) con fallback a caché.
   - Estáticos (css/js/img): cache-first + actualización en segundo plano.
   =========================================================== */
const CACHE = "catalogo-wha-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/login.html",
  "/dashboard.html",
  "/catalogo.html",
  "/assets/css/styles.css",
  "/assets/js/config.js",
  "/assets/js/i18n.js",
  "/assets/js/store.js",
  "/assets/js/common.js",
  "/assets/js/auth.js",
  "/assets/js/dashboard.js",
  "/assets/js/catalog.js",
  "/manifest.webmanifest",
  "/assets/img/icon.svg",
  "/assets/img/icon-192.png",
  "/assets/img/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // no cachear CDN/API externa

  const isHTML = req.headers.get("accept") && req.headers.get("accept").includes("text/html");

  if (isHTML) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match("/index.html")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
