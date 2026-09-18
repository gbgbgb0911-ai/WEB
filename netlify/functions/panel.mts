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
 *   GET  /api/panel/tablero?dias=30       (admin)
 *   POST /api/panel/producto/:id/precio   { precio, precio_antes }  (admin)
 *   POST /api/panel/producto/:id/archivar { archivado }             (admin)
 *   GET  /api/panel/bitacora?pagina=      (admin)
 *
 * Las trabajadoras pueden agotar y ocultar. Archivar y editar precios es de
 * admin. Nada se borra nunca.
 *
 * Las cuentas del equipo no se administran aquí: el navegador habla directo
 * con /auth/admin/* (crear, cambiar rol, suspender), que Neon ya limita a
 * quien tiene rol 'admin'. Duplicarlo en una función sería una segunda
 * puerta que vigilar.
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

    if (partes[0] === "producto" && partes[1] && partes[2] === "precio" && req.method === "POST") {
      const yo = await sesionDe(req, sql, ["admin"]);
      return await cambiarPrecio(req, sql, yo, Number(partes[1]));
    }

    if (partes[0] === "producto" && partes[1] && partes[2] === "archivar" && req.method === "POST") {
      const yo = await sesionDe(req, sql, ["admin"]);
      return await archivar(req, sql, yo, Number(partes[1]));
    }

    if (partes[0] === "tablero" && req.method === "GET") {
      await sesionDe(req, sql, ["admin"]);
      return await tablero(req, sql);
    }

    if (partes[0] === "bitacora" && req.method === "GET") {
      await sesionDe(req, sql, ["admin"]);
      return await bitacora(req, sql);
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

/* --------------------------------------------------------------- solo admin */

async function cambiarPrecio(req: Request, sql: any, yo: Sesion, id: number) {
  if (!Number.isInteger(id)) throw new SinPermiso(400, "Id inválido");
  const cuerpo = await req.json().catch(() => ({})) as Record<string, unknown>;

  const precio = numeroONulo(cuerpo.precio);
  const antes_de = numeroONulo(cuerpo.precio_antes);
  if (precio === undefined) throw new SinPermiso(400, "Precio inválido");
  if (antes_de === undefined) throw new SinPermiso(400, "Precio anterior inválido");

  const [previo] = await sql`
    select id, precio, precio_antes from catalogo.producto where id = ${id}`;
  if (!previo) return json({ error: "Producto no encontrado" }, 404);

  const [ahora] = await sql`
    update catalogo.producto
       set precio = ${precio}, precio_antes = ${antes_de},
           editado_en = now(), editado_por = ${yo.email}
     where id = ${id}
    returning id, precio, precio_antes`;

  await anotar(sql, yo, "cambiar-precio", "producto", id,
               { precio: previo.precio, precio_antes: previo.precio_antes },
               { precio: ahora.precio, precio_antes: ahora.precio_antes });
  return json(ahora);
}

/** null explícito pasa; basura devuelve undefined para distinguirla del null. */
function numeroONulo(v: unknown): number | null | undefined {
  if (v === null || v === "" || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100000) return undefined;
  return Math.round(n * 100) / 100;
}

async function archivar(req: Request, sql: any, yo: Sesion, id: number) {
  if (!Number.isInteger(id)) throw new SinPermiso(400, "Id inválido");
  const cuerpo = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof cuerpo.archivado !== "boolean") throw new SinPermiso(400, "Falta 'archivado'");

  // Archivar no borra: saca el producto del panel y del catálogo, y se puede
  // deshacer. Los pedidos viejos que lo mencionan siguen teniendo a qué
  // apuntar.
  const filas = await sql`
    update catalogo.producto
       set archivado = ${cuerpo.archivado},
           visible = case when ${cuerpo.archivado} then false else visible end,
           editado_en = now(), editado_por = ${yo.email}
     where id = ${id}
    returning id, nombre, archivado, visible`;
  if (!filas[0]) return json({ error: "Producto no encontrado" }, 404);

  await anotar(sql, yo, cuerpo.archivado ? "archivar" : "desarchivar",
               "producto", id, null, { archivado: cuerpo.archivado });
  return json(filas[0]);
}

async function tablero(req: Request, sql: any) {
  const pedidos = Number(new URL(req.url).searchParams.get("dias"));
  const dias = [7, 30, 90, 365].includes(pedidos) ? pedidos : 30;
  const desde = `${dias} days`;

  const [resumen, porDia, masPedidos, porCategoria, porColor, porTalla, catalogo] =
    await Promise.all([
      sql`select count(*)::int as clics,
                 count(distinct producto_id)::int as productos,
                 coalesce(sum(precio), 0)::float as valor
            from negocio.intencion
           where creado_en > now() - ${desde}::interval`,

      sql`select to_char(date_trunc('day', creado_en), 'YYYY-MM-DD') as dia,
                 count(*)::int as clics
            from negocio.intencion
           where creado_en > now() - ${desde}::interval
        group by 1 order by 1`,

      sql`select i.producto_id as id, p.nombre, p.precio, p.visible, p.agotado,
                 count(*)::int as clics,
                 (select im.hash from catalogo.imagen im
                   where im.producto_id = p.id order by im.orden limit 1) as foto
            from negocio.intencion i
            join catalogo.producto p on p.id = i.producto_id
           where i.creado_en > now() - ${desde}::interval
        group by i.producto_id, p.nombre, p.precio, p.visible, p.agotado, p.id
        order by clics desc, i.producto_id limit 20`,

      sql`select coalesce(c.nombre, 'Sin categoría') as categoria,
                 count(*)::int as clics
            from negocio.intencion i
            join catalogo.producto p on p.id = i.producto_id
       left join catalogo.categoria c on c.subid = p.subid
           where i.creado_en > now() - ${desde}::interval
        group by 1 order by clics desc limit 12`,

      sql`select coalesce(co.nombre, 'Sin color') as color, count(*)::int as clics
            from negocio.intencion i
       left join catalogo.color co on co.id = i.color_id
           where i.creado_en > now() - ${desde}::interval
        group by 1 order by clics desc limit 12`,

      sql`select coalesce(nullif(i.talla, ''), 'Sin talla') as talla, count(*)::int as clics
            from negocio.intencion i
           where i.creado_en > now() - ${desde}::interval
        group by 1 order by clics desc limit 12`,

      sql`select count(*)::int as total,
                 count(*) filter (where visible and not agotado and not archivado)::int as activos,
                 count(*) filter (where agotado and not archivado)::int as agotados,
                 count(*) filter (where not visible and not archivado)::int as ocultos,
                 count(*) filter (where archivado)::int as archivados
            from catalogo.producto`,
    ]);

  return json({
    dias,
    clics: resumen[0].clics,
    productos_pedidos: resumen[0].productos,
    valor: resumen[0].valor,
    por_dia: porDia,
    mas_pedidos: masPedidos,
    por_categoria: porCategoria,
    por_color: porColor,
    por_talla: porTalla,
    catalogo: catalogo[0],
  });
}

async function bitacora(req: Request, sql: any) {
  const pagina = Math.max(1, Number(new URL(req.url).searchParams.get("pagina")) || 1);
  // El nombre se resuelve para los tres tipos de fila. Con solo el de
  // producto, un cambio de talla se leía "talla 1 disponible", que no le dice
  // nada a nadie.
  const filas = await sql`
    select b.id, b.actor, b.accion, b.entidad, b.entidad_id, b.antes, b.despues,
           b.creado_en,
           case b.entidad
             when 'producto' then (select p.nombre from catalogo.producto p
                                    where p.id = b.entidad_id::int)
             when 'color' then (select p.nombre || ' · ' || co.nombre
                                  from catalogo.color co
                                  join catalogo.producto p on p.id = co.producto_id
                                 where co.id = b.entidad_id::int)
             when 'talla' then (select p.nombre || ' · ' || co.nombre || ' · talla ' || ta.nombre
                                  from catalogo.talla ta
                                  join catalogo.color co on co.id = ta.color_id
                                  join catalogo.producto p on p.id = co.producto_id
                                 where ta.id = b.entidad_id::int)
           end as nombre
      from negocio.bitacora b
     order by b.id desc
     limit 40 offset ${(pagina - 1) * 40}`;
  return json({ movimientos: filas, pagina });
}

export const config: Config = {
  path: "/api/panel/*",
};
