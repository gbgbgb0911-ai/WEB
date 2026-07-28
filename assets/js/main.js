/* ==========================================================================
   HEX - Interacciones de la landing
   Sin dependencias. Todo el motion respeta prefers-reduced-motion.
   Prohibido: listeners de 'scroll' en cada frame. Se usa IntersectionObserver.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIGURA AQUÍ EL DESTINO DEL FORMULARIO
     Deja FORM_ENDPOINT vacío ('') y el formulario abrirá el correo del
     usuario con todo relleno (funciona sin backend, desde el minuto uno).
     Cuando tengas un endpoint (Formspree, Netlify Forms, tu propia API),
     pégalo aquí y el envío pasará a ser en segundo plano, sin salir de la web.
     ------------------------------------------------------------------ */
  var FORM_ENDPOINT = '';
  var CONTACT_EMAIL = 'hola@hex.studio';

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
  var submitLabel = submit ? submit.textContent : '';

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
    submit.textContent = loading ? 'Enviando' : submitLabel;
  };

  var mailtoFallback = function (data) {
    var body = [
      'Nombre: ' + data.nombre,
      'Email: ' + data.email,
      'Necesita: ' + data.servicio,
      '',
      data.mensaje
    ].join('\n');
    window.location.href =
      'mailto:' + CONTACT_EMAIL +
      '?subject=' + encodeURIComponent('Nuevo proyecto: ' + data.nombre) +
      '&body=' + encodeURIComponent(body);
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
      mailtoFallback(data);
      if (status) {
        status.textContent = 'Abriendo tu correo con el mensaje ya preparado.';
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
          status.textContent = 'No se pudo enviar. Escríbeme directamente a ' + CONTACT_EMAIL + '.';
          status.dataset.state = 'error';
        }
      })
      .finally(function () {
        setLoading(false);
      });
  });
})();
