/* Euchel — service worker del catálogo cliente.
   Conservador a propósito: si algo falla, cae a la red y el sitio funciona igual.
   - HTML: red primero (el catálogo cambia), con caché de respaldo si no hay señal.
   - CSS/JS/imágenes: caché primero (nunca cambian sin cambiar de nombre de despliegue).
*/
var VERSION = 'euchel-v1';
var BASE = VERSION + '-base';
var ASEO = [BASE];

var ESENCIAL = [
  '/',
  '/estilos.css',
  '/app.js',
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

  // estáticos e imágenes
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (r) {
        if (r && r.status === 200 && r.type === 'basic') {
          var copia = r.clone();
          caches.open(BASE).then(function (c) { c.put(req, copia); }).catch(function () {});
        }
        return r;
      });
    })
  );
});
