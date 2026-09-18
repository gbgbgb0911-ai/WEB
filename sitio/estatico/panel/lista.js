/* Lista de productos con búsqueda, filtros y hoja de detalle.
 *
 * La usan los dos paneles. La diferencia por rol es qué aparece en la hoja:
 * agotar y ocultar lo puede hacer cualquiera del equipo; cambiar el precio y
 * archivar, solo administración. El backend vuelve a comprobarlo, así que
 * esconder un botón aquí es comodidad, no seguridad.
 *
 * Los cambios se pintan antes de que responda el servidor y se revierten si
 * el servidor dice que no. Con el celular en la calle esa es la diferencia
 * entre un panel usable y uno que se siente roto.
 */

import { api } from '/panel/sesion.js';
import { $, escapar, moneda, brindis, abrirHoja, cerrarHoja, hojaAbiertaPara,
         cabeceraHoja } from '/panel/ui.js';

export function crearLista({ rol, fallo }) {
  const vista = {
    lista: $('#lista'), cuenta: $('#cuenta'), vacio: $('#vacio'), mas: $('#btn-mas'),
    q: $('#q'), cat: $('#cat'), limpiar: $('#limpiar'), hoja: $('#hoja'),
  };
  const esAdmin = rol === 'admin';

  let filtro = { q: '', estado: '', cat: '', pagina: 1 };
  let total = 0;
  let cargados = [];
  let peticion = 0;          // para descartar respuestas viejas
  let catsPuestas = false;
  let detalle = null;

  /* ------------------------------------------------------------- tarjetas */

  function esqueletos(n) {
    vista.lista.innerHTML = Array.from({ length: n }, () => '<li class="esqueleto"></li>').join('');
  }

  function tarjeta(p) {
    const li = document.createElement('li');
    li.className = 'tarjeta' + (p.visible ? '' : ' tarjeta--oculta');
    li.dataset.id = p.id;

    const foto = p.foto
      ? `<img class="tarjeta__foto" src="/img/webp/${escapar(p.foto)}-thumb.webp" alt=""
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

  function pintar() {
    vista.lista.innerHTML = '';
    const trozo = document.createDocumentFragment();
    cargados.forEach((p) => trozo.appendChild(tarjeta(p)));
    vista.lista.appendChild(trozo);

    vista.vacio.classList.toggle('oculto', cargados.length > 0);
    vista.cuenta.textContent = total
      ? `${cargados.length} de ${total} producto${total === 1 ? '' : 's'}`
      : '';
    vista.mas.classList.toggle('oculto', cargados.length >= total);
    vista.mas.disabled = false;
    vista.mas.textContent = 'Ver más';
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

  function categorias(cats) {
    if (catsPuestas || !cats) return;
    catsPuestas = true;
    vista.cat.innerHTML = '<option value="">Todas las categorías</option>' +
      cats.map((c) => `<option value="${c.subid}">${escapar(c.nombre)} (${c.cuantos})</option>`).join('');
    vista.cat.className = 'selector';
  }

  async function refrescar(id) {
    const i = cargados.findIndex((x) => x.id === id);
    if (i < 0) return;
    try {
      const datos = await api('productos?' + new URLSearchParams({ q: String(id), pagina: '1' }));
      const fresco = (datos.productos || []).find((x) => x.id === id);
      if (!fresco) return;
      cargados[i] = fresco;
      const li = vista.lista.querySelector(`[data-id="${id}"]`);
      if (li) li.replaceWith(tarjeta(fresco));
    } catch (e) { /* el contador se arregla en la próxima búsqueda */ }
  }

  /* -------------------------------------------------------------- filtros */

  let tiempoBusca;
  vista.q.addEventListener('input', () => {
    vista.limpiar.classList.toggle('oculto', !vista.q.value);
    clearTimeout(tiempoBusca);
    // 350 ms: escribir "TOP CELESTIA" no debería disparar doce consultas.
    tiempoBusca = setTimeout(() => { filtro.q = vista.q.value.trim(); listar(true); }, 350);
  });

  vista.limpiar.addEventListener('click', () => {
    vista.q.value = '';
    vista.limpiar.classList.add('oculto');
    filtro.q = '';
    listar(true);
  });

  document.querySelectorAll('.ficha[data-estado]').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.ficha[data-estado]').forEach((o) =>
        o.setAttribute('aria-pressed', String(o === b)));
      filtro.estado = b.dataset.estado;
      listar(true);
    });
  });

  vista.cat.addEventListener('change', () => { filtro.cat = vista.cat.value; listar(true); });

  vista.mas.addEventListener('click', () => {
    filtro.pagina += 1;
    vista.mas.textContent = 'Cargando…';
    listar(false);
  });

  /* ------------------------------------------------- palancas de la lista */

  vista.lista.addEventListener('click', async (ev) => {
    const abrir = ev.target.closest('[data-abrir]');
    if (abrir) { verFicha(Number(abrir.dataset.abrir)); return; }

    const boton = ev.target.closest('.palanca');
    if (!boton) return;

    const li = boton.closest('.tarjeta');
    const id = Number(li.dataset.id);
    const p = cargados.find((x) => x.id === id);
    if (!p) return;

    const campo = boton.dataset.campo;
    const antes = { agotado: p.agotado, visible: p.visible };
    const cuerpo = campo === 'agotado' ? { agotado: !p.agotado } : { visible: !p.visible };

    Object.assign(p, cuerpo);
    li.replaceWith(tarjeta(p));
    bloquear(id, true);

    try {
      const r = await api(`producto/${id}/estado`, { cuerpo });
      Object.assign(p, { agotado: r.agotado, visible: r.visible });
      brindis(campo === 'agotado'
        ? (p.agotado ? 'Marcado agotado.' : 'Vuelve a estar disponible.')
        : (p.visible ? 'Visible en el catálogo.' : 'Oculto del catálogo.'));
    } catch (e) {
      Object.assign(p, antes);
      fallo(e);
    } finally {
      const actual = vista.lista.querySelector(`[data-id="${id}"]`);
      if (actual) actual.replaceWith(tarjeta(p));
    }
  });

  function bloquear(id, si) {
    const li = vista.lista.querySelector(`[data-id="${id}"]`);
    if (li) li.querySelectorAll('.palanca').forEach((b) => { b.disabled = si; });
  }

  /* ----------------------------------------------------------------- hoja */

  async function verFicha(id) {
    abrirHoja(id, cabeceraHoja('Cargando…') + '<div class="esqueleto" style="margin:16px 0"></div>');
    let d;
    try { d = await api(`producto/${id}`); }
    catch (e) { cerrarHoja(); fallo(e); return; }
    if (hojaAbiertaPara() !== id) return;
    detalle = d;
    pintarFicha(d);
  }

  function pintarFicha(d) {
    const grupos = d.colores.map((c) => {
      const tallas = d.tallas.filter((t) => t.color_id === c.id);
      return `
        <div class="grupo">
          <div class="grupo__tope">
            <span class="grupo__nombre">${escapar(c.nombre)}</span>
            <button class="palanca" type="button" data-color="${c.id}"
                    aria-pressed="${c.agotado}">${c.agotado ? 'Agotado' : 'Agotar'}</button>
          </div>
          ${tallas.length ? `<div class="tallas">${tallas.map((t) => `
            <button class="talla" type="button" data-talla="${t.id}"
                    aria-pressed="${t.agotado}">${escapar(t.nombre)}</button>`).join('')}
          </div>` : '<div class="tarjeta__meta" style="margin-top:8px">Sin tallas registradas</div>'}
        </div>`;
    }).join('');

    const soloAdmin = esAdmin ? `
      <div class="grupo">
        <span class="eyebrow">Solo administración</span>
        <form class="precios" id="forma-precio">
          <label class="campo"><span>Precio</span>
            <input type="number" name="precio" step="0.10" min="0" inputmode="decimal"
                   value="${d.precio === null ? '' : d.precio}"></label>
          <label class="campo"><span>Precio antes (tachado)</span>
            <input type="number" name="precio_antes" step="0.10" min="0" inputmode="decimal"
                   value="${d.precio_antes === null ? '' : d.precio_antes}"></label>
          <button class="btn btn--ancho" type="submit">Guardar precio</button>
        </form>
        <button class="btn btn--linea btn--ancho" type="button" id="btn-archivar"
                style="margin-top:8px">
          ${d.archivado ? 'Sacar del archivo' : 'Archivar producto'}
        </button>
        <p class="tarjeta__meta" style="margin-top:6px">
          Archivar lo saca del catálogo y del panel, y se puede deshacer. Nada se borra.
        </p>
      </div>` : '';

    const hoja = $('#hoja');
    hoja.innerHTML = cabeceraHoja(d.nombre) + `
      <div class="tarjeta__meta" style="padding:10px 0 0">
        Ref. ${d.id}${d.categoria ? ' · ' + escapar(d.categoria) : ''} · ${moneda(d.precio)}
        ${d.editado_por ? `<br>Último cambio: ${escapar(d.editado_por)}` : ''}
      </div>
      ${grupos || '<p class="vacio">Este producto no tiene colores registrados.</p>'}
      ${soloAdmin}
      <div class="pie-hoja">
        <a class="btn btn--linea" style="flex:1" href="/p/${escapar(d.slug)}/"
           target="_blank" rel="noopener">Ver en el catálogo</a>
      </div>`;
    $('.hoja__cerrar', hoja).addEventListener('click', cerrarHoja);

    if (esAdmin) {
      $('#forma-precio', hoja).addEventListener('submit', (ev) => guardarPrecio(ev, d));
      $('#btn-archivar', hoja).addEventListener('click', (ev) => archivar(ev, d));
    }
  }

  vista.hoja.addEventListener('click', async (ev) => {
    const bc = ev.target.closest('button[data-color]');
    const bt = ev.target.closest('button[data-talla]');
    const boton = bc || bt;
    if (!boton) return;

    const tipo = bt ? 'talla' : 'color';
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
        refrescar(detalle.id);   // el contador de la tarjeta cambió
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

  async function guardarPrecio(ev, d) {
    ev.preventDefault();
    const forma = ev.target;
    const boton = forma.querySelector('button');
    const datos = new FormData(forma);
    boton.disabled = true;
    try {
      const r = await api(`producto/${d.id}/precio`, {
        cuerpo: { precio: datos.get('precio'), precio_antes: datos.get('precio_antes') },
      });
      d.precio = r.precio; d.precio_antes = r.precio_antes;
      brindis('Precio guardado.');
      refrescar(d.id);
    } catch (e) { fallo(e); }
    finally { boton.disabled = false; }
  }

  async function archivar(ev, d) {
    const boton = ev.currentTarget;
    const nuevo = !d.archivado;
    if (nuevo && !confirm(`¿Archivar "${d.nombre}"? Sale del catálogo y del panel. Se puede deshacer.`)) return;
    boton.disabled = true;
    try {
      const r = await api(`producto/${d.id}/archivar`, { cuerpo: { archivado: nuevo } });
      d.archivado = r.archivado;
      brindis(r.archivado ? 'Producto archivado.' : 'Producto de vuelta en el panel.');
      cerrarHoja();
      listar(true);
    } catch (e) { fallo(e); }
    finally { boton.disabled = false; }
  }

  return { listar, refrescar };
}
