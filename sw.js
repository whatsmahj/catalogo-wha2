/* ===========================================================
   Catalogo Wha — Service Worker (PWA)
   Estrategia:
   - HTML: network-first (contenido fresco) con fallback a caché.
   - Estáticos (css/js/img): cache-first + actualización en segundo plano.

   IMPORTANTE: al publicar cambios en CSS o JS hay que subir CACHE_VERSION.
   Si no, el navegador sigue sirviendo los archivos viejos desde caché
   mientras el HTML sí se actualiza, y la página se rompe.
   =========================================================== */
const CACHE_VERSION = 8;
const CACHE = "catalogo-wha-v" + CACHE_VERSION;
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
  "/robots.txt",
  "/assets/img/icon.svg",
  "/assets/img/icon-192.png",
  "/assets/img/icon-512.png",
  "/assets/img/og-image.png",
  "/assets/img/hero-catalog.png",
  "/assets/img/example-restaurant.png",
  "/assets/img/example-fashion.png",
  "/assets/img/example-materials.png"
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

/* Si una página pide "saltar espera", se activa de inmediato. */
self.addEventListener("message", (e) => {
  if (e.data === "skip-waiting") self.skipWaiting();
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
      }).catch(() =>
        caches.open(CACHE).then((c) => c.match(req)).then((r) => r || caches.match("/index.html"))
      )
    );
    return;
  }

  /* Estáticos: se consulta SOLO la caché actual. Así una caché de una
     versión anterior nunca puede servir archivos viejos, aunque siga ahí. */
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});
