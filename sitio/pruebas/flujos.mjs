// Flujos de interfaz de punta a punta: equipo, admin y catálogo público.
// El catálogo público se mira directo en producción (solo lectura); los
// paneles van por el arnés local que reenvía /auth y /api a producción.
import { chromium } from 'playwright';
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync(process.env.QA_ENV || '/tmp/pw/qa.env', 'utf8').trim().split('\n').map((l) => l.split('=')));
const S = 'https://euchel-catalogo.netlify.app';
const B = 'http://127.0.0.1:8900';
let fallos = 0;
const ok = (n, c, d = '') => { console.log(`${c ? 'ok ' : 'FALLA'} ${n}${d ? '  · ' + d : ''}`); if (!c) fallos++; };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errores = [];
const pagina = async (opts = {}) => {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ...opts })).newPage();
  p.on('pageerror', (e) => errores.push(p.url() + ': ' + e.message));
  p.on('dialog', (d) => d.accept());
  return p;
};
const entrar = async (p, ruta, email, clave, espera) => {
  await p.goto(B + ruta, { waitUntil: 'networkidle' });
  await p.waitForSelector('#entrada:not([hidden])', { timeout: 15000 });
  await p.fill('input[name=email]', email);
  await p.fill('input[name=clave]', clave);
  await p.click('#btn-entrar');
  await p.waitForSelector(espera, { timeout: 25000 });
};

/* ------------------------------------------------------------- equipo */
console.log('== panel del equipo');
const e = await pagina();
await entrar(e, '/trabajador/', 'qa.equipo@euchel.pe', env.CLAVE_EQUIPO, '.tarjeta');
ok('equipo entra', (await e.textContent('#rol')).trim() === 'Equipo');
ok('equipo no ve el enlace Admin', await e.locator('#a-admin').isHidden());

// filtros
await e.click('.ficha[data-estado=oculto]');
await e.waitForTimeout(1800);
const cuentaOcultos = (await e.textContent('#cuenta')).trim();
ok('filtro Ocultos muestra los 210', /de 210 /.test(cuentaOcultos), cuentaOcultos);
ok('equipo no tiene filtro Archivados', (await e.locator('.ficha[data-estado=archivado]').count()) === 0);
await e.click('.ficha[data-estado=""]');
await e.waitForTimeout(1500);

// paginación
await e.click('#btn-mas');
await e.waitForTimeout(2000);
ok('"Ver más" carga 48', /^48 de 962/.test((await e.textContent('#cuenta')).trim()), (await e.textContent('#cuenta')).trim());

// buscar por nombre
await e.fill('#q', 'top raisa');
await e.waitForTimeout(1500);
ok('buscar por nombre', (await e.locator('.tarjeta').count()) >= 1 && /TOP RAISA/.test(await e.textContent('.tarjeta__nombre >> nth=0')));

// hoja: sin precio ni archivar para el equipo
await e.click('.tarjeta__nombre >> nth=0');
await e.waitForSelector('#btn-nuevo-color', { timeout: 15000 });
ok('equipo no ve precio ni archivar en la hoja', (await e.locator('#forma-precio').count()) === 0 && (await e.locator('#btn-archivar').count()) === 0);
ok('equipo ve fotos, colores y datos', (await e.locator('#entrada-foto').count()) === 1 && (await e.locator('#forma-datos').count()) === 1);
ok('enlace al catálogo (producto visible)', /Ver en el catálogo/.test(await e.textContent('.pie-hoja')));
await e.keyboard.press('Escape');
await e.waitForTimeout(400);

// agotar desde la tarjeta y ver la ficha pública en el acto
const refAntes = (await e.textContent('.tarjeta .tarjeta__meta >> nth=0')).trim();
await e.click('.tarjeta .palanca[data-campo=agotado] >> nth=0');
await e.waitForTimeout(2500);
let f = await (await fetch(`${S}/p/1367-top-raisa/`)).text();
ok('agotado desde equipo => ficha pública desactivada al instante', f.includes('aria-disabled="true"'));
await e.click('.tarjeta .palanca[data-campo=agotado] >> nth=0');
await e.waitForTimeout(2500);
f = await (await fetch(`${S}/p/1367-top-raisa/`)).text();
ok('disponible otra vez => ficha pública con botón', f.includes('Continuar compra') && !f.includes('aria-disabled'));

// cambiar clave y volver a entrar
await e.click('#btn-clave');
await e.waitForSelector('#forma-clave');
const nueva = env.CLAVE_EQUIPO + 'x';
await e.fill('input[name=actual]', env.CLAVE_EQUIPO);
await e.fill('input[name=nueva]', nueva);
await e.fill('input[name=repetir]', nueva);
await e.click('#forma-clave button');
await e.waitForTimeout(3000);
await e.click('#btn-salir');
await e.waitForSelector('#entrada:not([hidden])', { timeout: 10000 });
await e.fill('input[name=email]', 'qa.equipo@euchel.pe');
await e.fill('input[name=clave]', nueva);
await e.click('#btn-entrar');
await e.waitForSelector('.tarjeta', { timeout: 25000 });
ok('cambio de clave y reingreso', true);
fs.writeFileSync(process.env.QA_ENV || '/tmp/pw/qa.env', Object.entries({ ...env, CLAVE_EQUIPO: nueva }).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');

// recarga: la sesión sobrevive
await e.reload({ waitUntil: 'networkidle' });
await e.waitForSelector('.tarjeta', { timeout: 25000 });
ok('la sesión sobrevive a una recarga', await e.locator('#panel').isVisible());
await e.close();

/* ------------------------------------------------------------- cuenta 'user' */
console.log('== cuenta registrada por su cuenta');
const u = await pagina();
await u.goto(B + '/trabajador/', { waitUntil: 'networkidle' });
await u.waitForSelector('#entrada:not([hidden])');
await u.fill('input[name=email]', 'qa.user@euchel.pe');
await u.fill('input[name=clave]', env.CLAVE_USER);
await u.click('#btn-entrar');
await u.waitForTimeout(4000);
ok('rol user: no entra y ve por qué', await u.locator('#panel').isHidden() && /permiso|acceso/i.test(await u.textContent('#entrada-error')), (await u.textContent('#entrada-error')).trim());
await u.close();

/* ------------------------------------------------------------- admin */
console.log('== panel de administración');
const a = await pagina();
await entrar(a, '/admin/', env.ADMIN_EMAIL, env.ADMIN_CLAVE, '.kpi');
ok('admin ve el tablero', (await a.locator('.kpi').count()) === 4);

await a.click('.pestana[data-hoja=productos]');
await a.waitForSelector('.tarjeta', { timeout: 20000 });
ok('admin tiene filtro Archivados', (await a.locator('.ficha[data-estado=archivado]').count()) === 1);
await a.click('.tarjeta__nombre >> nth=0');
await a.waitForSelector('#forma-precio', { timeout: 15000 });
ok('admin ve precio y archivar/eliminar', (await a.locator('#btn-archivar').count()) + (await a.locator('#btn-borrar').count()) === 1);
await a.keyboard.press('Escape');
await a.waitForTimeout(400);

await a.click('.pestana[data-hoja=equipo]');
await a.waitForSelector('.cuenta-fila', { timeout: 15000 });
const filas = await a.locator('.cuenta-fila').allTextContents();
ok('equipo lista las cuentas con su rol', filas.some((t) => /qa\.equipo@euchel\.pe.*Equipo/s.test(t)) && filas.some((t) => /qa\.user@euchel\.pe.*Sin acceso/s.test(t)), `${filas.length} cuentas`);

await a.click('.pestana[data-hoja=bitacora]');
await a.waitForSelector('.movimiento', { timeout: 15000 });
const mov = await a.locator('.movimiento').allTextContents();
ok('bitácora muestra lo que hizo el equipo con el nombre del producto', mov.some((t) => /qa\.equipo@euchel\.pe/.test(t) && /TOP RAISA/.test(t)), mov[0]?.replace(/\s+/g, ' ').slice(0, 90));
await a.close();

/* ------------------------------------------------------------- público */
console.log('== catálogo público');
const c = await pagina();
await c.goto(B + '/p/1367-top-raisa/', { waitUntil: 'networkidle' });
await c.waitForTimeout(1200);
ok('ficha pública: título y precio', /TOP RAISA/.test(await c.textContent('h1')) && /S\/ 45/.test(await c.textContent('.ficha__precio')));
const tallas = await c.locator('[data-tallas] .chip').count();
ok('tallas visibles en la ficha', tallas >= 1, `${tallas} tallas`);
if (tallas > 1) await c.click('[data-tallas] .chip >> nth=1');
await c.waitForTimeout(300);
const href = await c.getAttribute('[data-cta]', 'href');
const msg = decodeURIComponent((href || '').split('text=')[1] || '');
ok('botón Continuar compra apunta a WhatsApp con nombre, Ref. y enlace del producto',
   /wa\.me\/51986630221\?text=/.test(href || '') && /TOP RAISA/.test(msg) && /Ref\. 1367/.test(msg) && /\/p\/1367-top-raisa\//.test(msg),
   msg.replace(/\n/g, ' | ').slice(0, 160));
ok('el mensaje lleva la talla elegida', /Talla: /.test(msg), msg.match(/Talla: [^\n|]*/)?.[0]);

await c.goto(B + '/', { waitUntil: 'networkidle' });
await c.waitForTimeout(800);
ok('portada: 752 tarjetas y menú completo', (await c.locator('.tarjeta').count()) >= 750 && (await c.locator('.menu a').count()) === 22, `${await c.locator('.tarjeta').count()} tarjetas`);
await c.fill('#q', 'raisa');
await c.waitForTimeout(1800);
ok('buscador público encuentra por nombre', (await c.locator('.buscador__item').count()) >= 1, `${await c.locator('.buscador__item').count()} resultados`);
await c.click('.menu a[href="/c/pantalones/"]');
await c.waitForSelector('h1', { timeout: 20000 });
ok('navegar a una categoría', /Pantalones/i.test(await c.textContent('h1')) && (await c.locator('.tarjeta').count()) >= 40);
await c.goto(B + '/p/9-flare-pants-chompero/', { waitUntil: 'networkidle' });
ok('producto oculto => página de no encontrado con menú', /No encontramos/.test(await c.textContent('h1')) && (await c.locator('.menu a').count()) === 22);
await c.close();

await b.close();
ok('sin errores de JavaScript en ninguna página', errores.length === 0, errores.join(' || ').slice(0, 300));
console.log(fallos ? `\n${fallos} FALLOS` : '\ntodo ok');
process.exit(fallos ? 1 : 0);
