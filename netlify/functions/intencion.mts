import type { Config, Context } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";

/* Registra un clic en "Continuar compra".
 *
 * Esto es el dato del panel: qué productos, colores y tallas piden más.
 * No hay ventas porque la venta se cierra en WhatsApp y la web no la ve;
 * esto mide intención, que es lo que sí se puede medir con honestidad.
 *
 * Llega por sendBeacon, así que nunca debe hacer esperar al cliente:
 * responde 204 y si algo falla se descarta en silencio.
 */

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });

  const url = Netlify.env.get("DATABASE_URL");
  if (!url) return new Response(null, { status: 204 });

  try {
    const cuerpo = await req.json() as {
      producto_id?: unknown; color_id?: unknown; talla?: unknown; precio?: unknown;
    };

    const pid = Number(cuerpo.producto_id);
    if (!Number.isInteger(pid) || pid <= 0) return new Response(null, { status: 204 });

    const cid = Number(cuerpo.color_id);
    const precio = Number(cuerpo.precio);
    const talla = typeof cuerpo.talla === "string" ? cuerpo.talla.slice(0, 40) : null;

    const sql = neon(url);
    await sql`
      insert into negocio.intencion (producto_id, color_id, talla, precio, origen)
      select ${pid}, ${Number.isInteger(cid) && cid > 0 ? cid : null}, ${talla},
             ${Number.isFinite(precio) && precio >= 0 ? precio : null}, 'ficha'
       where exists (select 1 from catalogo.producto where id = ${pid})`;

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error("intencion:", e instanceof Error ? e.message : e);
    return new Response(null, { status: 204 });
  }
};

export const config: Config = {
  path: "/api/intencion",
};
