/* Lectura del catálogo para las páginas públicas.
 *
 * Devuelve productos ya normalizados: colores con sus tallas y sus fotos,
 * galería, precio. La misma forma que producía el generador estático, para
 * que las plantillas no tengan que saber cómo está guardado nada.
 *
 * Reglas que vienen de antes y siguen:
 *
 * - Solo `visible` y no `archivado`. Los 210 desactivados en la tienda
 *   original entraron ocultos; el equipo los activa desde el panel.
 * - Un color sin tallas y sin precio no se puede pedir: está a medio
 *   configurar. No se publica.
 * - Orden: lo más nuevo primero. Los de la extracción comparten la fecha de
 *   la carga inicial, así que entre ellos manda el id de la tienda; los que
 *   sube el equipo llevan su fecha real y salen delante.
 */

export type Talla = { nombre: string; agotado: boolean };
export type Color = {
  id: number;
  nombre: string;
  precio: number | null;
  agotado: boolean;
  tallas: Talla[];
  imagenes: string[];
};
export type Producto = {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  categoriaSlug: string | null;
  subid: number | null;
  precio: number | null;
  antes: number | null;
  marca: string | null;
  agotado: boolean;
  destacado: boolean;
  galeria: string[];
  colores: Color[];
};
export type Categoria = { nombre: string; slug: string; subid: number; cuantos: number };

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

/** Categorías con productos publicados, las más grandes primero. */
export async function categorias(sql: any): Promise<Categoria[]> {
  const filas = await sql`
    select c.nombre, c.slug, c.subid, count(p.id)::int as cuantos
      from catalogo.categoria c
      join catalogo.producto p on p.subid = c.subid
     where p.visible and not p.archivado
     group by c.nombre, c.slug, c.subid
     order by cuantos desc, c.nombre`;
  return filas as Categoria[];
}

/* Las tres consultas de detalle van juntas y filtradas por el mismo
 * conjunto de productos: en la portada son 750 productos, y hacer una
 * consulta por producto sería la diferencia entre 4 viajes y 2.000. */
async function armar(sql: any, base: any[]): Promise<Producto[]> {
  if (!base.length) return [];
  const ids = base.map((p) => p.id);

  const [colores, tallas, imagenes] = await Promise.all([
    sql`select id, producto_id, nombre, precio, agotado
          from catalogo.color
         where producto_id = any(${ids}::int[])
         order by producto_id, orden, id`,
    sql`select t.id, t.color_id, t.nombre, t.agotado
          from catalogo.talla t
          join catalogo.color co on co.id = t.color_id
         where co.producto_id = any(${ids}::int[])
         order by t.color_id, t.orden, t.id`,
    sql`select producto_id, color_id, hash
          from catalogo.imagen
         where producto_id = any(${ids}::int[])
         order by producto_id, orden, id`,
  ]);

  const tallasDe = new Map<number, Talla[]>();
  for (const t of tallas) {
    if (!tallasDe.has(t.color_id)) tallasDe.set(t.color_id, []);
    tallasDe.get(t.color_id)!.push({ nombre: t.nombre, agotado: t.agotado });
  }

  const coloresDe = new Map<number, any[]>();
  for (const c of colores) {
    if (!coloresDe.has(c.producto_id)) coloresDe.set(c.producto_id, []);
    coloresDe.get(c.producto_id)!.push(c);
  }

  const galeriaDe = new Map<number, string[]>();
  const fotosColor = new Map<number, string[]>();
  for (const i of imagenes) {
    if (i.color_id === null) {
      if (!galeriaDe.has(i.producto_id)) galeriaDe.set(i.producto_id, []);
      galeriaDe.get(i.producto_id)!.push(i.hash);
    } else {
      if (!fotosColor.has(i.color_id)) fotosColor.set(i.color_id, []);
      fotosColor.get(i.color_id)!.push(i.hash);
    }
  }

  return base.map((p) => {
    const cols: Color[] = [];
    for (const c of coloresDe.get(p.id) || []) {
      const ts = tallasDe.get(c.id) || [];
      if (!ts.length && c.precio === null) continue;   // a medio configurar
      cols.push({
        id: c.id,
        nombre: c.nombre || "Único",
        precio: num(c.precio),
        agotado: c.agotado,
        tallas: ts,
        imagenes: fotosColor.get(c.id) || [],
      });
    }
    let galeria = galeriaDe.get(p.id) || [];
    if (!galeria.length && cols.length) galeria = cols[0].imagenes.slice();

    return {
      id: p.id,
      slug: p.slug,
      nombre: p.nombre,
      descripcion: (p.descripcion || "").trim(),
      categoria: p.categoria || "Catálogo",
      categoriaSlug: p.categoria_slug || null,
      subid: p.subid,
      precio: num(p.precio),
      antes: num(p.precio_antes),
      marca: p.marca,
      agotado: p.agotado,
      destacado: !!p.destacado,
      galeria,
      colores: cols,
    };
  });
}

const CAMPOS = `
    select p.id, p.slug, p.nombre, p.descripcion, p.subid, p.precio,
           p.precio_antes, p.marca, p.agotado, p.destacado,
           c.nombre as categoria, c.slug as categoria_slug
      from catalogo.producto p
      left join catalogo.categoria c on c.subid = p.subid
     where p.visible and not p.archivado`;

/* Cómo se ordena el catálogo.
 *
 * Lo destacado va primero siempre: es la palanca del día a día, la que usa
 * quien quiere empujar una prenda esta semana. Debajo, el criterio que esté
 * elegido en el panel, y por defecto lo más nuevo, que es lo que el equipo
 * acaba de subir y quiere enseñar.
 *
 * Los criterios van en un CASE y no pegados al texto de la consulta: así el
 * valor entra como parámetro y no hay forma de colar SQL desde el panel. */
export const ORDENES = ["novedad", "precio_asc", "precio_desc", "pedidos"] as const;
export type Orden = typeof ORDENES[number];

export const ORDEN_POR_DEFECTO: Orden = "novedad";

const ORDENAR = `
     order by p.destacado desc,
       case when $ORD = 'precio_asc'  then p.precio end asc nulls last,
       case when $ORD = 'precio_desc' then p.precio end desc nulls last,
       case when $ORD = 'pedidos' then
         (select count(*) from negocio.intencion i where i.producto_id = p.id)
       end desc nulls last,
       p.creado_en desc, p.id desc`;

export async function productos(sql: any, subid?: number,
                                orden: Orden = ORDEN_POR_DEFECTO): Promise<Producto[]> {
  const limpio: Orden = ORDENES.includes(orden as Orden) ? orden : ORDEN_POR_DEFECTO;
  const base = subid === undefined
    ? await sql.query(`${CAMPOS} ${ORDENAR.replace(/\$ORD/g, "$1")}`, [limpio])
    : await sql.query(`${CAMPOS} and p.subid = $2 ${ORDENAR.replace(/\$ORD/g, "$1")}`,
                      [limpio, subid]);
  return armar(sql, base);
}

/** Un ajuste del catálogo, con su valor por defecto si no está o falla. */
export async function ajuste(sql: any, clave: string, porDefecto: string): Promise<string> {
  try {
    const filas = await sql`select valor from catalogo.ajuste where clave = ${clave}`;
    return filas[0]?.valor || porDefecto;
  } catch {
    return porDefecto;
  }
}

/** Uno por slug. Acepta también el id solo ("/p/1364"), que es lo que
 *  alguien escribe a mano leyendo la Ref. de un pedido. */
export async function producto(sql: any, slug: string): Promise<Producto | null> {
  const id = /^\d+$/.test(slug) ? Number(slug) : Number(slug.split("-")[0]);
  const base = Number.isInteger(id)
    ? await sql.query(`${CAMPOS} and (p.slug = $1 or p.id = $2)`, [slug, id])
    : await sql.query(`${CAMPOS} and p.slug = $1`, [slug]);
  const [p] = await armar(sql, base.slice(0, 1));
  return p || null;
}
