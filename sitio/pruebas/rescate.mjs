// El rescate de fotos: Netlify contesta 404 de vez en cuando para archivos
// que están, y la página tiene que volver a pedirlos sola.
//
// Sirve la portada real de producción en un servidor propio que falla a
// propósito la primera petición de cada foto, y comprueba que al final no
// queda ni un hueco.
//
//   node sitio/pruebas/rescate.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const SITIO = 'https://euchel-catalogo.netlify.app';
const DISCO = process.env.DIST || '/tmp/euchel-paquete/dist';   // las fotos, de aquí
const PUERTO = 8911;

const fallados = new Set();
let fallos = 0, servidas = 0;

const servidor = createServer(async (pet, res) => {
  const u = new URL(pet.url, `http://localhost:${PUERTO}`);
  const clave = u.pathname;

  // Primera vez que se pide una foto: 404, como hace Netlify a veces.
  if (clave.startsWith('/img/') && !fallados.has(clave)) {
    fallados.add(clave);
    fallos++;
    res.writeHead(404, { 'content-type': 'text/html', 'cache-control': 'no-store' });
    res.end('<html>no encontrada</html>');
    return;
  }

  // Las fotos, del paquete en disco: así se prueba el rescate y no la red.
  if (clave.startsWith('/img/')) {
    try {
      const bytes = await readFile(DISCO + clave);
      servidas++;
      res.writeHead(200, { 'content-type': 'image/webp', 'cache-control': 'no-store' });
      res.end(bytes);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
      res.end('no está en el paquete');
    }
    return;
  }

  // La página, de producción: es la que lleva el rescate dentro.
  const r = await fetch(SITIO + pet.url, { headers: { 'user-agent': 'prueba-rescate' } });
  const cuerpo = Buffer.from(await r.arrayBuffer());
  res.writeHead(r.status, {
    'content-type': r.headers.get('content-type') || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  res.end(cuerpo);
});

await new Promise((listo) => servidor.listen(PUERTO, '127.0.0.1', listo));

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route('**fonts.googleapis.com**', (r) => r.abort());
const pagina = await ctx.newPage();
await pagina.goto(`http://localhost:${PUERTO}/`, { waitUntil: 'load' });

// Baja despacio para que entren en pantalla unas cuantas filas.
for (let i = 0; i < 6; i++) {
  await pagina.mouse.wheel(0, 900);
  await pagina.waitForTimeout(700);
}
await pagina.waitForTimeout(2500);

const cuenta = await pagina.evaluate(() => {
  const fotos = [...document.querySelectorAll('.tarjeta img')];
  const pedidas = fotos.filter((i) => i.currentSrc || i.complete);
  return {
    total: fotos.length,
    rotas: pedidas.filter((i) => i.complete && i.naturalWidth === 0).length,
    cargadas: fotos.filter((i) => i.naturalWidth > 0).length,
    reintentadas: fotos.filter((i) => i.hasAttribute('data-reintento')).length,
  };
});

console.log(`fotos falladas a propósito: ${fallos} · servidas tras reintento: ${servidas}`);
console.log(`en la página: ${cuenta.cargadas} cargadas · ${cuenta.rotas} rotas · ${cuenta.reintentadas} reintentadas`);
const bien = cuenta.rotas === 0 && cuenta.cargadas > 0 && cuenta.reintentadas > 0;
console.log(bien ? 'ok: ningún hueco' : 'MAL: quedan huecos');

await navegador.close();
servidor.close();
process.exit(bien ? 0 : 1);
