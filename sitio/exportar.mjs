#!/usr/bin/env node
/* Exporta el catálogo de Neon al JSON que lee el generador.
 *
 *   node sitio/exportar.mjs > sitio/data/catalogo.json
 *
 * Existe porque la base es la que manda. Antes el generador leía
 * `scraper/data/productos_completo.json`, la foto del día de la extracción:
 * un precio cambiado desde el panel se revertía en la siguiente
 * reconstrucción, y un producto creado en el panel no aparecía nunca.
 *
 * Sale ya normalizado, con la misma forma que el generador espera, para que
 * el generador siga sin saber nada de bases de datos.
 */

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("falta DATABASE_URL");
  process.exit(2);
}
const sql = neon(url);

function babosa(texto) {
  const limpio = (texto || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return limpio || "producto";
}

const num = (v) => (v === null || v === undefined ? null : Number(v));

const [productos, colores, tallas, imagenes] = await Promise.all([
  sql`select p.id, p.slug, p.nombre, p.descripcion, p.precio, p.precio_antes,
             p.marca, p.subid, p.visible, p.agotado,
             coalesce(c.nombre, 'Catálogo') as categoria
        from catalogo.producto p
        left join catalogo.categoria c on c.subid = p.subid
       where not p.archivado
       order by p.id desc`,
  sql`select id, producto_id, nombre, precio, agotado, orden
        from catalogo.color order by producto_id, orden, id`,
  sql`select t.id, t.color_id, t.nombre, t.agotado, t.orden
        from catalogo.talla t order by t.color_id, t.orden, t.id`,
  sql`select producto_id, color_id, hash, fuente, orden
        from catalogo.imagen order by producto_id, orden, id`,
]);

const porProducto = (filas) => {
  const m = new Map();
  for (const f of filas) {
    if (!m.has(f.producto_id)) m.set(f.producto_id, []);
    m.get(f.producto_id).push(f);
  }
  return m;
};

const coloresDe = porProducto(colores);
const imagenesDe = porProducto(imagenes);
const tallasDe = new Map();
for (const t of tallas) {
  if (!tallasDe.has(t.color_id)) tallasDe.set(t.color_id, []);
  tallasDe.get(t.color_id).push(t);
}

const limpios = [];
const usados = new Set();
let incompletosTotal = 0;

for (const p of productos) {
  const misColores = coloresDe.get(p.id) || [];
  const misImagenes = imagenesDe.get(p.id) || [];

  // Una imagen es su hash (extracción) o la clave del archivo subido. Se
  // distinguen por el punto de la extensión; el generador lo resuelve.
  const deColor = new Map();
  const galeria = [];
  for (const i of misImagenes) {
    if (i.color_id === null) galeria.push(i.hash);
    else {
      if (!deColor.has(i.color_id)) deColor.set(i.color_id, []);
      deColor.get(i.color_id).push(i.hash);
    }
  }

  const salida = [];
  const incompletos = [];
  for (const c of misColores) {
    const misTallas = (tallasDe.get(c.id) || []).map((t) => ({ nombre: t.nombre }));
    // Un color sin tallas y sin precio no se puede pedir: está a medio
    // configurar. No se publica, pero se cuenta para el aviso.
    if (!misTallas.length && c.precio === null) {
      incompletos.push(c.nombre || "?");
      continue;
    }
    const imgs = deColor.get(c.id) || [];
    salida.push({
      id: c.id,
      nombre: c.nombre || "Único",
      precio: num(c.precio),
      tallas: misTallas,
      imagenes: imgs,
    });
    imgs.forEach((h) => usados.add(h));
  }
  incompletosTotal += incompletos.length;

  let vitrina = galeria;
  if (!vitrina.length && salida.length) vitrina = salida[0].imagenes.slice();
  vitrina.forEach((h) => usados.add(h));

  limpios.push({
    id: p.id,
    slug: p.slug || `${p.id}-${babosa(p.nombre)}`,
    nombre: p.nombre,
    descripcion: (p.descripcion || "").trim(),
    categoria: p.categoria,
    subid: p.subid,
    precio: num(p.precio),
    antes: num(p.precio_antes),
    marca: p.marca,
    galeria: vitrina,
    colores: salida,
    colores_incompletos: incompletos,
    // El generador decide si publica los ocultos; la base es la que sabe.
    visible: p.visible,
  });
}

process.stderr.write(
  `exportados ${limpios.length} productos · ${usados.size} imágenes` +
  (incompletosTotal ? ` · ${incompletosTotal} colores a medio configurar` : "") + "\n");

process.stdout.write(JSON.stringify({
  generado: new Date().toISOString(),
  productos: limpios,
  usados: [...usados],
}));
