import { getStore } from "@netlify/blobs";

/* Fotos que sube el equipo.
 *
 * Van a Netlify Blobs, no a la base: una foto de 300 KB en Postgres se come
 * el medio giga del plan gratis en dos tardes. Y no a Neon Object Storage,
 * que no existe en esta región (comprobado: "branchable-storage is not
 * available in this region").
 *
 * La clave es el sha-256 del archivo, así que subir dos veces la misma foto
 * no ocupa el doble y la URL se puede cachear para siempre.
 *
 * El navegador las sirve por /img/subidas/<clave>, y las páginas públicas
 * las piden a través del CDN de imágenes de Netlify, que las redimensiona y
 * las pasa a WebP al vuelo. Así una foto subida se comporta igual que una
 * de la extracción sin pasar por el generador.
 */

export const TIPOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** 6 MB es el tope de cuerpo de una función; el panel encoge antes de subir. */
export const TOPE = 6 * 1024 * 1024;

export function almacen() {
  return getStore({ name: "fotos", consistency: "strong" });
}

export async function clavePara(bytes: ArrayBuffer, extension: string) {
  const resumen = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(resumen))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 32)}.${extension}`;
}
