/* La hoja de estilos, metida dentro del HTML.
 *
 * Antes iba como <link href="/estilos.css?v=...">: una segunda petición de la
 * que dependía todo el diseño. Si esa petición fallaba —sin señal a mitad de
 * carga, un service worker viejo, un caché intermedio— la página salía en
 * Times New Roman, con los enlaces azules y las fotos apiladas. Pasó de
 * verdad, dos veces, en el navegador de quien administra la tienda.
 *
 * Ahora la hoja viaja dentro de la misma respuesta que la página. Si llega el
 * HTML, llega el diseño: no hay nada en medio que pueda fallar por separado.
 * Son unos 4 KB comprimidos por página, y la página ya la sirve el borde
 * comprimida y cacheada.
 *
 * La función se la pide una vez a su propio sitio y la guarda en memoria
 * mientras viva la instancia. Si esa petición falla, se devuelve null y la
 * plantilla vuelve al <link> de siempre: nunca una página sin estilos.
 */

let hoja: string | null = null;
let pedida: Promise<string | null> | null = null;

const ESPERA = 3000;   // ms; pasado esto se sirve la página con <link>

/** El CSS listo para meter en un <style>, o null si no se pudo leer. */
export async function estilos(base: string): Promise<string | null> {
  if (hoja !== null) return hoja;
  if (!pedida) pedida = leer(base).finally(() => { pedida = null; });
  return pedida;
}

async function leer(base: string): Promise<string | null> {
  try {
    const corte = AbortSignal.timeout(ESPERA);
    const r = await fetch(`${base}/estilos.css`, { signal: corte });
    if (!r.ok) return null;
    const tipo = r.headers.get("content-type") || "";
    if (!tipo.includes("text/css")) return null;   // una página de error no es una hoja
    const texto = await r.text();
    if (texto.length < 500) return null;           // algo llegó cortado
    // En CSS no aparece, pero un "</style" dentro cerraría la etiqueta antes
    // de tiempo y el resto de la hoja se pintaría como texto.
    hoja = texto.replace(/<\/(style)/gi, "<\\/$1");
    return hoja;
  } catch {
    return null;   // sin red, lento, o el sitio aún no sirve el archivo
  }
}

/** Solo para las pruebas: olvida lo guardado. */
export function olvidar() { hoja = null; pedida = null; }
