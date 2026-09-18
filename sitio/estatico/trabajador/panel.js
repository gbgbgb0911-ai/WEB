/* Panel de la trabajadora.
 *
 * Lo que puede hacer: buscar un producto (por nombre o por la "Ref." que le
 * llega en el mensaje de WhatsApp), marcarlo agotado, ocultarlo del catálogo,
 * y agotar un color o una talla suelta. Nada se borra: ocultar es reversible
 * y queda anotado en la bitácora con su correo.
 *
 * Los cambios se aplican en pantalla antes de que responda el servidor, y si
 * el servidor dice que no, se revierten. Con el celular en la calle eso es la
 * diferencia entre un panel usable y uno que se siente roto.
 */

import { entrar, salir, api, sesionAbierta, ErrorSesion, ErrorPermiso, esRed }
  from '/panel/sesion.js';

const $ = (s) => document.querySelector(s);

const vista = {
  entrada: $('#entrada'), panel: $('#panel'), lista: $('#lista'),
  cuenta: $('#cuenta'), vacio: $('#vacio'), mas: $('#btn-mas'),
  hoja: $('#hoja'), velo: $('#velo'), brindis: $('#brindis'),
  sinsenal: $('#sinsenal'), q: $('#q'), cat: $('#cat'), limpiar: $('#limpiar'),
};

let yo = null;
let filtro = { q: '', estado: '', cat: '', pagina: 1 };
let total = 0;
let cargados = [];
let peticion = 0;          // para descartar respuestas viejas

/* ------------------------------------------------------------------ avisos */

let tiempoBrindis;
function brindis(texto, malo = false) {
  vista.brindis.textContent = texto;
  vista.brindis.classList.toggle('brindis--malo', malo);
  vista.brindis.classList.add('esta');
  clearTimeout(tiempoBrindis);
  tiempoBrindis = setTimeout(() => vista.brindis.classList.remove('esta'), malo ? 4200 : 2200);
}

function fallo(e) {
  if (e instanceof ErrorSesion) { aEntrada(e.message); return; }
  if (e instanceof ErrorPermiso) { brindis(e.message, true); return; }
  brindis(esRed(e) ? 'Sin conexión. Vuelve a intentar.' : (e.message || 'Algo falló.'), true);
}

function senal() {
  vista.sinsenal.classList.toggle('oculto', navigator.onLine);
}
addEventListener('online', senal);
addEventListener('offline', senal);

/* ---------------------------------------------------------------- pantallas */

function aEntrada(mensaje) {
  yo = null;
  vista.panel.hidden = true;
  vista.entrada.hidden = false;
  cerrarHoja();
  const caja = $('#entrada-error');
  caja.textContent = mensaje || '';
  caja.classList.toggle('oculto', !mensaje);
}

function aPanel() {
  vista.entrada.hidden = true;
  vista.panel.hidden = false;
  $('#quien').textContent = yo.nombre || yo.email;
  $('#rol').textContent = yo.rol === 'admin' ? 'Administración' : 'Equipo';
}

/* ------------------------------------------------------------------ entrar */

$('#forma-entrar').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const boton = $('#btn-entrar');
  const datos = new FormData(ev.target);
  const caja = $('#entrada-error');

  boton.disabled = true;
  boton.textContent = 'Entrando…';
  caja.classList.add('oculto');
  try {
    yo = await entrar(datos.get('email'), datos.get('clave'));
    ev.target.reset();
    aPanel();
    await listar(true);
  } catch (e) {
    caja.textContent = e instanceof ErrorPermiso
      ? e.message
      : (e.message || 'No se pudo entrar.');
    caja.classList.remove('oculto');
  } finally {
    boton.disabled = false;
    boton.textContent = 'Entrar';
  }
});

$('#btn-salir').addEventListener('click', async () => {
  await salir();
  aEntrada('');
});

/* ------------------------------------------------------------------ listado */

function esqueletos(n) {
  vista.lista.innerHTML = Array.from({ length: n },
    () => '<li class="esqueleto"></li>').join('');
}

function moneda(v) {
  return v === null || v === undefined ? '—' : 'S/ ' + Number(v).toFixed(2);
}

function tarjeta(p) {
  const li = document.createElement('li');
  li.className = 'tarjeta' + (p.visible ? '' : ' tarjeta--oculta');
  li.dataset.id = p.id;

  const foto = p.foto
    ? `<img class="tarjeta__foto" src="/img/webp/${p.foto}-thumb.webp" alt=""
            loading="lazy" width="78" height="96">`
    : '<div class="tarjeta__foto"></div>';

  const sellos = [];
  if (p.agotado) sellos.push('<span class="sello sello--agotado">Agotado</span>');
  if (!p.visible) sellos.push('<span class="sello sello--oculto">Oculto</span>');
  if (!p.agotado && p.colores_agotados > 0) {
    sellos.push(`<span class="sello sello--parcial">${p.colores_agotados} de ${p.colores} sin stock</span>`);
  }

  li.innerHTML = foto + `
    <div class="tarjeta__cuerpo">
      <button class="tarjeta__nombre" type="button" data-abrir="${p.id}">${escapar(p.nombre)}</button>
      <div class="tarjeta__meta">Ref. ${p.id}${p.categoria ? ' · ' + escapar(p.categoria) : ''}</div>
      <div class="tarjeta__precio">${moneda(p.precio)}</div>
      <div class="sellos">${sellos.join('')}</div>
      <div class="acciones">
        <button class="palanca" type="button" data-campo="agotado"
                aria-pressed="${p.agotado}">${p.agotado ? 'Agotado' : 'Agotar'}</button>
        <button class="palanca" type="button" data-campo="visible"
                aria-pressed="${!p.visible}">${p.visible ? 'Ocultar' : 'Oculto'}</button>
      </div>
    </div>`;
  return li;
}

function escapar(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function listar(limpio) {
  const mia = ++peticion;
  if (limpio) { filtro.pagina = 1; cargados = []; esqueletos(6); }
  vista.mas.disabled = true;

  const p = new URLSearchParams();
  if (filtro.q) p.set('q', filtro.q);
  if (filtro.estado) p.set('estado', filtro.estado);
  if (filtro.cat) p.set('cat', filtro.cat);
  p.set('pagina', String(filtro.pagina));

  let datos;
  try {
    datos = await api('productos?' + p.toString());
  } catch (e) {
    if (mia !== peticion) return;
    if (limpio) vista.lista.innerHTML = '';
    fallo(e);
    return;
  }
  if (mia !== peticion) return;

  total = datos.total;
  cargados = filtro.pagina === 1 ? datos.productos : cargados.concat(datos.productos);
  pintar();
  categorias(datos.categorias);
}

function pintar() {
  vista.lista.innerHTML = '';
  const trozo = document.createDocumentFragment();
  cargados.forEach((p) => trozo.appendChild(tarjeta(p)));
  vista.lista.appendChild(trozo);

  vista.vacio.classList.toggle('oculto', cargados.length > 0);
  vista.cuenta.textContent = total
    ? `${cargados.length} de ${total} producto${total === 1 ? '' : 's'}`
    : '';
  const hayMas = cargados.length < total;
  vista.mas.classList.toggle('oculto', !hayMas);
  vista.mas.disabled = false;
  vista.mas.textContent = 'Ver más';
}

let catsPuestas = false;
function categorias(cats) {
  if (catsPuestas || !cats) return;
  catsPuestas = true;
  vista.cat.innerHTML = '<option value="">Todas las categorías</option>' +
    cats.map((c) => `<option value="${c.subid}">${escapar(c.nombre)} (${c.cuantos})</option>`).join('');
  vista.cat.classList.remove('oculto');
  vista.cat.className = 'selector';
}

vista.mas.addEventListener('click', () => {
  filtro.pagina += 1;
  vista.mas.textContent = 'Cargando…';
  listar(false);
});

let tiempoBusca;
vista.q.addEventListener('input', () => {
  vista.limpiar.classList.toggle('oculto', !vista.q.value);
  clearTimeout(tiempoBusca);
  // 350 ms: escribir "TOP CELESTIA" no debería disparar doce consultas.
  tiempoBusca = setTimeout(() => {
    filtro.q = vista.q.value.trim();
    listar(true);
  }, 350);
});

vista.limpiar.addEventListener('click', () => {
  vista.q.value = '';
  vista.limpiar.classList.add('oculto');
  filtro.q = '';
  listar(true);
});

document.querySelectorAll('.ficha').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.ficha').forEach((o) =>
      o.setAttribute('aria-pressed', String(o === b)));
    filtro.estado = b.dataset.estado;
    listar(true);
  });
});

vista.cat.addEventListener('change', () => {
  filtro.cat = vista.cat.value;
  listar(true);
});

/* ------------------------------------------------------- cambios de estado */

vista.lista.addEventListener('click', async (ev) => {
  const abrir = ev.target.closest('[data-abrir]');
  if (abrir) { abrirHoja(Number(abrir.dataset.abrir)); return; }

  const boton = ev.target.closest('.palanca');
  if (!boton) return;

  const li = boton.closest('.tarjeta');
  const id = Number(li.dataset.id);
  const p = cargados.find((x) => x.id === id);
  if (!p) return;

  const campo = boton.dataset.campo;
  const antes = { agotado: p.agotado, visible: p.visible };
  const cuerpo = campo === 'agotado' ? { agotado: !p.agotado } : { visible: !p.visible };

  // Se pinta ya y se corrige si el servidor dice otra cosa.
  Object.assign(p, cuerpo);
  li.replaceWith(tarjeta(p));
  bloquear(id, true);

  try {
    const r = await api(`producto/${id}/estado`, { cuerpo });
    Object.assign(p, { agotado: r.agotado, visible: r.visible });
    brindis(mensajeDe(campo, p));
  } catch (e) {
    Object.assign(p, antes);
    fallo(e);
  } finally {
    const actual = vista.lista.querySelector(`[data-id="${id}"]`);
    if (actual) actual.replaceWith(tarjeta(p));
  }
});

function mensajeDe(campo, p) {
  if (campo === 'agotado') return p.agotado ? 'Marcado agotado.' : 'Vuelve a estar disponible.';
  return p.visible ? 'Visible en el catálogo.' : 'Oculto del catálogo.';
}

function bloquear(id, si) {
  const li = vista.lista.querySelector(`[data-id="${id}"]`);
  if (li) li.querySelectorAll('.palanca').forEach((b) => { b.disabled = si; });
}

/* ------------------------------------------------------------------- hoja */

let abierta = null;

function cerrarHoja() {
  abierta = null;
  vista.hoja.classList.remove('esta');
  vista.velo.classList.remove('esta');
  setTimeout(() => {
    if (abierta) return;
    vista.hoja.hidden = true;
    vista.velo.classList.add('oculto');
  }, 250);
}

vista.velo.addEventListener('click', cerrarHoja);
addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && abierta) cerrarHoja(); });

async function abrirHoja(id) {
  abierta = id;
  vista.velo.classList.remove('oculto');
  vista.hoja.hidden = false;
  vista.hoja.innerHTML = `
    <div class="hoja__tope">
      <h2 id="hoja-titulo">Cargando…</h2>
      <button class="hoja__cerrar" type="button" aria-label="Cerrar">&times;</button>
    </div>
    <div class="esqueleto" style="margin:16px 0"></div>`;
  requestAnimationFrame(() => {
    vista.velo.classList.add('esta');
    vista.hoja.classList.add('esta');
  });
  vista.hoja.querySelector('.hoja__cerrar').addEventListener('click', cerrarHoja);

  let d;
  try {
    d = await api(`producto/${id}`);
  } catch (e) { cerrarHoja(); fallo(e); return; }
  if (abierta !== id) return;
  pintarHoja(d);
}

let detalle = null;

function pintarHoja(d) {
  detalle = d;
  const porColor = (cid) => d.tallas.filter((t) => t.color_id === cid);

  const grupos = d.colores.map((c) => {
    const tallas = porColor(c.id);
    return `
      <div class="grupo" data-color="${c.id}">
        <div class="grupo__tope">
          <span class="grupo__nombre">${escapar(c.nombre)}</span>
          <button class="palanca" type="button" data-color="${c.id}"
                  aria-pressed="${c.agotado}">${c.agotado ? 'Agotado' : 'Agotar'}</button>
        </div>
        ${tallas.length ? `<div class="tallas">${tallas.map((t) => `
          <button class="talla" type="button" data-talla="${t.id}"
                  aria-pressed="${t.agotado}"
                  title="${t.agotado ? 'Agotada' : 'Disponible'}">${escapar(t.nombre)}</button>`).join('')}
        </div>` : '<div class="tarjeta__meta" style="margin-top:8px">Sin tallas registradas</div>'}
      </div>`;
  }).join('');

  vista.hoja.innerHTML = `
    <div class="hoja__tope">
      <h2 id="hoja-titulo">${escapar(d.nombre)}</h2>
      <button class="hoja__cerrar" type="button" aria-label="Cerrar">&times;</button>
    </div>
    <div class="tarjeta__meta" style="padding:10px 0 0">
      Ref. ${d.id}${d.categoria ? ' · ' + escapar(d.categoria) : ''} · ${moneda(d.precio)}
      ${d.editado_por ? `<br>Último cambio: ${escapar(d.editado_por)}` : ''}
    </div>
    ${grupos || '<p class="vacio">Este producto no tiene colores registrados.</p>'}
    <div class="pie-hoja">
      <a class="btn btn--linea" style="flex:1" href="/p/${escapar(d.slug)}/"
         target="_blank" rel="noopener">Ver en el catálogo</a>
    </div>`;

  vista.hoja.querySelector('.hoja__cerrar').addEventListener('click', cerrarHoja);
}

vista.hoja.addEventListener('click', async (ev) => {
  const bc = ev.target.closest('[data-color]');
  const bt = ev.target.closest('[data-talla]');
  const boton = (bc && bc.tagName === 'BUTTON') ? bc : bt;
  if (!boton) return;

  const tipo = boton === bt ? 'talla' : 'color';
  const id = Number(boton.dataset[tipo]);
  const nuevo = boton.getAttribute('aria-pressed') !== 'true';

  boton.disabled = true;
  boton.setAttribute('aria-pressed', String(nuevo));
  if (tipo === 'color') boton.textContent = nuevo ? 'Agotado' : 'Agotar';

  try {
    await api(`${tipo}/${id}/estado`, { cuerpo: { agotado: nuevo } });
    if (detalle) {
      const objetivo = tipo === 'color'
        ? detalle.colores.find((c) => c.id === id)
        : detalle.tallas.find((t) => t.id === id);
      if (objetivo) objetivo.agotado = nuevo;
      // Si se agotó un color, el contador de la tarjeta cambió.
      refrescarTarjeta(detalle.id);
    }
    brindis(nuevo ? 'Marcado agotado.' : 'Vuelve a estar disponible.');
  } catch (e) {
    boton.setAttribute('aria-pressed', String(!nuevo));
    if (tipo === 'color') boton.textContent = !nuevo ? 'Agotado' : 'Agotar';
    fallo(e);
  } finally {
    boton.disabled = false;
  }
});



async function refrescarTarjeta(id) {
  const i = cargados.findIndex((x) => x.id === id);
  if (i < 0) return;
  try {
    const p = new URLSearchParams({ q: String(id), pagina: '1' });
    const datos = await api('productos?' + p.toString());
    const fresco = (datos.productos || []).find((x) => x.id === id);
    if (!fresco) return;
    cargados[i] = fresco;
    const li = vista.lista.querySelector(`[data-id="${id}"]`);
    if (li) li.replaceWith(tarjeta(fresco));
  } catch (e) { /* el contador se arregla en la próxima búsqueda */ }
}

/* ------------------------------------------------------------------ arranque */

(async function arrancar() {
  senal();
  vista.entrada.hidden = true;
  vista.panel.hidden = false;
  esqueletos(4);

  try {
    yo = await sesionAbierta();
  } catch (e) {
    vista.lista.innerHTML = '';
    aEntrada('Sin conexión. Conéctate y vuelve a intentar.');
    return;
  }

  if (!yo) { vista.lista.innerHTML = ''; aEntrada(''); return; }
  aPanel();
  await listar(true);
})();

if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('/trabajador/sw.js', { scope: '/trabajador/' })
      .catch(() => { /* sin service worker el panel funciona igual, solo sin caché */ });
  });
}
