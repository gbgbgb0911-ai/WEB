/* Euchel — catálogo. Interacción mínima: revelado, buscador y armado del pedido. */
(function () {
  'use strict';

  var WA = document.documentElement.dataset.wa || '';

  /* --------------------------------------------- revelado al hacer scroll */

  function revelar() {
    var items = document.querySelectorAll('.revelar');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < items.length; i++) items[i].classList.add('visible');
      return;
    }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e, idx) {
        if (!e.isIntersecting) return;
        var el = e.target;
        // Escalonado de 80 ms, solo entre lo que entra a la vez.
        setTimeout(function () { el.classList.add('visible'); }, Math.min(idx, 5) * 80);
        obs.unobserve(el);
      });
    }, { rootMargin: '120px 0px' });

    for (var j = 0; j < items.length; j++) obs.observe(items[j]);
  }

  /* ------------------------------------------------------------ buscador */

  function buscador() {
    var caja = document.querySelector('[data-buscador]');
    if (!caja) return;

    var input = caja.querySelector('input');
    var panel = caja.querySelector('[data-panel]');
    var datos = null;
    var enVuelo = null;

    function normal(s) {
      return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    // Guardamos la promesa, no un booleano: si el índice ya se está bajando,
    // quien llegue después tiene que esperarla, no seguir con datos en null.
    function cargar() {
      if (datos) return Promise.resolve();
      if (enVuelo) return enVuelo;
      enVuelo = fetch('/buscar.json')
        .then(function (r) { return r.json(); })
        .then(function (j) { datos = j; enVuelo = null; })
        .catch(function () { enVuelo = null; });
      return enVuelo;
    }

    function pintar(lista, q) {
      if (!lista.length) {
        panel.innerHTML = '<div class="buscador__vacio">Nada para &laquo;' +
          q.replace(/[<>&]/g, '') + '&raquo;</div>';
        panel.hidden = false;
        return;
      }
      var html = lista.map(function (p) {
        var precio = 'S/ ' + p.p + (p.a ? ' <span style="text-decoration:line-through;color:#d3255c">S/ ' + p.a + '</span>' : '');
        return '<a class="buscador__item" href="/p/' + p.u + '/">' +
          '<img src="/img/webp/' + p.i + '-thumb.webp" alt="" loading="lazy" width="40" height="52">' +
          '<span><span class="buscador__item-nombre">' + p.n + '</span><br>' +
          '<span class="buscador__item-meta">' + precio + ' &middot; ' + p.c + '</span></span></a>';
      }).join('');
      panel.innerHTML = html;
      panel.hidden = false;
    }

    function buscar() {
      var q = normal(input.value.trim());
      if (q.length < 2) { panel.hidden = true; return; }
      cargar().then(function () {
        if (!datos) return;
        var res = [];
        for (var i = 0; i < datos.length && res.length < 12; i++) {
          if (datos[i].b.indexOf(q) !== -1) res.push(datos[i]);
        }
        pintar(res, input.value.trim());
      });
    }

    input.addEventListener('input', buscar);
    input.addEventListener('focus', cargar);
    document.addEventListener('click', function (e) {
      if (!caja.contains(e.target)) panel.hidden = true;
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { panel.hidden = true; input.blur(); }
    });
  }

  /* --------------------------------------------------------------- ficha */

  function ficha() {
    var raiz = document.querySelector('[data-ficha]');
    if (!raiz) return;

    var prod;
    try { prod = JSON.parse(document.getElementById('datos-producto').textContent); }
    catch (e) { return; }

    var elColores = raiz.querySelector('[data-colores]');
    var elTallas = raiz.querySelector('[data-tallas]');
    var elColorSel = raiz.querySelector('[data-color-elegido]');
    var elTallaSel = raiz.querySelector('[data-talla-elegida]');
    var elGrupoTallas = raiz.querySelector('[data-grupo-tallas]');
    var cta = raiz.querySelector('[data-cta]');
    var principal = raiz.querySelector('[data-foto-principal]');
    var tiras = raiz.querySelector('[data-tiras]');

    // El color inicial puede venir del enlace: ?c=<id_color>
    var pedido = new URLSearchParams(location.search).get('c');
    var iColor = 0;
    if (pedido) {
      for (var k = 0; k < prod.colores.length; k++) {
        if (String(prod.colores[k].id) === String(pedido)) { iColor = k; break; }
      }
    }
    var iTalla = 0;

    function colorActual() { return prod.colores[iColor] || { tallas: [], imagenes: [] }; }

    function pintarTallas() {
      var c = colorActual();
      if (!elTallas) return;

      if (!c.tallas.length) {
        elTallas.innerHTML = '<span class="chip__aviso">Consultar disponibilidad</span>';
        if (elTallaSel) elTallaSel.textContent = '';
        return;
      }
      elTallas.innerHTML = c.tallas.map(function (t, i) {
        return '<button type="button" class="chip" data-talla="' + i + '" aria-pressed="' +
          (i === iTalla ? 'true' : 'false') + '">' + t.nombre + '</button>';
      }).join('');
      if (elTallaSel) elTallaSel.textContent = c.tallas[iTalla] ? c.tallas[iTalla].nombre : '';
    }

    function pintarColores() {
      if (!elColores) return;
      var botones = elColores.querySelectorAll('[data-color]');
      for (var i = 0; i < botones.length; i++) {
        botones[i].setAttribute('aria-pressed', Number(botones[i].dataset.color) === iColor ? 'true' : 'false');
      }
      if (elColorSel) elColorSel.textContent = colorActual().nombre || '';
    }

    function pintarFotos() {
      var c = colorActual();
      var fotos = (c.imagenes && c.imagenes.length) ? c.imagenes : prod.imagenes;
      if (!fotos.length || !principal) return;

      principal.src = '/img/webp/' + fotos[0] + '-full.webp';
      principal.alt = prod.nombre + (c.nombre ? ', ' + c.nombre : '');

      if (tiras) {
        tiras.innerHTML = fotos.map(function (h, i) {
          return '<button type="button" data-foto="' + h + '" aria-current="' + (i === 0 ? 'true' : 'false') +
            '" aria-label="Foto ' + (i + 1) + '">' +
            '<img src="/img/webp/' + h + '-thumb.webp" alt="" loading="lazy"></button>';
        }).join('');
        tiras.hidden = fotos.length < 2;
      }
    }

    function armarMensaje() {
      var c = colorActual();
      var t = c.tallas[iTalla];
      var lineas = ['Hola Euchel, quiero continuar mi compra:', '', prod.nombre];

      var detalle = [];
      if (c.nombre && c.nombre !== 'Único') detalle.push('Color: ' + c.nombre);
      if (t) detalle.push('Talla: ' + t.nombre);
      if (detalle.length) lineas.push(detalle.join('  ·  '));

      lineas.push('S/ ' + prod.precio + '  ·  Ref. ' + prod.id);
      lineas.push('');
      lineas.push(location.origin + '/p/' + prod.slug + '/' + (c.id ? '?c=' + c.id : ''));
      return lineas.join('\n');
    }

    function refrescarCta() {
      if (!cta) return;
      cta.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(armarMensaje());
    }

    if (elColores) {
      elColores.addEventListener('click', function (e) {
        var b = e.target.closest('[data-color]');
        if (!b) return;
        iColor = Number(b.dataset.color);
        iTalla = 0;
        pintarColores(); pintarTallas(); pintarFotos(); refrescarCta();
        var u = new URL(location.href);
        var id = colorActual().id;
        if (id) { u.searchParams.set('c', id); } else { u.searchParams.delete('c'); }
        history.replaceState(null, '', u);
      });
    }

    if (elTallas) {
      elTallas.addEventListener('click', function (e) {
        var b = e.target.closest('[data-talla]');
        if (!b) return;
        iTalla = Number(b.dataset.talla);
        pintarTallas(); refrescarCta();
      });
    }

    if (tiras) {
      tiras.addEventListener('click', function (e) {
        var b = e.target.closest('[data-foto]');
        if (!b || !principal) return;
        principal.src = '/img/webp/' + b.dataset.foto + '-full.webp';
        var todos = tiras.querySelectorAll('[data-foto]');
        for (var i = 0; i < todos.length; i++) todos[i].setAttribute('aria-current', todos[i] === b ? 'true' : 'false');
      });
    }

    // El clic se registra en segundo plano: es lo que alimenta el panel
    // (qué se pide más). sendBeacon no retrasa la apertura de WhatsApp.
    if (cta) {
      cta.addEventListener('click', function () {
        var c = colorActual();
        var t = c.tallas[iTalla];
        var cuerpo = JSON.stringify({
          producto_id: prod.id,
          color_id: c.id || null,
          talla: t ? t.nombre : null,
          precio: Number(prod.precio) || null
        });
        try {
          if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/intencion', new Blob([cuerpo], { type: 'application/json' }));
          } else {
            fetch('/api/intencion', { method: 'POST', body: cuerpo, keepalive: true,
                                      headers: { 'content-type': 'application/json' } });
          }
        } catch (e) { /* si falla, el pedido sigue su curso */ }
      });
    }

    if (elGrupoTallas) elGrupoTallas.hidden = false;
    pintarColores(); pintarTallas(); pintarFotos(); refrescarCta();
  }

  /* ----------------------------------------------------------------- PWA */

  function pwa() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () { /* sin PWA, el sitio funciona igual */ });
    });
  }

  /* -------------------------------------------------- estado en vivo */

  /* El catálogo es estático. Lo que cambia varias veces al día —agotado,
     oculto— se pide aquí, para no reconstruir el sitio en cada cambio. */
  function estado() {
    fetch('/api/estado', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        var ocultos = new Set(d.ocultos || []);
        var agotados = new Set(d.agotados || []);

        // En el listado: sacar los ocultos, sellar los agotados.
        var tarjetas = document.querySelectorAll('.tarjeta[href^="/p/"]');
        for (var i = 0; i < tarjetas.length; i++) {
          var t = tarjetas[i];
          var id = Number((t.getAttribute('href').split('/p/')[1] || '').split('-')[0]);
          if (ocultos.has(id)) { t.remove(); continue; }
          if (agotados.has(id) && !t.querySelector('.sello--agotado')) {
            var s = document.createElement('span');
            s.className = 'sello sello--agotado';
            s.textContent = 'Agotado';
            s.style.top = t.querySelector('.sello') ? '46px' : '10px';
            var foto = t.querySelector('.tarjeta__foto');
            if (foto) foto.appendChild(s);
          }
        }

        // En la ficha: avisar y desactivar el botón.
        var raiz = document.querySelector('[data-ficha]');
        if (!raiz) return;
        var datos = document.getElementById('datos-producto');
        if (!datos) return;
        var pid;
        try { pid = JSON.parse(datos.textContent).id; } catch (e) { return; }

        if (ocultos.has(pid) || agotados.has(pid)) {
          var cta = raiz.querySelector('[data-cta]');
          var nota = raiz.querySelector('.cta__nota');
          if (cta) {
            cta.removeAttribute('href');
            cta.setAttribute('aria-disabled', 'true');
            cta.style.background = '#cccccc';
            cta.style.pointerEvents = 'none';
            var txt = cta.querySelector('span');
            if (txt) txt.textContent = ocultos.has(pid) ? 'No disponible' : 'Agotado';
          }
          if (nota) {
            nota.textContent = ocultos.has(pid)
              ? 'Este producto ya no está en el catálogo.'
              : 'Sin stock por ahora. Escríbenos y te avisamos cuando vuelva.';
          }
        }
      })
      .catch(function () { /* sin estado, el catálogo se ve tal cual se publicó */ });
  }

  /* ------------------------------------------- categoría actual a la vista */

  function menu() {
    var barra = document.querySelector('.menu');
    if (!barra) return;
    var actual = barra.querySelector('[aria-current="page"]');
    if (!actual) return;

    // El menú tiene 21 categorías: en un celular la que estás viendo puede
    // quedar fuera de pantalla. Se acerca sin animación, que al cargar se
    // vería como un salto.
    var margen = 10;
    var izq = actual.offsetLeft - margen;
    var der = izq + actual.offsetWidth + margen * 2;
    if (izq < barra.scrollLeft) barra.scrollLeft = izq;
    else if (der > barra.scrollLeft + barra.clientWidth) {
      barra.scrollLeft = der - barra.clientWidth;
    }
  }

  revelar();
  menu();
  buscador();
  ficha();
  estado();
  pwa();
})();
