/* Lista de productos: buscar, filtrar, y la hoja donde se edita uno.
 *
 * La usan los dos paneles. Qué puede hacer cada rol:
 *
 *   equipo  — agotar, ocultar, crear productos, subir fotos, poner colores
 *             y tallas
 *   admin   — todo lo anterior, más precio, archivar y borrar
 *
 * El backend vuelve a comprobarlo todo, así que esconder un botón aquí es
 * comodidad, no seguridad.
 *
 * Los cambios de estado se pintan antes de que responda el servidor y se
 * revierten si el servidor dice que no. Con el celular en la calle esa es la
 * diferencia entre un panel usable y uno que se siente roto.
 */

import { api } from '/panel/sesion.js';
import { $, escapar, moneda, brindis, abrirHoja, cerrarHoja, hojaAbiertaPara,
         cabeceraHoja } from '/panel/ui.js';
import { encoger, pesoLegible, ACEPTA } from '/panel/foto.js';

/** Ruta pública de una imagen. Igual que ruta_img() del generador. */
function rutaImg(h, medida) {
  if (String(h).indexOf('.') === -1) return `/img/webp/${h}-${medida}.webp`;
  const ancho = medida === 'thumb' ? 500 : 1400;
  return `/.netlify/images?url=/img/subidas/${h}&w=${ancho}&fm=webp&q=82`;
}

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
  let categorias = [];
  let detalle = null;        // el producto abierto en la hoja

  /* ------------------------------------------------------------- tarjetas */

  function esqueletos(n) {
    vista.lista.innerHTML = Array.from({ length: n }, () => '<li class="esqueleto"></li>').join('');
  }

  function tarjeta(p) {
    const li = document.createElement('li');
    li.className = 'tarjeta' + (p.visible ? '' : ' tarjeta--oculta');
    li.dataset.id = p.id;

    const foto = p.foto
      ? `<img class="tarjeta__foto" src="${rutaImg(p.foto, 'thumb')}" alt=""
              loading="lazy" width="78" height="96">`
      : '<div class="tarjeta__foto tarjeta__foto--vacia">sin foto</div>';

    const sellos = [];
    if (p.agotado) sellos.push('<span class="sello sello--agotado">Agotado</span>');
    if (!p.visible) sellos.push('<span class="sello sello--oculto">Oculto</span>');
    if (!p.agotado && p.colores_agotados > 0) {
      sellos.push(`<span class="sello sello--parcial">${p.colores_agotados} de ${p.colores} sin stock</span>`);
    }
    if (p.id >= 100001) sellos.push('<span class="sello sello--nuevo">Del panel</span>');

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
    ponerCategorias(datos.categorias);
  }

  let catsPuestas = false;
  function ponerCategorias(cats) {
    if (!cats) return;
    categorias = cats;
    if (catsPuestas) return;
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
    } catch (e) { /* se arregla en la próxima búsqueda */ }
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

  /* ---------------------------------------------------------- crear nuevo */

  function nuevo() {
    abrirHoja('nuevo', cabeceraHoja('Producto nuevo') + `
      <div class="aviso aviso--malo oculto" id="nuevo-error" role="alert"></div>
      <form id="forma-nuevo" style="padding-top:12px" novalidate>
        <label class="campo"><span>Nombre</span>
          <input name="nombre" autocomplete="off" placeholder="TOP RAISA"></label>
        <label class="campo"><span>Precio</span>
          <input name="precio" type="number" step="0.10" min="0" inputmode="decimal"
                 placeholder="45.00"></label>
        <label class="campo"><span>Categoría</span>
          <select name="subid" class="selector">
            <option value="">Sin categoría</option>
            ${categorias.map((c) => `<option value="${c.subid}">${escapar(c.nombre)}</option>`).join('')}
          </select></label>
        <button class="btn btn--ancho" type="submit">Crear y seguir</button>
      </form>
      <p class="tarjeta__meta" style="margin-top:8px">
        Nace oculto. Le pones fotos, colores y tallas, y cuando esté listo lo
        haces visible y publicas.
      </p>`);

    $('#forma-nuevo').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const forma = ev.target;
      const boton = forma.querySelector('button');
      const aviso = $('#nuevo-error');
      const datos = new FormData(forma);
      const nombre = String(datos.get('nombre') || '').trim();

      if (nombre.length < 3) {
        aviso.textContent = 'Ponle un nombre de al menos 3 letras.';
        aviso.classList.remove('oculto');
        return;
      }

      boton.disabled = true;
      boton.textContent = 'Creando…';
      aviso.classList.add('oculto');
      try {
        const p = await api('producto', { cuerpo: {
          nombre,
          precio: datos.get('precio'),
          subid: datos.get('subid'),
        } });
        brindis(`Creado con Ref. ${p.id}.`);
        await listar(true);
        verFicha(p.id);
      } catch (e) {
        aviso.textContent = e.message || 'No se pudo crear.';
        aviso.classList.remove('oculto');
        boton.disabled = false;
        boton.textContent = 'Crear y seguir';
      }
    });
  }

  /* ----------------------------------------------------------------- hoja */

  async function verFicha(id) {
    abrirHoja(id, cabeceraHoja('Cargando…') + '<div class="esqueleto" style="margin:16px 0"></div>');
    let d;
    try { d = await api(`producto/${id}`); }
    catch (e) { cerrarHoja(); fallo(e); return; }
    if (hojaAbiertaPara() !== id) return;
    detalle = d;
    pintarFicha();
  }

  async function recargarFicha() {
    if (!detalle) return;
    try { detalle = await api(`producto/${detalle.id}`); }
    catch (e) { fallo(e); return; }
    if (hojaAbiertaPara() !== detalle.id) return;
    pintarFicha();
    refrescar(detalle.id);
  }

  function pintarFicha() {
    const d = detalle;
    const delPanel = d.id >= 100001;

    const fotos = (d.fotos || []).map((f) => `
      <div class="miniatura">
        <img src="${rutaImg(f.hash, 'thumb')}" alt="" loading="lazy">
        <button class="miniatura__quitar" type="button" data-quitar-foto="${f.id}"
                aria-label="Quitar esta foto">&times;</button>
        ${f.color_id ? `<span class="miniatura__color">${escapar(nombreColor(f.color_id))}</span>` : ''}
      </div>`).join('');

    const grupos = d.colores.map((c) => {
      const tallas = d.tallas.filter((t) => t.color_id === c.id);
      return `
        <div class="grupo" data-grupo="${c.id}">
          <div class="grupo__tope">
            <span class="grupo__nombre">${escapar(c.nombre)}${
              c.precio !== null ? ` · ${moneda(c.precio)}` : ''}</span>
            <button class="palanca" type="button" data-color="${c.id}"
                    aria-pressed="${c.agotado}">${c.agotado ? 'Agotado' : 'Agotar'}</button>
          </div>
          <div class="tallas">
            ${tallas.map((t) => `
              <span class="talla-caja">
                <button class="talla" type="button" data-talla="${t.id}"
                        aria-pressed="${t.agotado}">${escapar(t.nombre)}</button>
                <button class="talla__quitar" type="button" data-quitar-talla="${t.id}"
                        aria-label="Quitar la talla ${escapar(t.nombre)}">&times;</button>
              </span>`).join('')}
            <button class="talla talla--mas" type="button" data-nueva-talla="${c.id}">+ talla</button>
          </div>
          <button class="btn btn--texto" type="button" data-quitar-color="${c.id}"
                  style="margin-top:6px">Quitar este color</button>
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
        ${delPanel ? `
        <button class="btn btn--linea btn--ancho" type="button" id="btn-borrar"
                style="margin-top:10px">Eliminar producto</button>
        <p class="tarjeta__meta" style="margin-top:6px">
          Se borra con sus fotos. Esto no se puede deshacer.
        </p>` : `
        <button class="btn btn--linea btn--ancho" type="button" id="btn-archivar"
                style="margin-top:10px">
          ${d.archivado ? 'Sacar del archivo' : 'Archivar producto'}
        </button>
        <p class="tarjeta__meta" style="margin-top:6px">
          Este producto vino de la tienda, así que se archiva en vez de
          borrarse: sale del catálogo y del panel, y se puede recuperar.
        </p>`}
      </div>` : '';

    vista.hoja.innerHTML = cabeceraHoja(d.nombre) + `
      <div class="tarjeta__meta" style="padding:10px 0 0">
        Ref. ${d.id} · ${moneda(d.precio)}${d.visible ? '' : ' · oculto'}
        ${d.editado_por ? `<br>Último cambio: ${escapar(d.editado_por)}` : ''}
      </div>

      <div class="grupo">
        <span class="eyebrow">Fotos</span>
        <div class="miniaturas">${fotos || '<p class="tarjeta__meta">Todavía no tiene fotos.</p>'}</div>
        <label class="btn btn--linea btn--ancho" style="margin-top:10px">
          <span id="etiqueta-subir">Añadir fotos</span>
          <input type="file" id="entrada-foto" accept="${ACEPTA}" multiple hidden>
        </label>
        ${d.colores.length > 1 ? `
        <label class="campo" style="margin-top:10px"><span>Asignar las fotos nuevas a</span>
          <select id="foto-color" class="selector">
            <option value="">Todo el producto</option>
            ${d.colores.map((c) => `<option value="${c.id}">${escapar(c.nombre)}</option>`).join('')}
          </select></label>` : ''}
      </div>

      <div class="grupo">
        <span class="eyebrow">Colores y tallas</span>
      </div>
      ${grupos || '<p class="tarjeta__meta" style="padding:8px 0">Todavía no tiene colores.</p>'}
      <div class="grupo">
        <button class="btn btn--linea btn--ancho" type="button" id="btn-nuevo-color">+ color</button>
      </div>

      <div class="grupo">
        <span class="eyebrow">Datos</span>
        <form id="forma-datos" style="margin-top:10px" novalidate>
          <label class="campo"><span>Nombre</span>
            <input name="nombre" value="${escapar(d.nombre)}" autocomplete="off"></label>
          <label class="campo"><span>Categoría</span>
            <select name="subid" class="selector">
              <option value="">Sin categoría</option>
              ${categorias.map((c) => `<option value="${c.subid}"${
                c.subid === d.subid ? ' selected' : ''}>${escapar(c.nombre)}</option>`).join('')}
            </select></label>
          <label class="campo"><span>Descripción</span>
            <textarea name="descripcion" rows="3" class="area">${escapar(d.descripcion || '')}</textarea></label>
          <button class="btn btn--ancho" type="submit">Guardar datos</button>
        </form>
      </div>

      ${soloAdmin}

      <div class="pie-hoja">
        <a class="btn btn--linea" style="flex:1" href="/p/${escapar(d.slug)}/"
           target="_blank" rel="noopener">Ver en el catálogo</a>
      </div>`;

    $('.hoja__cerrar', vista.hoja).addEventListener('click', cerrarHoja);
    $('#entrada-foto', vista.hoja).addEventListener('change', subirFotos);
    $('#btn-nuevo-color', vista.hoja).addEventListener('click', nuevoColor);
    $('#forma-datos', vista.hoja).addEventListener('submit', guardarDatos);

    if (esAdmin) {
      $('#forma-precio', vista.hoja).addEventListener('submit', guardarPrecio);
      const bArchivar = $('#btn-archivar', vista.hoja);
      if (bArchivar) bArchivar.addEventListener('click', archivar);
      const bBorrar = $('#btn-borrar', vista.hoja);
      if (bBorrar) bBorrar.addEventListener('click', borrarProducto);
    }
  }

  function nombreColor(id) {
    const c = (detalle.colores || []).find((x) => x.id === id);
    return c ? c.nombre : '';
  }

  /* ---------------------------------------------------------------- fotos */

  async function subirFotos(ev) {
    const archivos = [...ev.target.files];
    ev.target.value = '';
    if (!archivos.length) return;

    const etiqueta = $('#etiqueta-subir', vista.hoja);
    const selector = $('#foto-color', vista.hoja);
    const color = selector && selector.value ? `?color=${selector.value}` : '';
    const id = detalle.id;
    let bien = 0;

    for (let i = 0; i < archivos.length; i++) {
      if (etiqueta) etiqueta.textContent = `Subiendo ${i + 1} de ${archivos.length}…`;
      try {
        const { trozo, tipo } = await encoger(archivos[i]);
        await api(`producto/${id}/foto${color}`, {
          method: 'POST',
          body: trozo,
          headers: { 'content-type': tipo },
        });
        bien += 1;
      } catch (e) {
        brindis(`${archivos[i].name}: ${e.message || 'no se pudo subir'}`, true);
      }
    }

    if (etiqueta) etiqueta.textContent = 'Añadir fotos';
    if (bien) {
      brindis(bien === 1 ? 'Foto subida.' : `${bien} fotos subidas.`);
      await recargarFicha();
    }
  }

  async function quitarFoto(boton) {
    boton.disabled = true;
    try {
      await api(`foto/${boton.dataset.quitarFoto}`, { method: 'DELETE' });
      brindis('Foto quitada.');
      await recargarFicha();
    } catch (e) { fallo(e); boton.disabled = false; }
  }

  /* ------------------------------------------------------ colores, tallas */

  async function nuevoColor() {
    const nombre = prompt('Nombre del color (por ejemplo: Negro). Déjalo vacío si no tiene colores:');
    if (nombre === null) return;
    try {
      await api(`producto/${detalle.id}/color`, { cuerpo: { nombre: nombre.trim() || 'Único' } });
      brindis('Color añadido.');
      await recargarFicha();
    } catch (e) { fallo(e); }
  }

  async function nuevaTalla(colorId) {
    const nombre = prompt('Talla (por ejemplo: M, 32, Único):');
    if (!nombre || !nombre.trim()) return;
    try {
      await api(`color/${colorId}/talla`, { cuerpo: { nombre: nombre.trim() } });
      brindis('Talla añadida.');
      await recargarFicha();
    } catch (e) { fallo(e); }
  }

  async function quitarVariante(tipo, id, aviso) {
    if (!confirm(aviso)) return;
    try {
      await api(`${tipo}/${id}`, { method: 'DELETE' });
      brindis(tipo === 'color' ? 'Color quitado.' : 'Talla quitada.');
      await recargarFicha();
    } catch (e) { fallo(e); }
  }

  /* ----------------------------------------------------- toques a la hoja */

  vista.hoja.addEventListener('click', async (ev) => {
    const quitarFotoBtn = ev.target.closest('[data-quitar-foto]');
    if (quitarFotoBtn) { quitarFoto(quitarFotoBtn); return; }

    const nuevaTallaBtn = ev.target.closest('[data-nueva-talla]');
    if (nuevaTallaBtn) { nuevaTalla(Number(nuevaTallaBtn.dataset.nuevaTalla)); return; }

    const quitarTallaBtn = ev.target.closest('[data-quitar-talla]');
    if (quitarTallaBtn) {
      quitarVariante('talla', Number(quitarTallaBtn.dataset.quitarTalla),
                     '¿Quitar esta talla?');
      return;
    }

    const quitarColorBtn = ev.target.closest('[data-quitar-color]');
    if (quitarColorBtn) {
      const id = Number(quitarColorBtn.dataset.quitarColor);
      quitarVariante('color', id,
        `¿Quitar el color "${nombreColor(id)}" con sus tallas? Las fotos de ese color se quedan en el producto.`);
      return;
    }

    // Agotar un color o una talla.
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

  /* ----------------------------------------------------------- formularios */

  async function guardarDatos(ev) {
    ev.preventDefault();
    const forma = ev.target;
    const boton = forma.querySelector('button[type=submit]');
    const datos = new FormData(forma);
    const nombre = String(datos.get('nombre') || '').trim();
    if (nombre.length < 3) { brindis('Ponle un nombre de al menos 3 letras.', true); return; }

    boton.disabled = true;
    try {
      await api(`producto/${detalle.id}/datos`, { cuerpo: {
        nombre,
        descripcion: datos.get('descripcion'),
        subid: datos.get('subid'),
      } });
      brindis('Datos guardados.');
      await recargarFicha();
    } catch (e) { fallo(e); }
    finally { boton.disabled = false; }
  }

  async function guardarPrecio(ev) {
    ev.preventDefault();
    const forma = ev.target;
    const boton = forma.querySelector('button');
    const datos = new FormData(forma);
    boton.disabled = true;
    try {
      const r = await api(`producto/${detalle.id}/precio`, {
        cuerpo: { precio: datos.get('precio'), precio_antes: datos.get('precio_antes') },
      });
      detalle.precio = r.precio;
      detalle.precio_antes = r.precio_antes;
      brindis('Precio guardado.');
      refrescar(detalle.id);
    } catch (e) { fallo(e); }
    finally { boton.disabled = false; }
  }

  async function archivar(ev) {
    const boton = ev.currentTarget;
    const nuevo = !detalle.archivado;
    if (nuevo && !confirm(`¿Archivar "${detalle.nombre}"? Sale del catálogo y del panel. Se puede recuperar.`)) return;
    boton.disabled = true;
    try {
      const r = await api(`producto/${detalle.id}/archivar`, { cuerpo: { archivado: nuevo } });
      brindis(r.archivado ? 'Producto archivado.' : 'Producto de vuelta en el panel.');
      cerrarHoja();
      listar(true);
    } catch (e) { fallo(e); boton.disabled = false; }
  }

  async function borrarProducto(ev) {
    const boton = ev.currentTarget;
    if (!confirm(`¿Eliminar "${detalle.nombre}" y sus fotos? No se puede deshacer.`)) return;
    boton.disabled = true;
    try {
      await api(`producto/${detalle.id}`, { method: 'DELETE' });
      brindis('Producto eliminado.');
      cerrarHoja();
      listar(true);
    } catch (e) { fallo(e); boton.disabled = false; }
  }

  return { listar, refrescar, nuevo };
}
