import { purgeCache } from "@netlify/functions";

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
