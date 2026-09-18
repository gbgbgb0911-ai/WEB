/* Piezas de interfaz que usan los dos paneles. */

import { ErrorSesion, ErrorPermiso, esRed } from '/panel/sesion.js';

export const $ = (s, raiz = document) => raiz.querySelector(s);

export function escapar(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SOLES = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2,
                                               maximumFractionDigits: 2 });

export function moneda(v) {
  // Con separador de miles: el tablero llega a cifras de cinco dígitos y
  // "S/ 11100.00" se lee mal de un vistazo.
  return v === null || v === undefined || v === '' ? '—' : 'S/ ' + SOLES.format(Number(v));
}

export function numero(n) {
  return new Intl.NumberFormat('es-PE').format(Number(n) || 0);
}

export function fecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-PE', { day: '2-digit', month: 'short',
                                     hour: '2-digit', minute: '2-digit' });
}

/* ----------------------------------------------------------------- brindis */

let tiempo;
export function brindis(texto, malo = false) {
  const caja = $('#brindis');
  if (!caja) return;
  caja.textContent = texto;
  caja.classList.toggle('brindis--malo', malo);
  caja.classList.add('esta');
  clearTimeout(tiempo);
  tiempo = setTimeout(() => caja.classList.remove('esta'), malo ? 4200 : 2200);
}

/* Traduce un error a algo que se pueda leer y actuar. `alSalir` se llama
 * cuando la sesión ya no vale, para volver a la pantalla de entrada. */
export function hacerFallo(alSalir) {
  return function fallo(e) {
    if (e instanceof ErrorSesion) { alSalir(e.message); return; }
    if (e instanceof ErrorPermiso) { brindis(e.message, true); return; }
    brindis(esRed(e) ? 'Sin conexión. Vuelve a intentar.' : (e.message || 'Algo falló.'), true);
  };
}

/* ---------------------------------------------------------------- sin señal */

export function vigilarSenal() {
  const caja = $('#sinsenal');
  if (!caja) return;
  const pintar = () => caja.classList.toggle('oculto', navigator.onLine);
  addEventListener('online', pintar);
  addEventListener('offline', pintar);
  pintar();
}

/* ------------------------------------------------------------------- hoja */

let abiertaPara = null;

export function cerrarHoja() {
  const hoja = $('#hoja'), velo = $('#velo');
  abiertaPara = null;
  hoja.classList.remove('esta');
  velo.classList.remove('esta');
  setTimeout(() => {
    if (abiertaPara !== null) return;
    hoja.hidden = true;
    velo.classList.add('oculto');
  }, 250);
}

export function abrirHoja(clave, contenido) {
  const hoja = $('#hoja'), velo = $('#velo');
  abiertaPara = clave;
  velo.classList.remove('oculto');
  hoja.hidden = false;
  hoja.innerHTML = contenido;
  requestAnimationFrame(() => { velo.classList.add('esta'); hoja.classList.add('esta'); });
  const cerrar = $('.hoja__cerrar', hoja);
  if (cerrar) cerrar.addEventListener('click', cerrarHoja);
}

export function hojaAbiertaPara() { return abiertaPara; }

export function cabeceraHoja(titulo) {
  return `<div class="hoja__tope">
      <h2 id="hoja-titulo">${escapar(titulo)}</h2>
      <button class="hoja__cerrar" type="button" aria-label="Cerrar">&times;</button>
    </div>`;
}

export function montarHoja() {
  $('#velo').addEventListener('click', cerrarHoja);
  addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && abiertaPara !== null) cerrarHoja();
  });
}

/* ------------------------------------------------------- service worker */

export function montarPWA(ruta, alcance) {
  if (!('serviceWorker' in navigator)) return;
  addEventListener('load', () => {
    navigator.serviceWorker.register(ruta, { scope: alcance })
      .catch(() => { /* sin service worker el panel funciona, solo sin caché */ });
  });
}
