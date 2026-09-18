/* Sesión y llamadas a la API, compartido por los paneles del equipo.
 *
 * Cómo funciona, en corto:
 *
 *   1. `entrar()` manda correo y clave a /auth/sign-in/email. Neon Auth
 *      responde con una cookie de sesión de 7 días. El proxy de Netlify hace
 *      que esa cookie sea de este dominio (ver netlify.toml): si fuera del
 *      dominio de Neon, Safari la bloquearía y el iPhone no podría entrar.
 *   2. Con la cookie, /auth/token entrega un JWT de 15 minutos.
 *   3. Ese JWT viaja como Bearer a /api/panel/*, que verifica la firma y lee
 *      el rol en la base.
 *
 * El JWT vive solo en memoria y se renueva cuando hace falta. No se guarda en
 * localStorage: si alguien logra colar un script en la página, no se lo lleva.
 * La cookie es HttpOnly, así que tampoco.
 */

const AUTH = '/auth';
const API = '/api/panel';

let token = null;       // JWT en memoria
let vence = 0;          // epoch ms
let pidiendo = null;    // promesa en vuelo, para no pedir dos a la vez

export class ErrorSesion extends Error {}          // hay que volver a entrar
export class ErrorPermiso extends Error {}         // entró, pero no le toca
export class ErrorRed extends Error {}             // sin señal

function esRed(e) {
  return e instanceof TypeError || e instanceof ErrorRed;
}

async function pedirJson(url, opciones) {
  let r;
  try {
    r = await fetch(url, { credentials: 'include', ...opciones });
  } catch (e) {
    throw new ErrorRed('Sin conexión. Revisa tus datos o el wifi.');
  }
  let cuerpo = null;
  try { cuerpo = await r.json(); } catch (e) { /* puede venir vacío */ }
  return { r, cuerpo };
}

/* ------------------------------------------------------------------ sesión */

export async function entrar(email, clave) {
  const { r, cuerpo } = await pedirJson(`${AUTH}/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: String(email).trim(), password: clave }),
  });
  if (!r.ok) {
    // Neon manda INVALID_EMAIL_OR_PASSWORD sin distinguir cuál de los dos, y
    // está bien: decir "ese correo no existe" le regala usuarios a cualquiera.
    const codigo = cuerpo && cuerpo.code;
    if (codigo === 'INVALID_EMAIL_OR_PASSWORD') {
      throw new ErrorSesion('Correo o clave incorrectos.');
    }
    if (r.status === 429) {
      throw new ErrorSesion('Demasiados intentos. Espera un minuto.');
    }
    throw new ErrorSesion((cuerpo && cuerpo.message) || 'No se pudo entrar.');
  }
  token = null; vence = 0;
  return await yo();
}

export async function salir() {
  token = null; vence = 0;
  try {
    await fetch(`${AUTH}/sign-out`, { method: 'POST', credentials: 'include' });
  } catch (e) { /* si falla, la cookie caduca sola */ }
}

/** JWT válido, renovándolo si le queda poco. */
async function jwt() {
  if (token && Date.now() < vence - 30000) return token;
  if (pidiendo) return pidiendo;

  pidiendo = (async () => {
    const { r, cuerpo } = await pedirJson(`${AUTH}/token`);
    if (r.status === 401 || !(cuerpo && cuerpo.token)) {
      throw new ErrorSesion('Tu sesión venció. Entra otra vez.');
    }
    if (!r.ok) throw new ErrorRed('El servidor de sesión no responde.');
    token = cuerpo.token;
    // El token dura 15 min. Se lee su `exp` en vez de asumirlo, por si Neon
    // lo cambia.
    try {
      const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      vence = (p.exp || 0) * 1000;
    } catch (e) {
      vence = Date.now() + 10 * 60 * 1000;
    }
    return token;
  })();

  try { return await pidiendo; } finally { pidiendo = null; }
}

/* --------------------------------------------------------------------- API */

export async function api(ruta, opciones = {}) {
  const t = await jwt();
  const cabeceras = { authorization: `Bearer ${t}`, ...(opciones.headers || {}) };
  if (opciones.cuerpo !== undefined) {
    cabeceras['content-type'] = 'application/json';
    opciones = { ...opciones, method: opciones.method || 'POST',
                 body: JSON.stringify(opciones.cuerpo) };
  }
  const { r, cuerpo } = await pedirJson(`${API}/${ruta}`, { ...opciones, headers: cabeceras });

  if (r.status === 401) {
    token = null; vence = 0;
    throw new ErrorSesion((cuerpo && cuerpo.error) || 'Tu sesión venció.');
  }
  if (r.status === 403) {
    throw new ErrorPermiso((cuerpo && cuerpo.error) || 'No tienes permiso para esto.');
  }
  if (!r.ok) {
    throw new Error((cuerpo && cuerpo.error) || `Error ${r.status}.`);
  }
  return cuerpo;
}

export function yo() { return api('yo'); }

/** ¿Hay sesión abierta? Sin lanzar: para decidir qué pantalla mostrar. */
export async function sesionAbierta() {
  try {
    return await yo();
  } catch (e) {
    if (esRed(e)) throw e;
    return null;
  }
}

export { esRed };
