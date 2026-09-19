/* Euchel — catálogo. Interacción mínima: revelado, buscador y armado del pedido. */
(function () {
  'use strict';

  var WA = document.documentElement.dataset.wa || '';

  // Lo rellena ficha() y lo usa estado(): pasar el botón de consulta de
  // "qué colores hay" a "si vuelve" cuando el producto ya no está.
  var aConsultarStock = null;

  /* Ruta pública de una imagen. Las de la extracción son un hash de 16 hex y
     viven como WebP estáticos; las que sube el equipo llevan la extensión del
     archivo (`<32 hex>.jpg`) y las redimensiona el CDN de imágenes al vuelo.
     El punto alcanza para distinguirlas. Igual que ruta_img() del generador. */
  function rutaImg(h, medida) {
    if (String(h).indexOf('.') === -1) return '/img/webp/' + h + '-' + medida + '.webp';
    var ancho = medida === 'thumb' ? 500 : 1400;
    return '/.netlify/images?url=/img/subidas/' + h + '&w=' + ancho + '&fm=webp&q=82';
  }

  /* --------------------------------------------- revelado al hacer scroll */

  function revelar() {
    // Señal para el trozo de guion que va en el HTML: el revelado está en
    // marcha, que no desmarque el documento. Si esto no llega a correr, a los
    // 2,5 s las tarjetas se muestran igual, sin animación.
    document.documentElement.setAttribute('data-js', '1');

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
          '<img src="' + rutaImg(p.i, 'thumb') + '" alt="" loading="lazy" width="40" height="52">' +
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

    var elTallas = raiz.querySelector('[data-tallas]');
    var elTallaSel = raiz.querySelector('[data-talla-elegida]');
    var cta = raiz.querySelector('[data-cta]');
    var consulta = raiz.querySelector('[data-consulta]');
    var botonTalla = raiz.querySelector('[data-talla-wa]');
    var principal = raiz.querySelector('[data-foto-principal]');
    var tiras = raiz.querySelector('[data-tiras]');

    // El color ya no se elige: lo pidieron los dueños porque el stock por
    // color cambia todo el día. Las fotos siguen enseñando los colores que
    // hay, y cuál queda se confirma por WhatsApp.
    var tallas = prod.tallas || [];
    var iTalla = 0;

    function tallaActual() { return tallas.length ? tallas[iTalla] : null; }

    function pintarTallas() {
      if (!elTallas) return;
      var botones = elTallas.querySelectorAll('[data-talla]');
      for (var i = 0; i < botones.length; i++) {
        botones[i].setAttribute('aria-pressed', Number(botones[i].dataset.talla) === iTalla ? 'true' : 'false');
      }
      if (elTallaSel) elTallaSel.textContent = tallaActual() || '';
    }

    function pintarFotos() {
      var fotos = prod.imagenes || [];
      if (!fotos.length || !principal) return;

      if (tiras) {
        tiras.innerHTML = fotos.map(function (h, i) {
          return '<button type="button" data-foto="' + h + '" aria-current="' + (i === 0 ? 'true' : 'false') +
            '" aria-label="Foto ' + (i + 1) + '">' +
            '<img src="' + rutaImg(h, 'thumb') + '" alt="" loading="lazy"></button>';
        }).join('');
        tiras.hidden = fotos.length < 2;
      }
    }

    // Los mismos encabezados que pone el servidor (ver ENCABEZADOS en
    // _lib/plantillas.mts). Cada mensaje dice de entrada qué se pregunta, y
    // debajo va la prenda con su enlace: quien atiende no adivina nada.
    var ENCABEZADOS = {
      compra: '\uD83D\uDECD\uFE0F Hola Euchel, quiero continuar mi compra:',
      colores: '\uD83C\uDFA8 Hola Euchel, ¿en qué colores tienen esta prenda?',
      talla: '\uD83D\uDCCF Hola Euchel, ¿tienen mi talla?',
      tallas: '\uD83D\uDCCF Hola Euchel, ¿qué tallas hay de esta prenda?',
      stock: '\u23F3 Hola Euchel, ¿cuándo vuelve esta prenda?'
    };

    function armarMensaje(tipo) {
      var lineas = [ENCABEZADOS[tipo] || ENCABEZADOS.compra, '', prod.nombre];

      // En "¿qué tallas hay?" no se manda talla: justo se está preguntando.
      var t = tipo === 'tallas' ? null : tallaActual();
      if (t) lineas.push('Talla: ' + t);
      if (prod.precio) lineas.push('S/ ' + prod.precio);
      lineas.push('');
      lineas.push(location.origin + '/p/' + prod.slug + '/');
      return lineas.join('\n');
    }

    function refrescarCta() {
      var wa = 'https://wa.me/' + WA + '?text=';
      if (cta && !cta.hasAttribute('aria-disabled')) cta.href = wa + encodeURIComponent(armarMensaje('compra'));
      if (consulta) {
        consulta.href = wa + encodeURIComponent(armarMensaje(consulta.dataset.consulta || 'colores'));
      }
      if (botonTalla) {
        botonTalla.href = wa + encodeURIComponent(armarMensaje(botonTalla.dataset.tallaWa || 'tallas'));
      }
    }

    // Si /api/estado dice que esto ya no está, el botón deja de preguntar por
    // colores y pasa a preguntar si vuelve. Preguntar el color de algo que no
    // hay no le sirve a nadie.
    aConsultarStock = function () {
      if (!consulta) return;
      consulta.dataset.consulta = 'stock';
      var txt = consulta.querySelector('span');
      if (txt) txt.textContent = 'Preguntar si vuelve';
      refrescarCta();
    };

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
        principal.src = rutaImg(b.dataset.foto, 'full');
        var todos = tiras.querySelectorAll('[data-foto]');
        for (var i = 0; i < todos.length; i++) todos[i].setAttribute('aria-current', todos[i] === b ? 'true' : 'false');
      });
    }

    /* Cada clic se registra en segundo plano, y con el botón que fue: es lo
       que alimenta el panel (qué se pide y qué se pregunta más). sendBeacon
       no retrasa la apertura de WhatsApp. */
    function registrar(boton) {
      var cuerpo = JSON.stringify({
        producto_id: prod.id,
        color_id: null,
        talla: boton === 'tallas' ? null : tallaActual(),
        precio: Number(prod.precio) || null,
        boton: boton
      });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/intencion', new Blob([cuerpo], { type: 'application/json' }));
        } else {
          fetch('/api/intencion', { method: 'POST', body: cuerpo, keepalive: true,
                                    headers: { 'content-type': 'application/json' } });
        }
      } catch (e) { /* si falla, el pedido sigue su curso */ }
    }

    var botones = raiz.querySelectorAll('[data-boton]');
    for (var b = 0; b < botones.length; b++) {
      botones[b].addEventListener('click', function () {
        if (this.hasAttribute('aria-disabled')) return;
        registrar(this.dataset.boton || 'compra');
      });
    }

    pintarTallas(); pintarFotos(); refrescarCta();
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
          var consulta = raiz.querySelector('[data-consulta]');
          var nota = raiz.querySelector('.cta__nota');
          if (cta) {
            cta.removeAttribute('href');
            cta.setAttribute('aria-disabled', 'true');
            cta.classList.add('cta--muerto');
            var txt = cta.querySelector('span');
            if (txt) txt.textContent = ocultos.has(pid) ? 'No disponible' : 'Agotado';
          }
          // El de preguntar pasa a ser el principal: es lo único que se puede
          // hacer con algo que no está, y sigue llevando a WhatsApp.
          if (consulta) { consulta.classList.remove('cta--suave'); consulta.classList.add('cta--llena'); }
          if (aConsultarStock) aConsultarStock();
          if (nota) {
            nota.textContent = ocultos.has(pid)
              ? 'Este producto ya no está en el catálogo.'
              : 'Sin stock por ahora. Pregúntanos y te avisamos cuando vuelva.';
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
