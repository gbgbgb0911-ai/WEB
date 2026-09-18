/* La hoja de estilos y el guion, metidos dentro del HTML.
 *
 * Antes iban como <link href="/estilos.css?v=..."> y <script src="/app.js?v=...">:
 * dos peticiones aparte de las que dependía todo. Si fallaba la primera, la
 * página salía en Times New Roman con los enlaces azules. Si fallaba la
 * segunda, el catálogo salía bien pero vacío: las tarjetas nacen invisibles y
 * es el guion el que las muestra al entrar en pantalla. Las dos cosas pasaron
 * de verdad, en el navegador de quien administra la tienda, con los archivos
 * sirviéndose perfectos en producción.
 *
 * Ahora viajan dentro de la misma respuesta que la página. Si llega el HTML,
 * llega el diseño y llega la interacción: no hay nada en medio que pueda
 * fallar por separado. Son unos 6 KB comprimidos por página, que antes
 * viajaban igual, solo que aparte.
 *
 * La función se los pide una vez a su propio sitio y los guarda en memoria
 * mientras viva la instancia. Si esa petición falla, se devuelve null y la
 * plantilla vuelve al <link> y al <script src> de siempre.
 */

const ESPERA = 3000;   // ms; pasado esto se sirve la página con los enlaces

type Activo = { ruta: string; tipos: string[]; minimo: number };

const HOJA: Activo = { ruta: "/estilos.css", tipos: ["text/css"], minimo: 500 };
const GUION: Activo = { ruta: "/app.js", tipos: ["javascript", "ecmascript"], minimo: 500 };

const guardado = new Map<string, string>();
const enCurso = new Map<string, Promise<string | null>>();

/** El CSS listo para meter en un <style>, o null si no se pudo leer. */
export const hoja = (base: string) => activo(base, HOJA);

/** El JS listo para meter en un <script>, o null si no se pudo leer. */
export const guion = (base: string) => activo(base, GUION);

async function activo(base: string, a: Activo): Promise<string | null> {
  const ya = guardado.get(a.ruta);
  if (ya !== undefined) return ya;
  let pedida = enCurso.get(a.ruta);
  if (!pedida) {
    pedida = leer(base, a).finally(() => enCurso.delete(a.ruta));
    enCurso.set(a.ruta, pedida);
  }
  return pedida;
}

async function leer(base: string, a: Activo): Promise<string | null> {
  try {
    const r = await fetch(`${base}${a.ruta}`, { signal: AbortSignal.timeout(ESPERA) });
    if (!r.ok) return null;
    const tipo = (r.headers.get("content-type") || "").toLowerCase();
    if (!a.tipos.some((t) => tipo.includes(t))) return null;   // una página de error no vale
    const texto = await r.text();
    if (texto.length < a.minimo) return null;                  // algo llegó cortado
    // Ni en el CSS ni en el JS aparece, pero un "</style" o un "</script"
    // dentro cerraría la etiqueta antes de tiempo y el resto se pintaría
    // como texto en medio de la página.
    const limpio = texto.replace(/<\/(style|script)/gi, "<\\/$1");
    guardado.set(a.ruta, limpio);
    return limpio;
  } catch {
    return null;   // sin red, lento, o el sitio aún no sirve el archivo
  }
}

/** Solo para las pruebas: olvida lo guardado. */
export function olvidar() { guardado.clear(); enCurso.clear(); }
