/* Panel del equipo.
 *
 * Buscar un producto (por nombre o por la "Ref." que llega en el mensaje de
 * WhatsApp), marcarlo agotado, ocultarlo del catálogo, y agotar un color o
 * una talla suelta. Nada se borra: ocultar es reversible y cada cambio queda
 * anotado con el correo de quien lo hizo.
 *
 * Una administradora que entre por aquí ve además los precios y el archivo:
 * es el mismo panel, con lo que su rol permite.
 */

import { entrar, salir, sesionAbierta, ErrorPermiso } from '/panel/sesion.js';
import { $, brindis, hacerFallo, vigilarSenal, montarHoja, montarPWA,
         cerrarHoja } from '/panel/ui.js';
import { crearLista } from '/panel/lista.js';
import { montarCambioClave } from '/panel/clave.js';

let yo = null;
let lista = null;

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
  $('#rol').textContent = yo.rol === 'admin' ? 'Administración' : 'Equipo';
  const enlace = $('#a-admin');
  if (enlace) enlace.classList.toggle('oculto', yo.rol !== 'admin');
  if (!lista) {
    lista = crearLista({ rol: yo.rol, fallo });
    $('#btn-nuevo').addEventListener('click', () => lista.nuevo());
  }
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
    yo = await entrar(datos.get('email'), datos.get('clave'));
    ev.target.reset();
    aPanel();
    await lista.listar(true);
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

vigilarSenal();
montarHoja();
montarCambioClave({ fallo });
montarPWA('/trabajador/sw.js', '/trabajador/');

(async function arrancar() {
  $('#entrada').hidden = true;
  $('#panel').hidden = false;
  $('#lista').innerHTML = '<li class="esqueleto"></li><li class="esqueleto"></li>'
    + '<li class="esqueleto"></li><li class="esqueleto"></li>';

  let sesion;
  try {
    sesion = await sesionAbierta();
  } catch (e) {
    $('#lista').innerHTML = '';
    aEntrada('Sin conexión. Conéctate y vuelve a intentar.');
    return;
  }

  if (!sesion) { $('#lista').innerHTML = ''; aEntrada(''); return; }
  yo = sesion;
  aPanel();
  await lista.listar(true);
})();
