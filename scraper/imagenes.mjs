#!/usr/bin/env node
/**
 * EUCHEL — Tarea 3: descarga y conversión de imágenes.
 *
 *   node imagenes.mjs [--data data] [--pausa 500] [--solo-convertir]
 *
 * Lee data/productos_completo.json, deduplica las URLs de imagen, las descarga
 * a data/images/originales/ y genera WebP calidad 82 en dos anchos
 * (thumb 500, full 1400) en data/images/webp/{hash}-{tamano}.webp.
 * Nunca escala por encima del original. Reanudable: salta lo ya hecho.
 *
 * Mismo criterio de cortesía que el scraper: 1 descarga a la vez y pausa
 * después de cada respuesta. Es el servidor de producción del cliente.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const UA = "EuchelCatalogMigration/1.0 (extraccion autorizada por los duenos de la tienda)";
const TAMANOS = { thumb: 500, full: 1400 };
const CALIDAD = 82;
const TIMEOUT = 45_000;
const REINTENTOS = 3;

const args = process.argv.slice(2);
const opt = (n, def) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const RAIZ = path.resolve(opt("data", "data"));
const PAUSA = Number(opt("pausa", "500"));
const SOLO_CONVERTIR = args.includes("--solo-convertir");

const DIR_ORIG = path.join(RAIZ, "images", "originales");
const DIR_WEBP = path.join(RAIZ, "images", "webp");

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (url) => createHash("sha1").update(url).digest("hex").slice(0, 16);

async function existe(p) {
  try { await stat(p); return true; } catch { return false; }
}

/** Índice URL -> [{ producto, id_color }] a partir del JSON de productos. */
async function indexar() {
  const ruta = path.join(RAIZ, "productos_completo.json");
  if (!await existe(ruta)) {
    console.error(`No existe ${ruta}. Corre primero euchel_scrape.py.`);
    process.exit(1);
  }
  const productos = JSON.parse(await readFile(ruta, "utf8"));
  const mapa = new Map();
  const apunta = (url, ref) => {
    if (!url) return;
    if (!mapa.has(url)) mapa.set(url, []);
    mapa.get(url).push(ref);
  };
  for (const p of productos) {
    for (const u of p.imagenes_ficha ?? []) {
      apunta(u, { id_original: p.id_original, id_color: null, fuente: "ficha" });
    }
    for (const c of p.colores ?? []) {
      for (const u of c.imagenes ?? []) {
        apunta(u, { id_original: p.id_original, id_color: c.id_color, fuente: "color" });
      }
    }
    if (p.imagen_listado) {
      apunta(p.imagen_listado, { id_original: p.id_original, id_color: null, fuente: "listado" });
    }
  }
  return { productos, mapa };
}

async function descargar(url, destino) {
  let espera = 2000;
  for (let intento = 1; intento <= REINTENTOS; intento++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
      clearTimeout(t);
      await dormir(PAUSA);
      if (r.status === 403 || r.status === 429 || r.status >= 500) {
        throw Object.assign(new Error(`HTTP ${r.status}`), { detener: true });
      }
      if (!r.ok) return { ok: false, motivo: `HTTP ${r.status}` };
      const buf = Buffer.from(await r.arrayBuffer());
      await writeFile(destino, buf);
      return { ok: true, bytes: buf.length };
    } catch (e) {
      clearTimeout(t);
      if (e.detener) throw e;
      if (intento === REINTENTOS) return { ok: false, motivo: String(e.message || e) };
      await dormir(espera);
      espera *= 2;
    }
  }
}

async function convertir(origen, h) {
  const meta = await sharp(origen).metadata();
  const salidas = {};
  let bytes = 0;
  for (const [nombre, ancho] of Object.entries(TAMANOS)) {
    const destino = path.join(DIR_WEBP, `${h}-${nombre}.webp`);
    if (!await existe(destino)) {
      await sharp(origen)
        // withoutEnlargement: nunca por encima del tamaño original.
        .resize({ width: ancho, withoutEnlargement: true })
        .webp({ quality: CALIDAD })
        .toFile(destino);
    }
    bytes += (await stat(destino)).size;
    salidas[nombre] = path.relative(RAIZ, destino);
  }
  return { salidas, bytes, ancho_original: meta.width, alto_original: meta.height };
}

async function main() {
  await mkdir(DIR_ORIG, { recursive: true });
  await mkdir(DIR_WEBP, { recursive: true });

  const { mapa } = await indexar();
  const urls = [...mapa.keys()].sort();
  console.log(`${urls.length} URLs de imagen únicas`);

  const registro = {};
  const fallidas = [];
  let bytesOrig = 0, bytesWebp = 0, descargadas = 0, reusadas = 0, i = 0;

  for (const url of urls) {
    i++;
    const h = hash(url);
    const ext = (path.extname(new URL(url).pathname) || ".jpg").toLowerCase();
    const origen = path.join(DIR_ORIG, `${h}${ext}`);

    if (await existe(origen)) {
      reusadas++;
    } else if (SOLO_CONVERTIR) {
      fallidas.push({ url, motivo: "no descargada (--solo-convertir)" });
      continue;
    } else {
      const r = await descargar(url, origen);
      if (!r.ok) {
        fallidas.push({ url, motivo: r.motivo });
        console.log(`[${i}/${urls.length}] FALLO ${url} — ${r.motivo}`);
        continue;
      }
      descargadas++;
    }

    const tamOrig = (await stat(origen)).size;
    bytesOrig += tamOrig;

    try {
      const c = await convertir(origen, h);
      bytesWebp += c.bytes;
      registro[url] = {
        hash: h,
        original: path.relative(RAIZ, origen),
        bytes_original: tamOrig,
        ancho_original: c.ancho_original,
        alto_original: c.alto_original,
        webp: c.salidas,
        bytes_webp: c.bytes,
        usos: mapa.get(url),
      };
      if (i % 25 === 0 || i === urls.length) {
        console.log(`[${i}/${urls.length}] ok — descargadas ${descargadas}, ` +
                    `reusadas ${reusadas}, fallidas ${fallidas.length}`);
      }
    } catch (e) {
      fallidas.push({ url, motivo: `conversión: ${e.message}` });
      console.log(`[${i}/${urls.length}] FALLO conversión ${url} — ${e.message}`);
    }
  }

  const resumen = {
    generado: new Date().toISOString(),
    urls_unicas: urls.length,
    descargadas_en_esta_corrida: descargadas,
    ya_en_disco: reusadas,
    fallidas: fallidas.length,
    convertidas: Object.keys(registro).length,
    bytes_originales: bytesOrig,
    bytes_webp: bytesWebp,
    ahorro_pct: bytesOrig ? +(100 * (1 - bytesWebp / bytesOrig)).toFixed(1) : null,
    calidad_webp: CALIDAD,
    anchos: TAMANOS,
  };

  await writeFile(path.join(RAIZ, "imagenes_map.json"),
                  JSON.stringify(registro, null, 2), "utf8");
  await writeFile(path.join(RAIZ, "imagenes_resumen.json"),
                  JSON.stringify({ resumen, fallidas }, null, 2), "utf8");

  console.log("\n" + JSON.stringify(resumen, null, 2));
  if (fallidas.length) console.log(`${fallidas.length} fallidas -> imagenes_resumen.json`);
}

main().catch((e) => {
  if (e.detener) {
    console.error(`\n!!! DETENIDO: ${e.message}. El servidor respondió 403/429/5xx. ` +
                  `No se insiste. Relanzar para continuar desde donde quedó.`);
    process.exit(2);
  }
  console.error(e);
  process.exit(1);
});
