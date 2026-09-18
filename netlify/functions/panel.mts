import type { Config, Context } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";
import { almacen, clavePara, TIPOS, TOPE } from "./_lib/fotos.mts";
import { invalidar } from "./_lib/cache.mts";
import { sesionDe, anotar, json, errorDe, SinPermiso, type Sesion } from "./_lib/sesion.mts";

/* API del panel. Una sola función con ruteo interno, para que el despliegue
 * sea una pieza y no diez.
 *
 *   GET  /api/panel/yo
 *   GET  /api/panel/productos?q=&cat=&estado=&pagina=
 *        estado: activo | agotado | oculto | archivado (este último solo
 *        muestra archivados; los demás los excluyen: archivar los saca del
 *        panel, y este filtro es la única puerta para recuperarlos)
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
 *   POST   /api/panel/producto                    crear
 *   POST   /api/panel/producto/:id/datos          nombre, descripcion, categoria
 *   DELETE /api/panel/producto/:id                (admin, y solo los del panel)
 *   POST   /api/panel/producto/:id/color          { nombre, precio }
 *   DELETE /api/panel/color/:id
 *   POST   /api/panel/color/:id/talla             { nombre }
 *   DELETE /api/panel/talla/:id
 *   POST   /api/panel/producto/:id/foto?color=    cuerpo: los bytes de la imagen
 *   DELETE /api/panel/foto/:id
 *
 * Las trabajadoras pueden agotar y ocultar. Archivar y editar precios es de
 * admin. Nada se borra nunca.
 *
 * Cualquier escritura que salga bien purga la caché del catálogo público
 * (ver _lib/cache.mts): el cambio se ve en la siguiente visita, sin
 * reconstruir ni desplegar nada. Va en un solo sitio, en el enrutador, para
 * que ningún manejador nuevo pueda olvidarlo.
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

  const respuesta = await despachar(req, sql, ruta, partes);
  if (req.method !== "GET" && respuesta.ok) await invalidar(`${req.method} ${ruta}`);
  return respuesta;
};

async function despachar(req: Request, sql: any, ruta: string, partes: string[]): Promise<Response> {
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

    if (partes[0] === "producto" && !partes[1] && req.method === "POST") {
      const yo = await sesionDe(req, sql, ["admin", "trabajadora"]);
      return await crear(req, sql, yo);
    }

    if (partes[0] === "producto" && partes[1] && partes[2] === "datos" && req.method === "POST") {
      const yo = await sesionDe(req, sql, ["admin", "trabajadora"]);
      return await guardarDatos(req, sql, yo, Number(partes[1]));
    }

    if (partes[0] === "producto" && partes[1] && !partes[2] && req.method === "DELETE") {
      const yo = await sesionDe(req, sql, ["admin"]);
      return await borrar(sql, yo, Number(partes[1]));
    }

    if (partes[0] === "producto" && partes[1] && partes[2] === "color" && req.method === "POST") {
      const yo = await sesionDe(req, sql, ["admin", "trabajadora"]);
      return await agregarColor(req, sql, yo, Number(partes[1]));
    }

    if (partes[0] === "color" && partes[1] && partes[2] === "talla" && req.method === "POST") {
      const yo = await sesionDe(req, sql, ["admin", "trabajadora"]);
      return await agregarTalla(req, sql, yo, Number(partes[1]));
    }

    if ((partes[0] === "color" || partes[0] === "talla") && partes[1]
        && !partes[2] && req.method === "DELETE") {
      const yo = await sesionDe(req, sql, ["admin", "trabajadora"]);
      return await borrarVariante(sql, yo, partes[0], Number(partes[1]));
    }

    if (partes[0] === "producto" && partes[1] && partes[2] === "foto" && req.method === "POST") {
      const yo = await sesionDe(req, sql, ["admin", "trabajadora"]);
      return await subirFoto(req, sql, yo, Number(partes[1]));
    }

    if (partes[0] === "foto" && partes[1] && req.method === "DELETE") {
      const yo = await sesionDe(req, sql, ["admin", "trabajadora"]);
      return await borrarFoto(sql, yo, Number(partes[1]));
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
}

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
     where (case when ${estado} = 'archivado' then p.archivado else not p.archivado end)
       and (${porId}::int is null or p.id = ${porId}::int)
       and (${q} = '' or ${porId}::int is not null
            or p.nombre ilike '%' || ${q} || '%')
       and (${cat || null}::int is null or p.subid = ${cat || null}::int)
       and (${estado} = '' or ${estado} = 'archivado' or
            (${estado} = 'agotado'  and p.agotado) or
            (${estado} = 'oculto'   and not p.visible) or
            (${estado} = 'activo'   and p.visible and not p.agotado))
     order by p.id desc
     limit ${PAGINA} offset ${(pagina - 1) * PAGINA}`;

  const [{ total }] = await sql`
    select count(*)::int as total
      from catalogo.producto p
     where (case when ${estado} = 'archivado' then p.archivado else not p.archivado end)
       and (${porId}::int is null or p.id = ${porId}::int)
       and (${q} = '' or ${porId}::int is not null
            or p.nombre ilike '%' || ${q} || '%')
       and (${cat || null}::int is null or p.subid = ${cat || null}::int)
       and (${estado} = '' or ${estado} = 'archivado' or
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
               { visible: despues.visible, agotado: despues.agotado, nombre: despues.nombre });

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
               "producto", id, null, { archivado: cuerpo.archivado, nombre: filas[0].nombre });
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
           end as nombre_vivo,
           -- Si el producto ya no existe (se borró uno del panel), el nombre
           -- que quedó guardado en el propio movimiento es lo único que hay.
           coalesce(b.despues->>'nombre', b.antes->>'nombre') as nombre_guardado
      from negocio.bitacora b
     order by b.id desc
     limit 40 offset ${(pagina - 1) * 40}`;
  for (const f of filas) {
    f.nombre = f.nombre_vivo || f.nombre_guardado || null;
    delete f.nombre_vivo; delete f.nombre_guardado;
  }
  return json({ movimientos: filas, pagina });
}

/* ------------------------------------------------- crear y editar productos */

/** Slug al estilo del catálogo: id + nombre sin acentos. */
function babosa(texto: string) {
  const limpio = (texto || "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return limpio || "producto";
}

function textoDe(v: unknown, tope: number) {
  return typeof v === "string" ? v.trim().slice(0, tope) : "";
}

async function crear(req: Request, sql: any, yo: Sesion) {
  const cuerpo = await req.json().catch(() => ({})) as Record<string, unknown>;
  const nombre = textoDe(cuerpo.nombre, 160);
  if (nombre.length < 3) throw new SinPermiso(400, "Ponle un nombre de al menos 3 letras.");

  const precio = numeroONulo(cuerpo.precio);
  if (precio === undefined) throw new SinPermiso(400, "Precio inválido");

  const subid = cuerpo.subid === null || cuerpo.subid === "" || cuerpo.subid === undefined
    ? null : Number(cuerpo.subid);
  if (subid !== null && !Number.isInteger(subid)) throw new SinPermiso(400, "Categoría inválida");

  // Nace oculto. Un producto a medio subir (sin foto, sin tallas) no tiene
  // por qué aparecer en el catálogo mientras lo terminan.
  const [p] = await sql`
    insert into catalogo.producto (slug, nombre, descripcion, subid, precio, visible, editado_por)
    values ('pendiente', ${nombre}, ${textoDe(cuerpo.descripcion, 4000)},
            ${subid}, ${precio}, false, ${yo.email})
    returning id`;

  const [conSlug] = await sql`
    update catalogo.producto set slug = ${`${p.id}-${babosa(nombre)}`}
     where id = ${p.id} returning id, slug, nombre`;

  await anotar(sql, yo, "crear", "producto", p.id, null, { nombre });
  return json(conSlug, 201);
}

async function guardarDatos(req: Request, sql: any, yo: Sesion, id: number) {
  if (!Number.isInteger(id)) throw new SinPermiso(400, "Id inválido");
  const cuerpo = await req.json().catch(() => ({})) as Record<string, unknown>;

  const [antes] = await sql`
    select id, nombre, descripcion, subid, visible from catalogo.producto where id = ${id}`;
  if (!antes) return json({ error: "Producto no encontrado" }, 404);

  const nombre = textoDe(cuerpo.nombre, 160) || antes.nombre;
  if (nombre.length < 3) throw new SinPermiso(400, "Ponle un nombre de al menos 3 letras.");

  const descripcion = typeof cuerpo.descripcion === "string"
    ? textoDe(cuerpo.descripcion, 4000) : antes.descripcion;
  const subid = cuerpo.subid === undefined ? antes.subid
    : (cuerpo.subid === null || cuerpo.subid === "" ? null : Number(cuerpo.subid));
  if (subid !== null && !Number.isInteger(subid)) throw new SinPermiso(400, "Categoría inválida");

  // El slug solo se recalcula mientras el producto nunca se haya publicado.
  // Después, cambiarlo rompería el enlace que ya salió por WhatsApp.
  const nuncaPublicado = antes.id >= 100001 && !antes.visible;
  const slug = nuncaPublicado ? `${id}-${babosa(nombre)}` : null;

  const [despues] = await sql`
    update catalogo.producto
       set nombre = ${nombre}, descripcion = ${descripcion}, subid = ${subid},
           slug = coalesce(${slug}, slug),
           editado_en = now(), editado_por = ${yo.email}
     where id = ${id}
    returning id, slug, nombre, descripcion, subid`;

  await anotar(sql, yo, "editar-datos", "producto", id,
               { nombre: antes.nombre }, { nombre: despues.nombre });
  return json(despues);
}

async function borrar(sql: any, yo: Sesion, id: number) {
  if (!Number.isInteger(id)) throw new SinPermiso(400, "Id inválido");

  const [p] = await sql`select id, nombre from catalogo.producto where id = ${id}`;
  if (!p) return json({ error: "Producto no encontrado" }, 404);

  if (id < 100001) {
    // La base también lo impide con un disparador; esto es para dar un
    // mensaje que se entienda en vez de un error de Postgres.
    throw new SinPermiso(409,
      "Este producto vino de la tienda. Archívalo: sale del catálogo y del panel, " +
      "y se puede recuperar. Borrarlo dejaría sin referencia los pedidos que lo mencionan.");
  }

  // Las fotos que solo usaba este producto se van con él.
  const fotos = await sql`
    select i.hash from catalogo.imagen i
     where i.producto_id = ${id} and i.fuente = 'subida'
       and not exists (select 1 from catalogo.imagen o
                        where o.hash = i.hash and o.producto_id <> ${id})`;

  await sql`delete from catalogo.producto where id = ${id}`;

  const tienda = almacen();
  for (const f of fotos) {
    try { await tienda.delete(f.hash); }
    catch (e) { console.error("foto huérfana:", f.hash, e instanceof Error ? e.message : e); }
  }

  await anotar(sql, yo, "borrar", "producto", id, { nombre: p.nombre }, null);
  return json({ borrado: id, fotos: fotos.length });
}

/* -------------------------------------------------------- colores y tallas */

async function agregarColor(req: Request, sql: any, yo: Sesion, productoId: number) {
  if (!Number.isInteger(productoId)) throw new SinPermiso(400, "Id inválido");
  const cuerpo = await req.json().catch(() => ({})) as Record<string, unknown>;
  const nombre = textoDe(cuerpo.nombre, 80) || "Único";
  const precio = numeroONulo(cuerpo.precio);
  if (precio === undefined) throw new SinPermiso(400, "Precio inválido");

  const [existe] = await sql`select id from catalogo.producto where id = ${productoId}`;
  if (!existe) return json({ error: "Producto no encontrado" }, 404);

  const [c] = await sql`
    insert into catalogo.color (producto_id, nombre, precio, orden)
    values (${productoId}, ${nombre}, ${precio},
            coalesce((select max(orden) + 1 from catalogo.color where producto_id = ${productoId}), 0))
    returning id, nombre, precio, agotado, orden`;

  await anotar(sql, yo, "agregar", "color", c.id, null, { producto: productoId, nombre });
  return json(c, 201);
}

async function agregarTalla(req: Request, sql: any, yo: Sesion, colorId: number) {
  if (!Number.isInteger(colorId)) throw new SinPermiso(400, "Id inválido");
  const cuerpo = await req.json().catch(() => ({})) as Record<string, unknown>;
  const nombre = textoDe(cuerpo.nombre, 24);
  if (!nombre) throw new SinPermiso(400, "Ponle nombre a la talla.");

  const [color] = await sql`select id, producto_id from catalogo.color where id = ${colorId}`;
  if (!color) return json({ error: "Color no encontrado" }, 404);

  const [ya] = await sql`
    select id from catalogo.talla where color_id = ${colorId} and nombre = ${nombre}`;
  if (ya) throw new SinPermiso(409, `Este color ya tiene la talla ${nombre}.`);

  const [tl] = await sql`
    insert into catalogo.talla (color_id, nombre, orden)
    values (${colorId}, ${nombre},
            coalesce((select max(orden) + 1 from catalogo.talla where color_id = ${colorId}), 0))
    returning id, color_id, nombre, agotado, orden`;

  await anotar(sql, yo, "agregar", "talla", tl.id, null, { color: colorId, nombre });
  return json(tl, 201);
}

async function borrarVariante(sql: any, yo: Sesion, tipo: "color" | "talla", id: number) {
  if (!Number.isInteger(id)) throw new SinPermiso(400, "Id inválido");

  const filas = tipo === "color"
    ? await sql`delete from catalogo.color where id = ${id} returning id, nombre, producto_id`
    : await sql`delete from catalogo.talla where id = ${id} returning id, nombre, color_id`;
  if (!filas[0]) return json({ error: "No encontrado" }, 404);

  await anotar(sql, yo, "borrar", tipo, id, { nombre: filas[0].nombre }, null);
  return json({ borrado: id });
}

/* ------------------------------------------------------------------ fotos */

async function subirFoto(req: Request, sql: any, yo: Sesion, productoId: number) {
  if (!Number.isInteger(productoId)) throw new SinPermiso(400, "Id inválido");

  const tipo = (req.headers.get("content-type") || "").split(";")[0].trim();
  const extension = TIPOS[tipo];
  if (!extension) throw new SinPermiso(415, "Solo JPG, PNG o WebP.");

  const bytes = await req.arrayBuffer();
  if (!bytes.byteLength) throw new SinPermiso(400, "Llegó vacía.");
  if (bytes.byteLength > TOPE) {
    throw new SinPermiso(413, "La foto pesa demasiado. El panel la encoge antes de subirla; " +
                              "si llegó así, vuelve a intentarlo.");
  }

  const [producto] = await sql`select id from catalogo.producto where id = ${productoId}`;
  if (!producto) return json({ error: "Producto no encontrado" }, 404);

  const pedido = new URL(req.url).searchParams.get("color");
  let colorId: number | null = null;
  if (pedido) {
    colorId = Number(pedido);
    if (!Number.isInteger(colorId)) throw new SinPermiso(400, "Color inválido");
    const [c] = await sql`
      select id from catalogo.color where id = ${colorId} and producto_id = ${productoId}`;
    if (!c) throw new SinPermiso(400, "Ese color no es de este producto.");
  }

  const clave = await clavePara(bytes, extension);
  try {
    // La clave es el hash del contenido: subir dos veces la misma foto
    // sobreescribe lo mismo y no ocupa el doble.
    await almacen().set(clave, bytes, { metadata: { tipo, subio: yo.email } });
  } catch (e) {
    console.error("blobs:", e instanceof Error ? e.message : e);
    return json({ error: "No se pudo guardar la foto. Inténtalo otra vez." }, 502);
  }

  const [img] = await sql`
    insert into catalogo.imagen (producto_id, color_id, hash, fuente, orden)
    values (${productoId}, ${colorId}, ${clave}, 'subida',
            coalesce((select max(orden) + 1 from catalogo.imagen where producto_id = ${productoId}), 0))
    returning id, hash, color_id, fuente, orden`;

  await anotar(sql, yo, "subir-foto", "producto", productoId, null, { foto: clave });
  return json({ ...img, ruta: `/img/subidas/${clave}` }, 201);
}

async function borrarFoto(sql: any, yo: Sesion, id: number) {
  if (!Number.isInteger(id)) throw new SinPermiso(400, "Id inválido");

  const [img] = await sql`
    select id, hash, fuente, producto_id from catalogo.imagen where id = ${id}`;
  if (!img) return json({ error: "Foto no encontrada" }, 404);

  await sql`delete from catalogo.imagen where id = ${id}`;

  // Solo se borra del almacén si ningún otro producto la estaba usando.
  if (img.fuente === "subida") {
    const [otra] = await sql`select id from catalogo.imagen where hash = ${img.hash} limit 1`;
    if (!otra) {
      try { await almacen().delete(img.hash); }
      catch (e) { console.error("blobs borrar:", e instanceof Error ? e.message : e); }
    }
  }

  await anotar(sql, yo, "borrar-foto", "producto", img.producto_id, { foto: img.hash }, null);
  return json({ borrado: id });
}

export const config: Config = {
  path: "/api/panel/*",
};
