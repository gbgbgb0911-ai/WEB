/* ==========================================================================
   HEX - Interacciones de la landing
   Sin dependencias. Todo el motion respeta prefers-reduced-motion.
   Prohibido: listeners de 'scroll' en cada frame. Se usa IntersectionObserver.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIGURA AQUÍ EL DESTINO DEL FORMULARIO
     Deja FORM_ENDPOINT vacío ('') y el formulario abrirá WhatsApp con el
     mensaje ya redactado (funciona sin backend, desde el minuto uno).
     Cuando tengas un endpoint (Formspree, Netlify Forms, tu propia API),
     pégalo aquí y el envío pasará a ser en segundo plano, sin salir de la web.
     ------------------------------------------------------------------ */
  var FORM_ENDPOINT = '';

  // El número de WhatsApp NO se define aquí: se lee del enlace [data-wa] del
  // HTML, para que solo haya que cambiarlo en un sitio.
  var waLink = document.querySelector('[data-wa]');
  var WHATSAPP_URL = waLink ? waLink.getAttribute('href') : '';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Navegación: sombra al hacer scroll ---------- */
  var nav = document.querySelector('[data-nav]');
  var sentinel = document.querySelector('[data-nav-sentinel]');
  if (nav && sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      function (entries) {
        nav.dataset.scrolled = String(!entries[0].isIntersecting);
      },
      { rootMargin: '0px' }
    ).observe(sentinel);
  }

  /* ---------- Menú móvil ---------- */
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.querySelector('[data-menu]');
  if (toggle && menu) {
    var setMenu = function (open) {
      menu.dataset.open = String(open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', function () {
      setMenu(menu.dataset.open !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.dataset.open === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  /* ---------- Reveal por scroll (jerarquía: el contenido entra al leerse) ---------- */
  var revealables = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) {
      el.dataset.visible = 'true';
    });
  } else {
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.dataset.visible = 'true';
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );
    revealables.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------- Marquesina: duplicar el contenido para un bucle sin cortes ---------- */
  var track = document.querySelector('[data-marquee]');
  if (track && !reduceMotion) {
    track.innerHTML += track.innerHTML;
    track.querySelectorAll(':scope > *').forEach(function (node, i, all) {
      if (i >= all.length / 2) node.setAttribute('aria-hidden', 'true');
    });
  }

  /* ---------- Foco de las tarjetas siguiendo al cursor ----------
     Se escribe en variables CSS dentro de un rAF: el trabajo de pintado lo hace
     el compositor, no JavaScript. Se ignora en dispositivos sin puntero fino
     (en táctil no hay hover y sería trabajo tirado a la basura). ---------- */
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.card').forEach(function (card) {
      var frame = null;
      card.addEventListener('pointermove', function (e) {
        if (frame) return;
        frame = requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          card.style.setProperty('--my', (e.clientY - r.top) + 'px');
          frame = null;
        });
      });
    });
  }

  /* ---------- FAQ (feedback: confirma la apertura) ---------- */
  document.querySelectorAll('[data-faq-q]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (panel) panel.dataset.open = String(!open);
    });
  });

  /* ---------- Formulario: validación, estados y envío ---------- */
  var form = document.querySelector('[data-form]');
  if (!form) return;

  var status = form.querySelector('[data-status]');
  var submit = form.querySelector('[type="submit"]');
  // Solo se toca el span de texto: si se usara textContent en el botón entero
  // se borraría el icono SVG que lleva dentro.
  var submitLabelEl = submit ? submit.querySelector('[data-label]') : null;
  var submitLabel = submitLabelEl ? submitLabelEl.textContent : '';

  var showError = function (field, message) {
    var input = field.querySelector('input, select, textarea');
    var box = field.querySelector('.error');
    if (input) input.setAttribute('aria-invalid', 'true');
    if (box) {
      box.textContent = message;
      box.dataset.show = 'true';
    }
  };

  var clearError = function (field) {
    var input = field.querySelector('input, select, textarea');
    var box = field.querySelector('.error');
    if (input) input.removeAttribute('aria-invalid');
    if (box) box.dataset.show = 'false';
  };

  var validate = function () {
    var ok = true;
    var firstBad = null;

    form.querySelectorAll('[data-field]').forEach(function (field) {
      var input = field.querySelector('input, select, textarea');
      if (!input || !input.required) return;
      var value = input.value.trim();
      clearError(field);

      if (!value) {
        showError(field, 'Este campo es obligatorio.');
        ok = false;
        firstBad = firstBad || input;
        return;
      }
      if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        showError(field, 'Revisa el correo, parece que falta algo.');
        ok = false;
        firstBad = firstBad || input;
      }
    });

    if (firstBad) firstBad.focus();
    return ok;
  };

  form.querySelectorAll('[data-field] input, [data-field] select, [data-field] textarea').forEach(function (input) {
    input.addEventListener('input', function () {
      var field = input.closest('[data-field]');
      if (field && input.getAttribute('aria-invalid') === 'true') clearError(field);
    });
  });

  var setLoading = function (loading) {
    if (!submit) return;
    submit.dataset.loading = String(loading);
    if (submitLabelEl) submitLabelEl.textContent = loading ? 'Enviando' : submitLabel;
  };

  var whatsappFallback = function (data) {
    var texto = [
      'Hola, soy ' + data.nombre + '.',
      'Me interesa: ' + data.servicio + '.',
      '',
      data.mensaje,
      '',
      'Mi correo: ' + data.email
    ].join('\n');
    window.open(WHATSAPP_URL + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (status) {
      status.textContent = '';
      status.removeAttribute('data-state');
    }
    if (!validate()) {
      if (status) {
        status.textContent = 'Faltan algunos datos por completar.';
        status.dataset.state = 'error';
      }
      return;
    }

    var fd = new FormData(form);
    var data = {
      nombre: (fd.get('nombre') || '').toString().trim(),
      email: (fd.get('email') || '').toString().trim(),
      servicio: (fd.get('servicio') || '').toString().trim(),
      mensaje: (fd.get('mensaje') || '').toString().trim()
    };

    if (!FORM_ENDPOINT) {
      if (!WHATSAPP_URL) {
        if (status) {
          status.textContent = 'Falta configurar el número de WhatsApp en el enlace [data-wa].';
          status.dataset.state = 'error';
        }
        return;
      }
      whatsappFallback(data);
      if (status) {
        status.textContent = 'Abriendo WhatsApp con el mensaje ya redactado.';
        status.dataset.state = 'ok';
      }
      return;
    }

    setLoading(true);
    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: fd
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        if (status) {
          status.textContent = 'Mensaje recibido. Te respondo en menos de 24 horas.';
          status.dataset.state = 'ok';
        }
      })
      .catch(function () {
        if (status) {
          status.textContent = 'No se pudo enviar. Escríbeme directamente por WhatsApp.';
          status.dataset.state = 'error';
        }
      })
      .finally(function () {
        setLoading(false);
      });
  });
})();
