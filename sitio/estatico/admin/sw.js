/* Service worker del panel de administración. Igual que el del equipo:
 *
 * Conservador a propósito. El panel sirve para cambiar datos, así que nada de
 * servir respuestas viejas de la API: /api/* y /auth/* nunca se cachean. Lo
 * único que se guarda es el armazón (HTML, CSS, JS, iconos) para que la app
 * instalada abra al instante y muestre un mensaje claro cuando no hay señal,
 * en vez del dinosaurio del navegador.
 *
 * Las fotos de producto sí se cachean: son inmutables (el nombre lleva el
 * hash del archivo) y ahorran datos a quien trabaja con el celular.
 */

const VERSION = 'admin-v1';
const ARMAZON = [
  '/admin/',
  '/admin/panel.js',
  '/admin/admin.css',
  '/panel/base.css',
  '/panel/lista.css',
  '/panel/sesion.js',
  '/panel/ui.js',
  '/panel/lista.js',
  '/logo.svg',
  '/admin/icono-192.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(VERSION)
      // addAll falla entero si un archivo falla; se piden de a uno para que
      // un fallo suelto no deje la instalación sin nada.
      .then((c) => Promise.all(ARMAZON.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Fotos: de la caché si están, y si no se bajan y se guardan.
  if (url.pathname.startsWith('/img/')) {
    ev.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((r) => {
        if (r.ok) caches.open(VERSION).then((c) => c.put(req, r.clone()));
        return r;
      }).catch(() => Response.error()))
    );
    return;
  }

  // Armazón: red primero para que un despliegue nuevo llegue solo, con la
  // caché como red de seguridad.
  ev.respondWith(
    fetch(req).then((r) => {
      if (r.ok) caches.open(VERSION).then((c) => c.put(req, r.clone()));
      return r;
    }).catch(() => caches.match(req).then((hit) => hit
      || (req.mode === 'navigate' ? caches.match('/admin/') : undefined)
      || new Response('Sin conexión.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } })))
  );
});
