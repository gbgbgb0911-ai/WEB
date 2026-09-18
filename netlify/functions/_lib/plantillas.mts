/* Plantillas del catálogo público.
 *
 * Es el mismo HTML que generaba sitio/generar.py, pasado a TypeScript para
 * que las páginas se armen al momento desde la base. Ahora hay una sola
 * forma de armar una página, y es esta: el generador de Python ya no escribe
 * HTML, solo copia los archivos estáticos.
 *
 * Todo lo que entra de la base pasa por e(): un nombre de producto con un
 * "<" no tiene por qué romper la página.
 */

import type { Producto, Categoria } from "./catalogo.mts";

/* Versión de los estáticos. Va en la URL de estilos.css y app.js para que
 * cada despliegue tenga una URL nueva y ningún navegador se quede con la
 * anterior. Sin esto pasó: el service worker guardaba el CSS con "caché
 * primero", nunca volvía a pedirlo, y el efecto de las redes sociales
 * existía en producción pero nadie que ya hubiera visitado el sitio lo
 * veía. La versión es el id del despliegue, que Netlify pone en el entorno
 * de la función; en local cae a "dev". */
export const VERSION_ESTATICOS = (Netlify.env.get("DEPLOY_ID") || "dev").slice(0, 12);
export const CSS = `/estilos.css?v=${VERSION_ESTATICOS}`;
export const JS = `/app.js?v=${VERSION_ESTATICOS}`;

export const WHATSAPP = "51986630221";
export const TIENDA = "Euchel Perú";
export const ANUNCIO = "Envíos a todo el Perú";

export const REDES: [string, string][] = [
  ["Instagram", "https://www.instagram.com/euchel.pe/"],
  ["Facebook", "https://www.facebook.com/Euchel.pe"],
  ["TikTok", "https://www.tiktok.com/@euchel.pe"],
];

const ICONOS: Record<string, string> = {
  lupa: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>',
  atras: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>',
  whatsapp: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8.2 19.1z"></path><path d="M9.3 9.2c0 3.2 2.3 5.5 5.5 5.5l1.2-1.6-2.1-1-.9.8c-1.1-.5-1.8-1.2-2.3-2.3l.8-.9-1-2.1z"></path></svg>',
  instagram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor"></circle></svg>',
  facebook: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"></path></svg>',
  tiktok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4v11a3.5 3.5 0 1 1-3.5-3.5M14 4a5 5 0 0 0 5 5"></path></svg>',
};

/* ---------------------------------------------------------------- utilidades */

export function e(texto: unknown): string {
  return String(texto ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

export function soles(v: number | null): string {
  if (v === null || v === undefined) return "";
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/** Para buscar: sin acentos y en minúsculas. Igual que plano() del generador. */
export function plano(texto: string): string {
  return (texto || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** ¿La subió el equipo? Las de la extracción son 16 hex sin extensión. */
const subida = (h: string) => h.includes(".");

/** Ruta pública de una imagen. Igual que ruta_img() y rutaImg() de app.js. */
export function rutaImg(h: string, medida: "thumb" | "full"): string {
  if (subida(h)) {
    const ancho = medida === "thumb" ? 500 : 1400;
    return `/.netlify/images?url=/img/subidas/${h}&w=${ancho}&fm=webp&q=82`;
  }
  return `/img/webp/${h}-${medida}.webp`;
}

/* ---------------------------------------------------------------- armazón */

export function cabeza(base: string, titulo: string, descripcion: string, canonica: string,
                       ogImagen: string | null = null, ogTipo = "website"): string {
  const abs = `${base}${canonica}`;
  let og = "";
  if (ogImagen) {
    // JPEG servido al vuelo por el CDN de imágenes: WhatsApp lee mal el WebP
    // en las vistas previas. Ver brand/pedido-whatsapp.md.
    const ruta = subida(ogImagen)
      ? `/.netlify/images?url=/img/subidas/${ogImagen}&w=900&fm=jpg&q=78`
      : `/.netlify/images?url=/img/webp/${ogImagen}-full.webp&w=900&fm=jpg&q=78`;
    og = `<meta property="og:image" content="${e(base + ruta)}">\n`
       + `<meta property="og:image:alt" content="${e(titulo)}">\n`
       + `<meta name="twitter:card" content="summary_large_image">\n`;
  }
  return `<!doctype html>
<html lang="es-PE" data-wa="${WHATSAPP}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(titulo)}</title>
<meta name="description" content="${e(descripcion)}">
<link rel="canonical" href="${e(abs)}">
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="${ogTipo}">
<meta property="og:site_name" content="${e(TIENDA)}">
<meta property="og:title" content="${e(titulo)}">
<meta property="og:description" content="${e(descripcion)}">
<meta property="og:url" content="${e(abs)}">
<meta property="og:locale" content="es_PE">
${og}<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="${CSS}">
</head>
<body>
<a class="oculto-visual" href="#principal">Saltar al contenido</a>
`;
}

export function cabecera(categorias: Categoria[], actual: string | null = null): string {
  const redes = REDES.map(([n, u]) =>
    `<a href="${e(u)}" target="_blank" rel="noopener" aria-label="${e(n)}"`
    + ` data-red="${n.toLowerCase()}">${ICONOS[n.toLowerCase()]}</a>`).join("");

  const menu = [`<a href="/"${actual === null ? ' aria-current="page"' : ""}>Todo</a>`];
  for (const c of categorias) {
    const marca = actual === c.slug ? ' aria-current="page"' : "";
    menu.push(`<a href="/c/${e(c.slug)}/"${marca}>${e(c.nombre)}</a>`);
  }

  return `<div class="anuncio">${e(ANUNCIO)}</div>
<header class="cabecera">
  <div class="cabecera__fila">
    <div class="redes">${redes}</div>
    <a class="cabecera__logo" href="/" aria-label="${e(TIENDA)}, inicio">
      <img src="/logo.svg" alt="${e(TIENDA)}" width="210" height="40">
    </a>
    <div class="buscador" data-buscador>
      <div class="buscador__campo">
        ${ICONOS.lupa}
        <label class="oculto-visual" for="q">Buscar productos</label>
        <input id="q" type="search" placeholder="Buscar" autocomplete="off">
      </div>
      <div class="buscador__panel" data-panel hidden></div>
    </div>
  </div>
  <nav class="menu" aria-label="Categorías">${menu.join("")}</nav>
</header>
`;
}

export function pie(): string {
  const enlaces = REDES.map(([n, u]) =>
    `<a href="${e(u)}" target="_blank" rel="noopener">${e(n)}</a>`).join("");
  const consulta = "Hola%20Euchel%2C%20quiero%20hacer%20una%20consulta%20sobre%20el%20cat%C3%A1logo.";
  return `<footer class="pie">
  <div class="pie__fila">
    <img src="/logo.svg" alt="${e(TIENDA)}" width="130" height="24">
    <div class="pie__enlaces">${enlaces}</div>
  </div>
</footer>
<a class="flotante" href="https://wa.me/${WHATSAPP}?text=${consulta}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">${ICONOS.whatsapp}</a>
<script src="${JS}" defer></script>
</body>
</html>
`;
}

/* ---------------------------------------------------------------- tarjeta */

/** Con todos los colores agotados, el producto está agotado. */
function agotadoPorColores(p: Producto): Producto {
  const todos = p.colores.length > 0 && p.colores.every((c) => c.agotado);
  return todos && !p.agotado ? { ...p, agotado: true } : p;
}

export function tarjeta(original: Producto, primera = false): string {
  const p = agotadoPorColores(original);
  const foto = p.galeria[0] || null;
  const perezosa = primera ? "" : 'loading="lazy" ';
  const img = foto
    ? `<img src="${rutaImg(foto, "thumb")}" alt="${e(p.nombre)}" width="500" height="667" ${perezosa}decoding="async">`
    : '<div style="width:100%;height:100%"></div>';

  const oferta = p.antes ? '<span class="sello">Oferta</span>' : "";
  // El sello de agotado sale ya armado desde el servidor. app.js también lo
  // pone si /api/estado lo dice, pero comprueba antes que no exista.
  const agotado = p.agotado
    ? `<span class="sello sello--agotado" style="top:${p.antes ? "46px" : "10px"}">Agotado</span>` : "";
  const antes = p.antes ? `<span class="precio--antes">S/ ${soles(p.antes)}</span>` : "";

  const nCol = p.colores.filter((c) => c.nombre !== "Único").length;
  const meta = nCol > 1 ? `${nCol} colores` : p.colores.length ? e(p.colores[0].nombre) : "";

  return `<a class="tarjeta revelar" href="/p/${e(p.slug)}/">
  <div class="tarjeta__foto">${img}${oferta}${agotado}</div>
  <div>
    <div class="tarjeta__nombre">${e(p.nombre)}</div>
    <div class="tarjeta__precios">
      <span class="precio">S/ ${soles(p.precio)}</span>${antes}
      <span class="tarjeta__meta">${meta}</span>
    </div>
  </div>
</a>`;
}

/* ---------------------------------------------------------------- páginas */

export function paginaListado(base: string, titulo: string, etiqueta: string,
                              productos: Producto[], categorias: Categoria[],
                              canonica: string, descripcion: string,
                              actual: string | null = null): string {
  const tarjetas = productos.map((p, i) => tarjeta(p, i < 4)).join("");
  const og = productos[0]?.galeria[0] || null;
  const n = productos.length;
  return cabeza(base, titulo, descripcion, canonica, og)
    + cabecera(categorias, actual)
    + `<main id="principal">
  <div class="envoltura">
    <div class="titulo-seccion">
      <div>
        <div class="etiqueta">${e(etiqueta)}</div>
        <h1>${e(titulo.split(" · ")[0])}</h1>
      </div>
      <div class="cuenta">${n} ${n === 1 ? "producto" : "productos"}</div>
    </div>
    <div class="grilla">${tarjetas}</div>
  </div>
</main>
` + pie();
}

export function paginaFicha(base: string, original: Producto, categorias: Categoria[]): string {
  // Un color agotado no se ofrece. Y si todos lo están, el producto lo está,
  // aunque nadie haya tocado la palanca general: el equipo agota color por
  // color y no tiene por qué acordarse de la general.
  const disponibles = original.colores.filter((c) => !c.agotado);
  const p: Producto = {
    ...original,
    colores: disponibles,
    agotado: original.agotado || (original.colores.length > 0 && disponibles.length === 0),
  };
  const cat = categorias.find((c) => c.nombre === p.categoria) || null;
  const foto = p.galeria[0] || null;
  const volver = cat ? `/c/${e(cat.slug)}/` : "/";

  const descMeta = p.descripcion
    || `${p.nombre} · S/ ${soles(p.precio)} · ${p.categoria} · ${TIENDA}`;
  const titulo = `${p.nombre} · ${TIENDA}`;

  const antes = p.antes ? `<span class="precio--antes">S/ ${soles(p.antes)}</span>` : "";
  const sello = p.antes ? '<span class="sello" style="position:static">Oferta</span>' : "";
  const parrafo = p.descripcion ? `<p class="ficha__desc">${e(p.descripcion)}</p>` : "";

  // Selector de color: se omite cuando hay un único color sin nombre real.
  const muestraColores = p.colores.length > 1
    || (p.colores.length === 1 && !["Único", "Unico"].includes(p.colores[0].nombre));
  const bloqueColores = muestraColores ? `<div class="grupo">
        <div class="grupo__titulo"><span>Color</span><span class="grupo__elegido" data-color-elegido></span></div>
        <div class="opciones" data-colores>${p.colores.map((c, i) =>
          `<button type="button" class="chip" data-color="${i}" aria-pressed="false">${e(c.nombre)}</button>`).join("")}</div>
      </div>` : "";

  const principal = foto
    ? `<img data-foto-principal src="${rutaImg(foto, "full")}" alt="${e(p.nombre)}" width="1400" height="1867" decoding="async">`
    : '<div style="width:100%;height:100%"></div>';

  // Agotado: el botón sale ya desactivado. Mismo aspecto que pone app.js
  // cuando lo aprende de /api/estado, así no hay salto al cargar.
  const cta = p.agotado
    ? `<a class="cta" data-cta aria-disabled="true" style="background:#cccccc;pointer-events:none">
          ${ICONOS.whatsapp}<span>Agotado</span>
        </a>
        <div class="cta__nota">Sin stock por ahora. Escríbenos y te avisamos cuando vuelva.</div>`
    : `<a class="cta" data-cta href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">
          ${ICONOS.whatsapp}<span>Continuar compra</span>
        </a>
        <div class="cta__nota">Se abre WhatsApp con tu pedido y la foto del producto</div>`;

  // Lo que app.js necesita para armar el pedido. Solo tallas disponibles y
  // colores con existencia: lo que no se puede pedir no se ofrece.
  const datos = JSON.stringify({
    id: p.id,
    slug: p.slug,
    nombre: p.nombre,
    precio: soles(p.precio),
    imagenes: p.galeria,
    colores: p.colores.map((c) => ({
      id: c.id, nombre: c.nombre, precio: c.precio,
      tallas: c.tallas.filter((t) => !t.agotado).map((t) => ({ nombre: t.nombre })),
      imagenes: c.imagenes,
    })),
  });

  const esquema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nombre,
    description: descMeta,
    sku: String(p.id),
    brand: { "@type": "Brand", name: p.marca || TIENDA },
    offers: {
      "@type": "Offer",
      price: soles(p.precio),
      priceCurrency: "PEN",
      availability: p.agotado ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: `${base}/p/${p.slug}/`,
    },
  });

  // Un "</script>" dentro de un nombre cerraría el bloque JSON antes de
  // tiempo. Se escapa la barra, que JSON acepta tal cual.
  const seguro = (s: string) => s.replace(/<\//g, "<\\/");

  return cabeza(base, titulo, descMeta, `/p/${p.slug}/`, foto, "product")
    + cabecera(categorias, cat ? cat.slug : null)
    + `<main id="principal" class="ficha" data-ficha>
  <nav class="miga" aria-label="Migas de pan">
    <a href="${volver}" aria-label="Volver">${ICONOS.atras}</a>
    <a href="${volver}">${e(p.categoria)}</a>
  </nav>
  <div class="ficha__cuerpo">
    <div class="galeria">
      <div class="galeria__principal">${principal}</div>
      <div class="galeria__tiras" data-tiras hidden></div>
    </div>
    <div class="ficha__datos">
      <div class="grupo">
        <h1>${e(p.nombre)}</h1>
        <div class="ficha__precio">
          <span class="precio">S/ ${soles(p.precio)}</span>${antes}${sello}
        </div>
      </div>
      ${parrafo}
      ${bloqueColores}
      <div class="grupo" data-grupo-tallas hidden>
        <div class="grupo__titulo"><span>Talla</span><span class="grupo__elegido" data-talla-elegida></span></div>
        <div class="opciones" data-tallas></div>
      </div>
      <div class="grupo">
        ${cta}
      </div>
    </div>
  </div>
</main>
<script type="application/json" id="datos-producto">${seguro(datos)}</script>
<script type="application/ld+json">${seguro(esquema)}</script>
` + pie();
}

export function pagina404(base: string, categorias: Categoria[]): string {
  return cabeza(base, `Página no encontrada · ${TIENDA}`, "La página que buscas no existe.", "/404")
    + cabecera(categorias)
    + `<main id="principal" class="envoltura" style="padding-top:60px;text-align:center">
  <h1 style="font-size:20px;text-transform:uppercase;letter-spacing:.02em">No encontramos esa página</h1>
  <p style="color:#4d4d4d;max-width:36ch;margin:12px auto 28px">
    Puede que el producto ya no esté disponible. Mira el catálogo completo.
  </p>
  <a class="cta" href="/" style="max-width:280px;margin:0 auto;text-decoration:none">Ver el catálogo</a>
</main>
` + pie();
}

/** Índice del buscador: claves cortas para que pese poco. */
export function indiceBusqueda(productos: Producto[]): string {
  return JSON.stringify(productos.map((p) => ({
    n: p.nombre,
    u: p.slug,
    c: p.categoria,
    p: soles(p.precio),
    a: p.antes ? soles(p.antes) : "",
    i: p.galeria[0] || "",
    b: plano(`${p.nombre} ${p.categoria}`),
  })));
}

export function sitemap(base: string, categorias: Categoria[], productos: Producto[]): string {
  const hoy = new Date().toISOString().slice(0, 10);
  const urls = ["/", ...categorias.map((c) => `/c/${c.slug}/`), ...productos.map((p) => `/p/${p.slug}/`)];
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + urls.map((u) => `<url><loc>${e(base + u)}</loc><lastmod>${hoy}</lastmod></url>`).join("")
    + "</urlset>\n";
}
