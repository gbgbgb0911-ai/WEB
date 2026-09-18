/* Panel de administración.
 *
 * Cuatro secciones:
 *
 *   Pedidos    — qué se está pidiendo por WhatsApp. No son ventas cerradas:
 *                son clics en "Continuar compra", o sea intención. Se dice
 *                así en pantalla para que nadie lo confunda con caja.
 *   Productos  — la misma lista del equipo, más precio y archivo.
 *   Equipo     — crear cuentas, cambiar rol, suspender. Habla directo con
 *                /auth/admin/*, que Neon ya limita a rol admin; no hace
 *                falta una función propia que sea una segunda puerta.
 *   Bitácora   — quién cambió qué y cuándo.
 */

import { entrar, salir, api, sesionAbierta, ErrorPermiso, ErrorSesion, ErrorRed }
  from '/panel/sesion.js';
import { $, escapar, moneda, numero, fecha, brindis, hacerFallo, vigilarSenal,
         montarHoja, montarPWA, cerrarHoja } from '/panel/ui.js';
import { crearLista } from '/panel/lista.js';

const AUTH = '/auth';

let yo = null;
let lista = null;
let dias = 30;
let paginaBitacora = 1;
let movimientos = [];

/* --------------------------------------------------------------- pantallas */

function aEntrada(mensaje) {
  yo = null;
  $('#panel').hidden = true;
  $('#entrada').hidden = false;
  cerrarHoja();
  const caja = $('#entrada-error');
  caja.textContent = mensaje || '';
  caja.classList.toggle('oculto', !mensaje);
}

const fallo = hacerFallo(aEntrada);

function aPanel() {
  $('#entrada').hidden = true;
  $('#panel').hidden = false;
  $('#quien').textContent = yo.nombre || yo.email;
  if (!lista) lista = crearLista({ rol: yo.rol, fallo });
}

$('#forma-entrar').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const boton = $('#btn-entrar');
  const datos = new FormData(ev.target);
  const caja = $('#entrada-error');

  boton.disabled = true;
  boton.textContent = 'Entrando…';
  caja.classList.add('oculto');
  try {
    const sesion = await entrar(datos.get('email'), datos.get('clave'));
    if (sesion.rol !== 'admin') {
      // Entró bien, pero este panel no es el suyo. Se le manda al que sí.
      caja.innerHTML = 'Tu cuenta es del equipo, no de administración. '
        + '<a href="/trabajador/" style="text-decoration:underline">Ir a tu panel</a>.';
      caja.classList.remove('oculto');
      return;
    }
    yo = sesion;
    ev.target.reset();
    aPanel();
    await cargarSeccion('tablero');
  } catch (e) {
    caja.textContent = e instanceof ErrorPermiso ? e.message : (e.message || 'No se pudo entrar.');
    caja.classList.remove('oculto');
  } finally {
    boton.disabled = false;
    boton.textContent = 'Entrar';
  }
});

$('#btn-salir').addEventListener('click', async () => {
  await salir();
  brindis('Sesión cerrada.');
  aEntrada('');
});

/* --------------------------------------------------------------- pestañas */

const SECCIONES = ['tablero', 'productos', 'equipo', 'bitacora'];
const cargada = new Set();

document.querySelectorAll('.pestana').forEach((b) => {
  b.addEventListener('click', () => cargarSeccion(b.dataset.hoja));
});

async function cargarSeccion(cual) {
  document.querySelectorAll('.pestana').forEach((p) =>
    p.setAttribute('aria-selected', String(p.dataset.hoja === cual)));
  SECCIONES.forEach((s) => $('#hoja-' + s).classList.toggle('oculto', s !== cual));

  if (cargada.has(cual)) return;
  cargada.add(cual);
  try {
    if (cual === 'tablero') await tablero();
    else if (cual === 'productos') await lista.listar(true);
    else if (cual === 'equipo') await cuentas();
    else if (cual === 'bitacora') await bitacora(true);
  } catch (e) { cargada.delete(cual); fallo(e); }
}

/* ---------------------------------------------------------------- pedidos */

document.querySelectorAll('[data-dias]').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-dias]').forEach((o) =>
      o.setAttribute('aria-pressed', String(o === b)));
    dias = Number(b.dataset.dias);
    tablero();
  });
});

async function tablero() {
  const caja = $('#tablero');
  caja.innerHTML = '<div class="esqueleto" style="height:150px"></div>';
  let d;
  try { d = await api('tablero?dias=' + dias); }
  catch (e) { caja.innerHTML = ''; fallo(e); return; }

  const c = d.catalogo;
  const kpis = `
    <div class="kpis">
      <div class="kpi"><div class="kpi__cifra">${numero(d.clics)}</div>
        <div class="kpi__nota">pedidos abiertos por WhatsApp</div></div>
      <div class="kpi" style="animation-delay:60ms"><div class="kpi__cifra">${numero(d.productos_pedidos)}</div>
        <div class="kpi__nota">productos distintos pedidos</div></div>
      <div class="kpi" style="animation-delay:120ms"><div class="kpi__cifra">${moneda(d.valor)}</div>
        <div class="kpi__nota">suma de lo pedido, si se cerrara todo</div></div>
      <div class="kpi" style="animation-delay:180ms"><div class="kpi__cifra">${numero(c.activos)}</div>
        <div class="kpi__nota">productos a la venta ahora</div></div>
    </div>`;

  const aviso = d.clics === 0 ? `
    <div class="aviso" style="margin-top:12px">
      Todavía no hay pedidos en este periodo. El contador empieza cuando alguien
      toca "Continuar compra" en el catálogo.
    </div>` : '';

  caja.innerHTML = kpis + aviso
    + bloque('Pedidos por día', porDia(d.por_dia))
    + bloque('Lo más pedido', masPedidos(d.mas_pedidos))
    + bloque('Por categoría', barras(d.por_categoria, 'categoria'))
    + bloque('Colores más pedidos', barras(d.por_color, 'color'))
    + bloque('Tallas más pedidas', barras(d.por_talla, 'talla'))
    + bloque('Estado del catálogo', `
        <div class="barras">
          ${fila('A la venta', c.activos, c.total)}
          ${fila('Agotados', c.agotados, c.total)}
          ${fila('Ocultos', c.ocultos, c.total)}
          ${fila('Archivados', c.archivados, c.total)}
        </div>
        <p class="tarjeta__meta" style="margin-top:8px">${numero(c.total)} productos en total.</p>`);

}


// Tocar un producto del ranking lo abre en la pestaña de productos, buscado
// por su Ref. Se registra una vez: dentro de tablero() se acumulaba uno por
// cada cambio de periodo.
$('#tablero').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-ver]');
  if (!b) return;
  cargarSeccion('productos');
  const q = $('#q');
  q.value = b.dataset.ver;
  q.dispatchEvent(new Event('input'));
});

function bloque(titulo, dentro) {
  return `<section class="bloque"><h2 class="bloque__titulo">${escapar(titulo)}</h2>${dentro}</section>`;
}

function fila(etiqueta, valor, tope) {
  const pct = tope > 0 ? Math.round((valor / tope) * 100) : 0;
  return `<div class="barra">
      <span class="barra__etiqueta">${escapar(etiqueta)}</span>
      <span class="barra__cifra">${numero(valor)}</span>
      <span class="barra__pista"><span class="barra__relleno" style="--hasta:${pct}%"></span></span>
    </div>`;
}

function barras(items, clave) {
  if (!items || !items.length) return '<p class="tarjeta__meta">Sin datos todavía.</p>';
  const tope = Math.max(...items.map((i) => i.clics));
  return '<div class="barras">' +
    items.map((i) => fila(i[clave], i.clics, tope)).join('') + '</div>';
}

function porDia(serie) {
  if (!serie || !serie.length) return '<p class="tarjeta__meta">Sin datos todavía.</p>';
  const tope = Math.max(...serie.map((d) => d.clics), 1);
  const barritas = serie.map((d, i) => {
    const alto = Math.round((d.clics / tope) * 100);
    return `<span class="dia${d.clics ? '' : ' dia--cero'}"
      style="--hasta:${Math.max(alto, 2)}%; animation-delay:${Math.min(i, 30) * 12}ms"
      title="${d.dia}: ${d.clics}"></span>`;
  }).join('');
  return `<div class="dias">${barritas}</div>
    <div class="dias__pie"><span>${serie[0].dia}</span><span>${serie[serie.length - 1].dia}</span></div>`;
}

function masPedidos(items) {
  if (!items || !items.length) return '<p class="tarjeta__meta">Sin datos todavía.</p>';
  return items.map((p, i) => {
    const sellos = [];
    if (p.agotado) sellos.push('agotado');
    if (!p.visible) sellos.push('oculto');
    return `<div class="pedido">
        <span class="pedido__puesto">${i + 1}</span>
        ${p.foto ? `<img class="pedido__foto" src="/img/webp/${escapar(p.foto)}-thumb.webp"
                        alt="" loading="lazy" width="52" height="64">`
                 : '<div class="pedido__foto"></div>'}
        <div>
          <button class="pedido__nombre" type="button" data-ver="${p.id}">${escapar(p.nombre)}</button>
          <div class="pedido__meta">Ref. ${p.id} · ${moneda(p.precio)}${
            sellos.length ? ' · ' + sellos.join(' y ') : ''}</div>
        </div>
        <span class="pedido__clics">${numero(p.clics)}</span>
      </div>`;
  }).join('');
}

/* ----------------------------------------------------------------- equipo */

async function authAdmin(ruta, opciones = {}) {
  const r = await fetch(`${AUTH}/admin/${ruta}`, {
    credentials: 'include',
    ...opciones,
    headers: { 'content-type': 'application/json', ...(opciones.headers || {}) },
    body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : opciones.body,
    method: opciones.cuerpo !== undefined ? 'POST' : (opciones.method || 'GET'),
  }).catch(() => { throw new ErrorRed('Sin conexión.'); });

  const cuerpo = await r.json().catch(() => null);
  if (r.status === 401) throw new ErrorSesion('Tu sesión venció. Entra otra vez.');
  if (r.status === 403) throw new ErrorPermiso('Tu cuenta no puede administrar usuarios.');
  if (!r.ok) throw new Error((cuerpo && cuerpo.message) || `Error ${r.status}.`);
  return cuerpo;
}

async function cuentas() {
  const caja = $('#cuentas');
  caja.innerHTML = '<div class="esqueleto" style="height:90px"></div>';
  let d;
  try { d = await authAdmin('list-users?limit=100'); }
  catch (e) { caja.innerHTML = ''; fallo(e); return; }

  const usuarios = (d.users || []).slice().sort((a, b) =>
    (a.name || a.email).localeCompare(b.name || b.email, 'es'));

  caja.innerHTML = usuarios.map((u) => {
    const soyYo = u.id === yo.id;
    const rol = u.role === 'admin' ? 'Administración'
      : u.role === 'trabajadora' ? 'Equipo'
      : 'Sin acceso';
    return `<div class="cuenta-fila${soyYo ? ' cuenta-fila--yo' : ''}" data-usuario="${u.id}">
        <div>
          <b>${escapar(u.name || u.email)}</b>
          <div class="tarjeta__meta">${escapar(u.email)} · ${rol}${
            u.banned ? ' · suspendida' : ''}${soyYo ? ' · tú' : ''}</div>
        </div>
        <div class="cuenta-acciones">
          ${soyYo ? '' : `
          <button class="palanca" type="button" data-rol="${u.role === 'admin' ? 'trabajadora' : 'admin'}">
            ${u.role === 'admin' ? 'Pasar a equipo' : 'Hacer admin'}</button>
          <button class="palanca" type="button" data-ban="${u.banned ? '0' : '1'}"
                  aria-pressed="${!!u.banned}">${u.banned ? 'Reactivar' : 'Suspender'}</button>`}
        </div>
      </div>`;
  }).join('');
}

$('#cuentas').addEventListener('click', async (ev) => {
  const fila = ev.target.closest('[data-usuario]');
  const boton = ev.target.closest('button');
  if (!fila || !boton) return;
  const id = fila.dataset.usuario;
  boton.disabled = true;

  try {
    if (boton.dataset.rol) {
      await authAdmin('set-role', { cuerpo: { userId: id, role: boton.dataset.rol } });
      brindis('Rol cambiado.');
    } else if (boton.dataset.ban === '1') {
      if (!confirm('¿Suspender esta cuenta? Deja de poder entrar, pero no se borra.')) {
        boton.disabled = false; return;
      }
      await authAdmin('ban-user', { cuerpo: { userId: id } });
      brindis('Cuenta suspendida.');
    } else {
      await authAdmin('unban-user', { cuerpo: { userId: id } });
      brindis('Cuenta reactivada.');
    }
    await cuentas();
  } catch (e) { fallo(e); boton.disabled = false; }
});

$('#forma-cuenta').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const forma = ev.target;
  const boton = forma.querySelector('button[type=submit]');
  const datos = new FormData(forma);
  const aviso = $('#equipo-aviso');

  boton.disabled = true;
  aviso.classList.add('oculto');
  try {
    await authAdmin('create-user', { cuerpo: {
      email: String(datos.get('email')).trim(),
      password: datos.get('clave'),
      name: String(datos.get('nombre')).trim(),
      role: datos.get('rol'),
    } });
    forma.reset();
    aviso.className = 'aviso';
    aviso.textContent = 'Cuenta creada. Pásale la clave por un medio privado.';
    await cuentas();
  } catch (e) {
    aviso.className = 'aviso aviso--malo';
    aviso.textContent = e.message || 'No se pudo crear la cuenta.';
    if (e instanceof ErrorSesion) { fallo(e); return; }
  } finally {
    boton.disabled = false;
  }
});

/* --------------------------------------------------------------- bitácora */

const QUE = {
  'cambiar-estado': 'cambió el estado',
  'cambiar-precio': 'cambió el precio',
  'archivar': 'archivó',
  'desarchivar': 'sacó del archivo',
};

async function bitacora(limpio) {
  const caja = $('#bitacora');
  const mas = $('#btn-mas-bitacora');
  if (limpio) { paginaBitacora = 1; movimientos = []; caja.innerHTML = '<div class="esqueleto" style="height:90px"></div>'; }

  let d;
  try { d = await api('bitacora?pagina=' + paginaBitacora); }
  catch (e) { if (limpio) caja.innerHTML = ''; fallo(e); return; }

  movimientos = movimientos.concat(d.movimientos);
  if (!movimientos.length) {
    caja.innerHTML = '<p class="vacio">Todavía no hay movimientos.</p>';
    mas.classList.add('oculto');
    return;
  }

  caja.innerHTML = `<section class="bloque">` + movimientos.map((m) => {
    const antes = resumirEstado(m.antes);
    const luego = resumirEstado(m.despues);
    return `<div class="movimiento">
        <div class="movimiento__tope">
          <b>${escapar(m.actor)}</b>
          <span class="movimiento__cuando">${escapar(fecha(m.creado_en))}</span>
        </div>
        <div class="movimiento__que">
          ${escapar(QUE[m.accion] || m.accion)} ·
          ${escapar(m.nombre || `${m.entidad} ${m.entidad_id}`)}
          ${luego ? `<br>${antes ? escapar(antes) + ' → ' : ''}${escapar(luego)}` : ''}
        </div>
      </div>`;
  }).join('') + '</section>';

  const hayMas = d.movimientos.length === 40;
  mas.classList.toggle('oculto', !hayMas);
  mas.disabled = false;
  mas.textContent = 'Ver más';
}

function resumirEstado(v) {
  if (!v || typeof v !== 'object') return '';
  const partes = [];
  if ('agotado' in v) partes.push(v.agotado ? 'agotado' : 'disponible');
  if ('visible' in v) partes.push(v.visible ? 'visible' : 'oculto');
  if ('archivado' in v) partes.push(v.archivado ? 'archivado' : 'en el panel');
  if ('precio' in v) partes.push(moneda(v.precio));
  return partes.join(', ');
}

$('#btn-mas-bitacora').addEventListener('click', () => {
  paginaBitacora += 1;
  $('#btn-mas-bitacora').textContent = 'Cargando…';
  $('#btn-mas-bitacora').disabled = true;
  bitacora(false);
});

/* -------------------------------------------------------------- arranque */

vigilarSenal();
montarHoja();
montarPWA('/admin/sw.js', '/admin/');

(async function arrancar() {
  $('#entrada').hidden = true;
  $('#panel').hidden = false;
  $('#tablero').innerHTML = '<div class="esqueleto" style="height:150px"></div>';

  let sesion;
  try { sesion = await sesionAbierta(); }
  catch (e) { $('#tablero').innerHTML = ''; aEntrada('Sin conexión. Conéctate y vuelve a intentar.'); return; }

  if (!sesion) { $('#tablero').innerHTML = ''; aEntrada(''); return; }
  if (sesion.rol !== 'admin') {
    location.replace('/trabajador/');
    return;
  }
  yo = sesion;
  aPanel();
  await cargarSeccion('tablero');
})();
