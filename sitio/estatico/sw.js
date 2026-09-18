/* Euchel — service worker del catálogo cliente.
   Conservador a propósito: si algo falla, cae a la red y el sitio funciona igual.
   - HTML: red primero (el catálogo cambia), con caché de respaldo si no hay señal.
   - CSS/JS/imágenes: caché primero (nunca cambian sin cambiar de nombre de despliegue).
*/
var VERSION = 'euchel-v3';
var BASE = VERSION + '-base';
var ASEO = [BASE];

// Sin estilos.css ni app.js: sus URLs llevan la versión del despliegue
// (?v=...) y se cachean al primer uso. Precargarlos sin versión dejaba una
// copia que nunca se renovaba.
var ESENCIAL = [
  '/',
  '/logo.svg',
  '/offline.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(BASE)
      .then(function (c) { return c.addAll(ESENCIAL); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (claves) {
        return Promise.all(claves.map(function (k) {
          return ASEO.indexOf(k) === -1 ? caches.delete(k) : null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;

  // La API y el auth nunca se cachean. El estado en vivo (qué está agotado,
  // qué está oculto) cambia varias veces al día: servirlo de caché mostraba
  // agotado lo que ya volvió, y para siempre, porque la rama de estáticos es
  // caché primero. Los paneles montan su propio service worker, pero este
  // controla el sitio entero, así que el corte va aquí también.
  if (url.pathname.indexOf('/api/') === 0 || url.pathname.indexOf('/auth/') === 0) return;

  var esHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  if (esHTML) {
    e.respondWith(
      fetch(req)
        .then(function (r) {
          var copia = r.clone();
          caches.open(BASE).then(function (c) { c.put(req, copia); }).catch(function () {});
          return r;
        })
        .catch(function () {
          return caches.match(req).then(function (r) {
            return r || caches.match('/offline.html') || Response.error();
          });
        })
    );
    return;
  }

  // Imágenes: caché primero. Su nombre lleva el hash del contenido, así
  // que nunca cambian sin cambiar de URL.
  var esImagen = url.pathname.indexOf('/img/') === 0 || url.pathname.indexOf('/.netlify/images') === 0;
  if (esImagen) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (r) {
          if (r && r.status === 200 && (r.type === 'basic' || r.type === 'default')) {
            var copia = r.clone();
            caches.open(BASE).then(function (c) { c.put(req, copia); }).catch(function () {});
          }
          return r;
        });
      })
    );
    return;
  }

  // CSS, JS y demás: se sirve lo guardado si hay, pero siempre se pide la
  // versión nueva por detrás y se guarda para la próxima vez. Así un cambio
  // de diseño llega como mucho a la segunda visita, aunque la URL no lleve
  // versión (la de los paneles y la página sin conexión no la llevan).
  e.respondWith(
    caches.open(BASE).then(function (c) {
      return c.match(req).then(function (hit) {
        var red = fetch(req).then(function (r) {
          if (r && r.status === 200 && r.type === 'basic') c.put(req, r.clone()).catch(function () {});
          return r;
        }).catch(function () { return hit; });
        return hit || red;
      });
    })
  );
});
