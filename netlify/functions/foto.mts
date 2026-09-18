import type { Config, Context } from "@netlify/functions";
import { almacen } from "./_lib/fotos.mts";

/* Sirve una foto subida por el equipo: /img/subidas/<clave>
 *
 * La clave lleva el hash del contenido, así que el archivo nunca cambia y se
 * puede cachear para siempre. El CDN de imágenes de Netlify pide por aquí
 * cuando una página pone /.netlify/images?url=/img/subidas/...
 */

const EXTENSIONES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export default async (req: Request, _ctx: Context) => {
  const clave = decodeURIComponent(new URL(req.url).pathname.replace(/^\/img\/subidas\//, ""));

  // Un 404 aquí no se guarda nunca: la foto puede estar subiéndose en este
  // instante, y una foto rota guardada en el borde dura más que el problema.
  const SIN_GUARDAR = { "cache-control": "no-store", "netlify-cdn-cache-control": "no-store" };

  // Sin barras ni puntos dobles: la clave es un nombre plano dentro del
  // almacén y no tiene por qué poder salirse de él.
  if (!/^[0-9a-f]{32}\.(jpg|png|webp)$/.test(clave)) {
    return new Response("No encontrada", { status: 404, headers: SIN_GUARDAR });
  }

  let cuerpo: ArrayBuffer | null = null;
  try {
    cuerpo = await almacen().get(clave, { type: "arrayBuffer" });
  } catch (e) {
    console.error("foto:", e instanceof Error ? e.message : e);
    return new Response("No se pudo leer la foto", { status: 502, headers: SIN_GUARDAR });
  }
  if (!cuerpo) return new Response("No encontrada", { status: 404, headers: SIN_GUARDAR });

  const extension = clave.split(".").pop() as string;
  return new Response(cuerpo, {
    headers: {
      "content-type": EXTENSIONES[extension],
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(cuerpo.byteLength),
    },
  });
};

export const config: Config = {
  path: "/img/subidas/:clave",
};
