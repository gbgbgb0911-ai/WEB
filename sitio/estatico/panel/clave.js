/* Cambiar su propia clave, desde cualquiera de los dos paneles.
 *
 * Hace falta: las cuentas se crean con una clave temporal que le pasa una
 * administradora, y sin esto la persona se queda con esa clave para siempre.
 * Tampoco hay recuperación por correo, así que si alguien la olvida, una
 * administradora se la restablece desde la pestaña Equipo.
 */

import { ErrorSesion } from '/panel/sesion.js';
import { $, brindis, abrirHoja, cerrarHoja, cabeceraHoja } from '/panel/ui.js';

const MINIMO = 10;

let alFallar = () => {};

export function montarCambioClave({ fallo }) {
  alFallar = fallo;
  const boton = $('#btn-clave');
  if (!boton) return;
  boton.addEventListener('click', abrir);
}

function abrir() {
  abrirHoja('clave', cabeceraHoja('Cambiar mi clave') + `
    <div class="aviso oculto" id="clave-aviso" role="alert"></div>
    <form id="forma-clave" style="padding-top:12px" novalidate>
      <label class="campo"><span>Clave actual</span>
        <input type="password" name="actual" autocomplete="current-password" required></label>
      <label class="campo"><span>Clave nueva</span>
        <input type="password" name="nueva" autocomplete="new-password"
               required></label>
      <label class="campo"><span>Repite la nueva</span>
        <input type="password" name="repetir" autocomplete="new-password"
               required></label>
      <button class="btn btn--ancho" type="submit">Guardar clave</button>
    </form>
    <p class="tarjeta__meta" style="margin-top:8px">
      Mínimo ${MINIMO} caracteres. Al guardarla se cierran las sesiones
      abiertas en otros teléfonos.
    </p>`);

  $('#forma-clave').addEventListener('submit', guardar);
}

async function guardar(ev) {
  ev.preventDefault();
  const forma = ev.target;
  const boton = forma.querySelector('button');
  const aviso = $('#clave-aviso');
  const datos = new FormData(forma);
  const nueva = String(datos.get('nueva'));

  const mal = (texto) => {
    aviso.className = 'aviso aviso--malo';
    aviso.textContent = texto;
    aviso.classList.remove('oculto');
  };

  if (nueva !== String(datos.get('repetir'))) return mal('Las dos claves nuevas no coinciden.');
  if (nueva.length < MINIMO) return mal(`La clave nueva necesita al menos ${MINIMO} caracteres.`);
  if (nueva === String(datos.get('actual'))) return mal('La clave nueva es igual a la actual.');

  boton.disabled = true;
  boton.textContent = 'Guardando…';
  aviso.classList.add('oculto');
  try {
    const r = await fetch('/auth/change-password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        currentPassword: datos.get('actual'),
        newPassword: nueva,
        // Si alguien más tenía la clave temporal, se queda fuera.
        revokeOtherSessions: true,
      }),
    });
    const cuerpo = await r.json().catch(() => null);

    if (r.status === 400 && cuerpo && cuerpo.code === 'INVALID_PASSWORD') {
      return mal('La clave actual no es correcta.');
    }
    if (r.status === 401) throw new ErrorSesion('Tu sesión venció. Entra otra vez.');
    if (!r.ok) return mal((cuerpo && cuerpo.message) || 'No se pudo cambiar la clave.');

    cerrarHoja();
    brindis('Clave cambiada.');
  } catch (e) {
    if (e instanceof ErrorSesion) { cerrarHoja(); alFallar(e); return; }
    mal('Sin conexión. Vuelve a intentar.');
  } finally {
    boton.disabled = false;
    boton.textContent = 'Guardar clave';
  }
}
