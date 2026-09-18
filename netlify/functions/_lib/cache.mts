import { purgeCache } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

/* Caché de las páginas públicas.
 *
 * Las páginas del catálogo se arman al momento desde la base, pero no en
 * cada visita: el CDN de Netlify guarda cada respuesta y la sirve sin tocar
 * la función hasta que algo cambie. Cuando el panel guarda un cambio, se
 * purga la etiqueta `catalogo` y las páginas se vuelven a armar la próxima
 * vez que alguien las pida.
 *
 * Así el equipo sube productos y aparecen al instante, sin construir ni
 * desplegar nada, y una visita normal sigue siendo un archivo servido desde
 * el borde, igual de rápido que cuando el sitio era estático.
 */

export const ETIQUETA = "catalogo";

/** Cabeceras para una página pública: se cachea hasta que se purgue. */
export function cabecerasCache(extra: string[] = []) {
  return {
    "content-type": "text/html; charset=utf-8",
    // El navegador siempre pregunta; el borde responde de caché.
    "cache-control": "public, max-age=0, must-revalidate",
    // `durable`: una sola copia compartida por todos los nodos del borde,
    // así una purga vale para todos y la función se llama una vez por página.
    "netlify-cdn-cache-control": "public, durable, s-maxage=31536000, stale-while-revalidate=60",
    "netlify-cache-tag": [ETIQUETA, ...extra].join(","),
  };
}

/* Cabeceras para un "no encontrado". No se guarda en ningún sitio.
 *
 * Un 404 guardado es una ruta que se queda rota mientras dure. Mientras hubo
 * una regla comodín mandando aquí cualquier dirección, las URLs de las fotos
 * caían dentro y se guardaban con un año de vida: más de cien fotos del
 * catálogo desaparecieron así, con los archivos intactos en el servidor. La
 * regla ya no está, pero esto tampoco se guarda: un 404 es siempre una
 * respuesta sobre este instante, no sobre el año que viene.
 *
 * Cuesta una llamada a la función por cada 404. Es barato al lado de dejar
 * una dirección rota por haberla guardado. */
export function cabecerasNoEncontrada() {
  return {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "netlify-cdn-cache-control": "no-store",
  };
}

/* Un despliegue nuevo también tiene que tirar lo guardado.
 *
 * Las páginas llevan dentro el CSS y el guion, así que una página guardada es
 * también una copia del diseño de ese momento. Sin esto, tras desplegar
 * seguía sirviéndose el diseño viejo hasta que alguien guardara algo en el
 * panel. Se comprueba una vez por instancia, con una lectura de un cuaderno
 * compartido: si el despliegue no es el que quedó anotado, se purga y se
 * anota. Que dos instancias purguen a la vez no hace daño. */
let comprobado = false;

export async function purgarSiHayDespliegueNuevo(despliegue: string | undefined) {
  if (comprobado || !despliegue) return;
  comprobado = true;
  try {
    const cuaderno = getStore({ name: "despliegues", consistency: "strong" });
    if (await cuaderno.get("ultimo", { type: "text" }) === despliegue) return;
    await cuaderno.set("ultimo", despliegue);
    await purgeCache({ tags: [ETIQUETA] });
    console.log("purga: despliegue nuevo", despliegue);
  } catch (e) {
    console.error("purga por despliegue:", e instanceof Error ? e.message : e);
  }
}

/** Tira las páginas cacheadas. Nunca hace fallar la operación que lo llama. */
export async function invalidar(motivo: string) {
  try {
    await purgeCache({ tags: [ETIQUETA] });
  } catch (e) {
    // Si la purga falla, `stale-while-revalidate` acaba refrescando igual;
    // solo tarda más. Queda en el registro para saber que pasó.
    console.error("purga:", motivo, e instanceof Error ? e.message : e);
  }
}
