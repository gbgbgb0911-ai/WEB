/* Sirve dist en HTTP plano y reenvía /auth/* y /api/* al sitio real.
 *
 * Es para poder manejar los paneles con un navegador de verdad: Chromium en
 * este contenedor no confía en la CA del proxy de salida, así que ir directo
 * a la URL https daba ERR_CERT_AUTHORITY_INVALID. Node sí confía (usa el
 * bundle del entorno), y el navegador habla http con localhost.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = '/tmp/euchel-paquete/dist';
const ARRIBA = 'https://euchel-catalogo.netlify.app';
const TIPOS = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json', '.png':'image/png', '.webp':'image/webp',
  '.svg':'image/svg+xml', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8' };

const galletas = new Map();   // cookie de sesión por nombre, como un navegador

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');

  if (u.pathname.startsWith('/auth/') || u.pathname.startsWith('/api/')) {
    const cuerpo = req.method === 'GET' || req.method === 'HEAD' ? undefined
      : await new Promise((ok) => { const t = []; req.on('data', (c) => t.push(c));
                                    req.on('end', () => ok(Buffer.concat(t))); });
    const cabeceras = { origin: ARRIBA };
    for (const k of ['content-type', 'authorization']) {
      if (req.headers[k]) cabeceras[k] = req.headers[k];
    }
    // Al subir se le devuelve el prefijo __Secure- que se le quitó al bajar.
    if (req.headers.cookie) {
      cabeceras.cookie = req.headers.cookie.replace(/(^|;\s*)local-/g, '$1__Secure-');
    }
    const r = await fetch(ARRIBA + req.url, { method: req.method, headers: cabeceras,
                                              body: cuerpo, redirect: 'manual' });
    const salida = {};
    r.headers.forEach((v, k) => { if (!/^(content-encoding|content-length|transfer-encoding)$/.test(k)) salida[k] = v; });
    // Set-Cookie llega con Secure; en http local el navegador la tiraría.
    const puestas = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
    if (puestas.length) {
      // En http local hay que quitar Secure, y con él el prefijo
      // __Secure- del nombre: Chromium rechaza una cookie con ese prefijo
      // que no venga por https. Se renombra a local- en los dos sentidos.
      res.setHeader('set-cookie', puestas.map((c) =>
        c.replace(/^__Secure-/, 'local-')
         .replace(/;\s*Secure/ig, '').replace(/;\s*SameSite=None/ig, '; SameSite=Lax')
         .replace(/;\s*Partitioned/ig, '')));
      delete salida['set-cookie'];
    }
    res.writeHead(r.status, salida);
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }

  let p = decodeURIComponent(u.pathname);
  if (p.endsWith('/')) p += 'index.html';
  let f = path.join(RAIZ, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    // igual que _redirects: los paneles son de una sola página
    const m = p.match(/^\/(trabajador|admin)\//);
    if (m) f = path.join(RAIZ, m[1], 'index.html');
  }
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    // Las páginas del catálogo ya no son archivos: se piden a producción.
    const r = await fetch(ARRIBA + req.url, { redirect: 'manual' });
    const salida = {};
    r.headers.forEach((v, k) => { if (!/^(content-encoding|content-length|transfer-encoding)$/.test(k)) salida[k] = v; });
    if (salida.location) salida.location = salida.location.replace(ARRIBA, '');
    res.writeHead(r.status, salida);
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(8900, () => console.log('local en http://127.0.0.1:8900'));
