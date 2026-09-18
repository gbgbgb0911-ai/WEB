import type { Config, Context } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";
import { sesionDe, anotar, json, errorDe, SinPermiso, type Sesion } from "./_lib/sesion.mts";

/* API del panel. Una sola función con ruteo interno, para que el despliegue
 * sea una pieza y no diez.
 *
 *   GET  /api/panel/yo
 *   GET  /api/panel/productos?q=&cat=&estado=&pagina=
 *   GET  /api/panel/producto/:id
 *   POST /api/panel/producto/:id/estado   { agotado?, visible? }
 *   POST /api/panel/color/:id/estado      { agotado }
 *   POST /api/panel/talla/:id/estado      { agotado }
 *
 * Las trabajadoras pueden agotar y ocultar. Archivar y editar precios es de
 * admin. Nada se borra nunca.
 */

const PAGINA = 24;

export default async (req: Request, _ctx: Context) => {
  const url = Netlify.env.get("DATABASE_URL");
  if (!url) return json({ error: "Base de datos no configurada" }, 503);
  const sql = neon(url);

  const ruta = new URL(req.url).pathname.replace(/^\/api\/panel\/?/, "").replace(/\/+$/, "");
  const partes = ruta ? ruta.split("/") : [];

  try {
    if (partes[0] === "yo" && req.method === "GET") {
      const yo = await sesionDe(req, sql, ["admin", "trabajadora"]);
      return json(yo);
    }

    if (partes[0] === "productos" && req.method === "GET") {
      const yo = await sesionDe(req, sql, ["admin", "trabajadora"]);
      return await listar(req, sql, yo);
    }

    if (partes[0] === "producto" && partes[1] && req.method === "GET") {
      await sesionDe(req, sql, ["admin", "trabajadora"]);
      return await ficha(sql, Number(partes[1]));
    }

    if (partes[0] === "producto" && partes[1] && partes[2] === "estado" && req.method === "POST") {
      const yo = await sesionDe(req, sql, ["admin", "trabajadora"]);
      return await cambiarProducto(req, sql, yo, Number(partes[1]));
    }

    if ((partes[0] === "color" || partes[0] === "talla") && partes[1]
        && partes[2] === "estado" && req.method === "POST") {
      const yo = await sesionDe(req, sql, ["admin", "trabajadora"]);
      return await cambiarVariante(req, sql, yo, partes[0], Number(partes[1]));
    }

    return json({ error: "Ruta no encontrada" }, 404);
  } catch (e) {
    return errorDe(e);
  }
};

async function listar(req: Request, sql: any, _yo: Sesion) {
  const p = new URL(req.url).searchParams;
  const q = (p.get("q") || "").trim().slice(0, 60);
  const cat = Number(p.get("cat"));
  const estado = p.get("estado") || "";
  const pagina = Math.max(1, Number(p.get("pagina")) || 1);

  // Un id exacto tiene prioridad: es la "Ref." que llega por WhatsApp.
  const porId = /^\d+$/.test(q) ? Number(q) : null;

  const filas = await sql`
    select p.id, p.nombre, p.precio, p.visible, p.agotado, p.archivado,
           c.nombre as categoria,
           (select i.hash from catalogo.imagen i
             where i.producto_id = p.id order by i.orden limit 1) as foto,
           (select count(*) from catalogo.color co where co.producto_id = p.id) as colores,
           (select count(*) from catalogo.color co
             where co.producto_id = p.id and co.agotado) as colores_agotados
      from catalogo.producto p
      left join catalogo.categoria c on c.subid = p.subid
     where not p.archivado
       and (${porId}::int is null or p.id = ${porId}::int)
       and (${q} = '' or ${porId}::int is not null
            or p.nombre ilike '%' || ${q} || '%')
       and (${cat || null}::int is null or p.subid = ${cat || null}::int)
       and (${estado} = '' or
            (${estado} = 'agotado'  and p.agotado) or
            (${estado} = 'oculto'   and not p.visible) or
            (${estado} = 'activo'   and p.visible and not p.agotado))
     order by p.id desc
     limit ${PAGINA} offset ${(pagina - 1) * PAGINA}`;

  const [{ total }] = await sql`
    select count(*)::int as total
      from catalogo.producto p
     where not p.archivado
       and (${porId}::int is null or p.id = ${porId}::int)
       and (${q} = '' or ${porId}::int is not null
            or p.nombre ilike '%' || ${q} || '%')
       and (${cat || null}::int is null or p.subid = ${cat || null}::int)
       and (${estado} = '' or
            (${estado} = 'agotado'  and p.agotado) or
            (${estado} = 'oculto'   and not p.visible) or
            (${estado} = 'activo'   and p.visible and not p.agotado))`;

  const categorias = await sql`
    select c.subid, c.nombre,
           (select count(*) from catalogo.producto p
             where p.subid = c.subid and not p.archivado)::int as cuantos
      from catalogo.categoria c order by c.nombre`;

  return json({ productos: filas, total, pagina, por_pagina: PAGINA, categorias });
}

async function ficha(sql: any, id: number) {
  if (!Number.isInteger(id)) throw new SinPermiso(400, "Id inválido");

  const [prod] = await sql`
    select p.id, p.slug, p.nombre, p.descripcion, p.precio, p.precio_antes, p.visible,
           p.agotado, p.archivado, p.subid, c.nombre as categoria,
           p.editado_en, p.editado_por
      from catalogo.producto p
      left join catalogo.categoria c on c.subid = p.subid
     where p.id = ${id}`;
  if (!prod) return json({ error: "Producto no encontrado" }, 404);

  const colores = await sql`
    select co.id, co.nombre, co.precio, co.agotado, co.orden
      from catalogo.color co where co.producto_id = ${id} order by co.orden`;

  const tallas = await sql`
    select t.id, t.color_id, t.nombre, t.agotado
      from catalogo.talla t
      join catalogo.color co on co.id = t.color_id
     where co.producto_id = ${id} order by t.color_id, t.orden`;

  const fotos = await sql`
    select i.hash, i.color_id, i.fuente, i.url
      from catalogo.imagen i where i.producto_id = ${id} order by i.orden`;

  return json({ ...prod, colores, tallas, fotos });
}

async function cambiarProducto(req: Request, sql: any, yo: Sesion, id: number) {
  if (!Number.isInteger(id)) throw new SinPermiso(400, "Id inválido");
  const cuerpo = await req.json().catch(() => ({})) as Record<string, unknown>;

  const [antes] = await sql`
    select id, nombre, visible, agotado from catalogo.producto where id = ${id}`;
  if (!antes) return json({ error: "Producto no encontrado" }, 404);

  const agotado = typeof cuerpo.agotado === "boolean" ? cuerpo.agotado : antes.agotado;
  const visible = typeof cuerpo.visible === "boolean" ? cuerpo.visible : antes.visible;

  const [despues] = await sql`
    update catalogo.producto
       set agotado = ${agotado}, visible = ${visible},
           editado_en = now(), editado_por = ${yo.email}
     where id = ${id}
    returning id, nombre, visible, agotado`;

  await anotar(sql, yo, "cambiar-estado", "producto", id,
               { visible: antes.visible, agotado: antes.agotado },
               { visible: despues.visible, agotado: despues.agotado });

  return json(despues);
}

async function cambiarVariante(req: Request, sql: any, yo: Sesion,
                               tipo: "color" | "talla", id: number) {
  if (!Number.isInteger(id)) throw new SinPermiso(400, "Id inválido");
  const cuerpo = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof cuerpo.agotado !== "boolean") throw new SinPermiso(400, "Falta 'agotado'");

  const filas = tipo === "color"
    ? await sql`update catalogo.color set agotado = ${cuerpo.agotado}
                 where id = ${id} returning id, nombre, agotado, producto_id`
    : await sql`update catalogo.talla set agotado = ${cuerpo.agotado}
                 where id = ${id} returning id, nombre, agotado, color_id`;

  if (!filas[0]) return json({ error: "No encontrado" }, 404);

  await anotar(sql, yo, "cambiar-estado", tipo, id, null, { agotado: cuerpo.agotado });
  return json(filas[0]);
}

export const config: Config = {
  path: "/api/panel/*",
};
