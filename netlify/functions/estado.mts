import type { Config, Context } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";

/* Estado en vivo del catálogo.
 *
 * El catálogo es estático: se genera y se publica. Pero agotar u ocultar un
 * producto pasa varias veces al día, y reconstruir el sitio por cada cambio
 * gastaría los minutos de build de Netlify. Así que eso sale de aquí.
 *
 * Solo lo que cambia seguido: qué está oculto y qué está agotado. Nombres,
 * fotos y precios siguen viniendo del HTML estático.
 *
 * Se cachea 60 s en el borde, así que la mayoría de visitas no llega a Neon:
 * ni gasta su transferencia ni sufre el arranque en frío.
 */

type Fila = { id: number; visible: boolean; agotado: boolean };
type Variante = { color_id: number; agotado: boolean };
type Talla = { color_id: number; nombre: string };

export default async (_req: Request, _context: Context) => {
  const url = Netlify.env.get("DATABASE_URL");
  if (!url) {
    // Sin base configurada el catálogo funciona igual: todo visible.
    return respuesta({ ocultos: [], agotados: [], colores: [], tallas: [], error: "sin-bd" }, 30);
  }

  try {
    const sql = neon(url);

    const [productos, colores, tallas] = await Promise.all([
      sql`select id, visible, agotado
            from catalogo.producto
           where not archivado and (not visible or agotado)` as unknown as Promise<Fila[]>,
      sql`select id as color_id, agotado
            from catalogo.color
           where agotado` as unknown as Promise<Variante[]>,
      sql`select color_id, nombre
            from catalogo.talla
           where agotado` as unknown as Promise<Talla[]>,
    ]);

    return respuesta({
      generado: new Date().toISOString(),
      ocultos: productos.filter((p) => !p.visible).map((p) => p.id),
      agotados: productos.filter((p) => p.visible && p.agotado).map((p) => p.id),
      colores: colores.map((c) => c.color_id),
      tallas: tallas.map((t) => `${t.color_id}:${t.nombre}`),
    }, 60);
  } catch (e) {
    // Si Neon falla, el catálogo no se rompe: se sirve como si todo estuviera bien.
    console.error("estado:", e instanceof Error ? e.message : e);
    return respuesta({ ocultos: [], agotados: [], colores: [], tallas: [], error: "sin-respuesta" }, 15);
  }
};

function respuesta(cuerpo: unknown, segundos: number) {
  return new Response(JSON.stringify(cuerpo), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      // El borde lo guarda; el navegador lo revalida rápido.
      "cache-control": `public, max-age=30, s-maxage=${segundos}, stale-while-revalidate=300`,
    },
  });
}

export const config: Config = {
  path: "/api/estado",
};
