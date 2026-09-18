/* Euchel — service worker del catálogo cliente.
   Conservador a propósito: si algo falla, cae a la red y el sitio funciona igual.
   - HTML: red primero (el catálogo cambia), con caché de respaldo si no hay señal.
   - Imágenes: caché primero (su nombre lleva el hash: nunca cambian sin cambiar de URL).
   - CSS/JS: lo guardado si hay, y siempre se pide la versión nueva por detrás.

   Regla de oro: ninguna rama puede terminar sin respuesta. Una lectura de
   caché que falle no tumba la petición: se cae a la red, y si la red falla,
   a la última copia guardada. Una ficha sin estilos ni foto es peor que una
   ficha con el diseño de ayer.
*/
var VERSION = 'euchel-v4';
var BASE = VERSION + '-base';

// Los paneles del equipo (/trabajador/, /admin/) tienen su propio service
// worker en el mismo origen, y las cachés se comparten. Cada uno limpia solo
// las suyas: este las que empiezan por 'euchel-'.
var PREFIJO = 'euchel-';

// estilos.css y app.js se enlazan con ?v=<despliegue>. Se precargan sin
// versión como copia de reserva: si la red falla al pedir la versión nueva,
// se sirve la última copia guardada, sea cual sea su ?v= (ver ignoreSearch).
var ESENCIAL = [
  '/',
  '/logo.svg',
  '/offline.html',
  '/estilos.css',
  '/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(BASE)
      // De a uno: que un archivo falle no deja la instalación sin nada.
      .then(function (c) {
        return Promise.all(ESENCIAL.map(function (u) { return c.add(u).catch(function () { return null; }); }));
      })
      .then(function () { return self.skipWaiting(); }, function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (claves) {
        return Promise.all(claves.map(function (k) {
          return k.indexOf(PREFIJO) === 0 && k !== BASE ? caches.delete(k) : null;
        }));
      })
      .then(function () { return self.clients.claim(); }, function () { return self.clients.claim(); })
  );
});

/* Lectura de caché que nunca rechaza: si falla, es como si no hubiera nada. */
function guardado(req, opciones) {
  return caches.open(BASE)
    .then(function (c) { return c.match(req, opciones); })
    .catch(function () { return undefined; });
}

/* Escritura de caché en segundo plano: no bloquea ni puede fallar la respuesta. */
function guardar(clave, r) {
  try {
    var copia = r.clone();
    caches.open(BASE).then(function (c) { return c.put(clave, copia); }).catch(function () {});
  } catch (err) { /* cuerpo ya consumido o caché inaccesible: se sigue sin guardar */ }
}

function esBuena(r) {
  return !!r && r.ok && (r.type === 'basic' || r.type === 'default');
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;

  // La API y el auth nunca se cachean. El estado en vivo (qué está agotado,
  // qué está oculto) cambia varias veces al día: servirlo de caché mostraba
  // agotado lo que ya volvió. Los paneles montan su propio service worker,
  // pero este controla el sitio entero, así que el corte va aquí también.
  if (url.pathname.indexOf('/api/') === 0 || url.pathname.indexOf('/auth/') === 0) return;

  var esHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  if (esHTML) {
    e.respondWith(
      fetch(req)
        .then(function (r) {
          // Solo se guarda una página buena: una de "no encontrado" o de
          // "un momento" servida de caché sería un error que no se va nunca.
          if (esBuena(r)) guardar(req, r);
          return r;
        })
        .catch(function () {
          return guardado(req).then(function (r) {
            return r || guardado('/offline.html');
          }).then(function (r) { return r || Response.error(); });
        })
    );
    return;
  }

  // Imágenes: caché primero.
  var esImagen = url.pathname.indexOf('/img/') === 0 || url.pathname.indexOf('/.netlify/images') === 0;
  if (esImagen) {
    e.respondWith(
      guardado(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (r) {
          if (esBuena(r)) guardar(req, r);
          return r;
        });
      }).catch(function () { return Response.error(); })
    );
    return;
  }

  // CSS, JS y demás: se sirve lo guardado si hay, pero siempre se pide la
  // versión nueva por detrás y se guarda para la próxima vez. Así un cambio
  // de diseño llega como mucho a la segunda visita, aunque la URL no lleve
  // versión (la de los paneles y la página sin conexión no la llevan).
  //
  // Si la red falla y no hay copia exacta, vale una copia de la misma ruta
  // con otro ?v=: mejor el diseño de ayer que ninguno.
  e.respondWith(
    guardado(req).then(function (hit) {
      var red = fetch(req).then(function (r) {
        if (esBuena(r)) {
          guardar(req, r);
          if (url.search) guardar(url.pathname, r);   // copia de reserva sin versión
        }
        return r;
      });
      if (hit) {
        red.catch(function () {});   // la renovación de fondo puede fallar en silencio
        return hit;
      }
      return red.catch(function () {
        return guardado(req, { ignoreSearch: true }).then(function (reserva) {
          return reserva || Response.error();
        });
      });
    }).catch(function () { return fetch(req); })
  );
});
