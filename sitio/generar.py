#!/usr/bin/env python3
"""Genera el catálogo estático de Euchel desde la extracción.

    python3 sitio/generar.py [--salida sitio/publico] [--incluir-ocultos]

Lee scraper/data/productos_completo.json y scraper/data/imagenes_map.json y
escribe un sitio completo: portada, una página por categoría y una ficha por
producto, más el índice de búsqueda, el manifest y el service worker.

Solo librería estándar. Las imágenes se enlazan con enlaces duros (misma
partición) para no duplicar los 183 MB de WebP.

Por defecto salen los 752 productos activos. Los 210 huérfanos están
desactivados en el panel de la tienda (ver scraper/data/reporte.md, sección 3)
y no se publican salvo que se pida con --incluir-ocultos.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "scraper" / "data"
ESTATICO = Path(__file__).resolve().parent / "estatico"

# Servidor de Neon Auth de este proyecto. El sitio no lo llama directo: lo
# pasa por /auth/* de su propio dominio (ver _redirects más abajo).
AUTH_BASE = os.environ.get(
    "NEON_AUTH_BASE_URL",
    "https://ep-delicate-poetry-ar49pls1.neonauth.c-4.us-west-2.aws.neon.tech/euchel/auth",
).rstrip("/")

WHATSAPP = "51986630221"
TIENDA = "Euchel Perú"
ANUNCIO = "Envíos a todo el Perú"

REDES = [
    ("Instagram", "https://www.instagram.com/euchel.pe/"),
    ("Facebook", "https://www.facebook.com/Euchel.pe"),
    ("TikTok", "https://www.tiktok.com/@euchel.pe"),
]

# Netlify expone la URL del sitio en el build. Sin ella, los enlaces del
# navegador siguen funcionando (app.js usa location.origin); lo único que
# necesita URL absoluta son las etiquetas Open Graph.
BASE_URL = (os.environ.get("URL") or os.environ.get("DEPLOY_PRIME_URL") or "").rstrip("/")

ICONOS = {
    "lupa": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>',
    "atras": '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>',
    "whatsapp": '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8.2 19.1z"></path><path d="M9.3 9.2c0 3.2 2.3 5.5 5.5 5.5l1.2-1.6-2.1-1-.9.8c-1.1-.5-1.8-1.2-2.3-2.3l.8-.9-1-2.1z"></path></svg>',
    "instagram": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor"></circle></svg>',
    "facebook": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"></path></svg>',
    "tiktok": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4v11a3.5 3.5 0 1 1-3.5-3.5M14 4a5 5 0 0 0 5 5"></path></svg>',
}


# ------------------------------------------------------------------ utilidades

def babosa(texto: str) -> str:
    """Nombre legible en URL: sin acentos, minúsculas, guiones."""
    t = unicodedata.normalize("NFKD", texto or "")
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"[^A-Za-z0-9]+", "-", t).strip("-").lower()
    return t or "producto"


def plano(texto: str) -> str:
    """Para buscar: sin acentos y en minúsculas."""
    t = unicodedata.normalize("NFKD", texto or "")
    return "".join(c for c in t if not unicodedata.combining(c)).lower()


def e(texto) -> str:
    return html.escape(str(texto if texto is not None else ""), quote=True)


def soles(v) -> str:
    if v is None:
        return ""
    return f"{v:.0f}" if float(v).is_integer() else f"{v:.2f}"


# ------------------------------------------------------------------ imágenes

def subida(h: str) -> bool:
    """¿La subió el equipo desde el panel?

    Las de la extracción son un hash de 16 hex sin extensión y viven como
    WebP estáticos. Las subidas llevan la extensión del archivo original
    (`<32 hex>.jpg`) y viven en el almacén de Netlify, así que el punto
    alcanza para distinguirlas."""
    return "." in h


def ruta_img(h: str, medida: str) -> str:
    """Ruta pública de una imagen. `medida` es 'thumb' o 'full'."""
    if subida(h):
        # El CDN de imágenes de Netlify la redimensiona y la pasa a WebP al
        # vuelo, así que una foto subida se comporta igual que una generada
        # sin tener que reconvertirla en la construcción.
        ancho = 500 if medida == "thumb" else 1400
        return f"/.netlify/images?url=/img/subidas/{h}&w={ancho}&fm=webp&q=82"
    return f"/img/webp/{h}-{medida}.webp"


# --------------------------------------------------------------- preparar datos

CATALOGO = Path(__file__).resolve().parent / "data" / "catalogo.json"


def cargar(incluir_ocultos: bool):
    """El catálogo sale de la base si hay exportación, y si no del scraping.

    La base es la que manda: lleva los precios que el equipo cambió desde el
    panel y los productos que subió. Leer el JSON del scraping revertía lo
    primero y no veía lo segundo. El camino del scraping se queda para poder
    generar el sitio sin credenciales."""
    if CATALOGO.exists():
        datos = json.loads(CATALOGO.read_text("utf-8"))
        productos = datos["productos"]
        if not incluir_ocultos:
            productos = [x for x in productos if x.get("visible")]
        usados = set()
        for x in productos:
            usados.update(x["galeria"])
            for c in x["colores"]:
                usados.update(c["imagenes"])
        incompletos = sum(len(x.get("colores_incompletos") or []) for x in productos)
        productos.sort(key=lambda x: -x["id"])
        return productos, usados, incompletos

    return cargar_del_scraping(incluir_ocultos)


def cargar_del_scraping(incluir_ocultos: bool):
    productos = json.loads((DATOS / "productos_completo.json").read_text("utf-8"))
    mapa = json.loads((DATOS / "imagenes_map.json").read_text("utf-8"))

    if not incluir_ocultos:
        productos = [p for p in productos if p.get("origen") != "barrido"]

    def hash_de(url):
        ent = mapa.get(url)
        return ent.get("hash") if ent else None

    limpios, usados = [], set()
    for p in productos:
        galeria = [h for h in (hash_de(u) for u in p.get("imagenes_ficha") or []) if h]

        colores, incompletos = [], []
        for c in p.get("colores") or []:
            tallas = [{"nombre": t.get("nombre")} for t in (c.get("tallas") or [])]
            # Un color sin tallas y sin precio no se puede pedir: está a medio
            # configurar en el panel de la tienda. No se publica, pero se
            # cuenta para avisarle a los dueños.
            if not tallas and c.get("precio") is None:
                incompletos.append(c.get("nombre") or "?")
                continue
            imgs = [h for h in (hash_de(u) for u in c.get("imagenes") or []) if h]
            colores.append({
                "id": c.get("id_color"),
                "nombre": c.get("nombre") or "Único",
                "precio": c.get("precio"),
                "tallas": tallas,
                "imagenes": imgs,
            })
            usados.update(imgs)

        if not galeria and colores:
            galeria = colores[0]["imagenes"][:]
        usados.update(galeria)

        slug = f"{p['id_original']}-{babosa(p['nombre'])}"
        limpios.append({
            "id": p["id_original"],
            "slug": slug,
            "nombre": p["nombre"],
            "descripcion": (p.get("descripcion") or "").strip(),
            "categoria": p.get("categoria") or "Catálogo",
            "subid": p.get("categoria_subid"),
            "precio": p.get("precio_base"),
            # Ojo: en el sitio original `precio_oferta` es el precio ANTERIOR,
            # el tachado — no el rebajado. Ver scraper/README.md.
            "antes": p.get("precio_oferta"),
            "marca": p.get("marca"),
            "galeria": galeria,
            "colores": colores,
            "colores_incompletos": incompletos,
        })

    limpios.sort(key=lambda x: -x["id"])
    return limpios, usados, sum(len(x["colores_incompletos"]) for x in limpios)


def por_categoria(productos):
    cats = {}
    for p in productos:
        cats.setdefault(p["categoria"], []).append(p)
    orden = sorted(cats.items(), key=lambda kv: (-len(kv[1]), kv[0]))
    return [{"nombre": n, "slug": babosa(n), "productos": ps} for n, ps in orden]


# ------------------------------------------------------------------ plantillas

def cabeza(titulo, descripcion, canonica, og_imagen=None, og_tipo="website"):
    abs_url = f"{BASE_URL}{canonica}" if BASE_URL else canonica
    og_img = ""
    if og_imagen and BASE_URL:
        # JPEG servido al vuelo por el CDN de imágenes de Netlify: WhatsApp lee
        # mal el WebP en las vistas previas. Ver brand/pedido-whatsapp.md.
        if subida(og_imagen):
            ruta = f"/.netlify/images?url=/img/subidas/{og_imagen}&w=900&fm=jpg&q=78"
        else:
            ruta = f"/.netlify/images?url=/img/webp/{og_imagen}-full.webp&w=900&fm=jpg&q=78"
        og_img = (
            f'<meta property="og:image" content="{e(BASE_URL + ruta)}">\n'
            f'<meta property="og:image:alt" content="{e(titulo)}">\n'
            f'<meta name="twitter:card" content="summary_large_image">\n'
        )
    return f"""<!doctype html>
<html lang="es-PE" data-wa="{WHATSAPP}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(titulo)}</title>
<meta name="description" content="{e(descripcion)}">
<link rel="canonical" href="{e(abs_url)}">
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="{og_tipo}">
<meta property="og:site_name" content="{e(TIENDA)}">
<meta property="og:title" content="{e(titulo)}">
<meta property="og:description" content="{e(descripcion)}">
<meta property="og:url" content="{e(abs_url)}">
<meta property="og:locale" content="es_PE">
{og_img}<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/estilos.css">
</head>
<body>
<a class="oculto-visual" href="#principal">Saltar al contenido</a>
"""


def cabecera(categorias, actual=None):
    redes = "".join(
        f'<a href="{e(u)}" target="_blank" rel="noopener" aria-label="{e(n)}"'
        f' data-red="{n.lower()}">{ICONOS[n.lower()]}</a>'
        for n, u in REDES
    )
    marca_todo = ' aria-current="page"' if actual is None else ""
    menu = [f'<a href="/"{marca_todo}>Todo</a>']
    for c in categorias:
        marca = ' aria-current="page"' if actual == c["slug"] else ""
        menu.append(f'<a href="/c/{c["slug"]}/"{marca}>{e(c["nombre"])}</a>')

    return f"""<div class="anuncio">{e(ANUNCIO)}</div>
<header class="cabecera">
  <div class="cabecera__fila">
    <div class="redes">{redes}</div>
    <a class="cabecera__logo" href="/" aria-label="{e(TIENDA)}, inicio">
      <img src="/logo.svg" alt="{e(TIENDA)}" width="210" height="40">
    </a>
    <div class="buscador" data-buscador>
      <div class="buscador__campo">
        {ICONOS["lupa"]}
        <label class="oculto-visual" for="q">Buscar productos</label>
        <input id="q" type="search" placeholder="Buscar" autocomplete="off">
      </div>
      <div class="buscador__panel" data-panel hidden></div>
    </div>
  </div>
  <nav class="menu" aria-label="Categorías">{"".join(menu)}</nav>
</header>
"""


def pie():
    enlaces = "".join(
        f'<a href="{e(u)}" target="_blank" rel="noopener">{e(n)}</a>' for n, u in REDES
    )
    return f"""<footer class="pie">
  <div class="pie__fila">
    <img src="/logo.svg" alt="{e(TIENDA)}" width="130" height="24">
    <div class="pie__enlaces">{enlaces}</div>
  </div>
</footer>
<a class="flotante" href="https://wa.me/{WHATSAPP}?text={
  'Hola%20Euchel%2C%20quiero%20hacer%20una%20consulta%20sobre%20el%20cat%C3%A1logo.'
}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">{ICONOS["whatsapp"]}</a>
<script src="/app.js" defer></script>
</body>
</html>
"""


def tarjeta(p, primera=False):
    foto = p["galeria"][0] if p["galeria"] else None
    perezosa = "" if primera else 'loading="lazy" '
    if foto:
        img = (
            f'<img src="{ruta_img(foto, "thumb")}" alt="{e(p["nombre"])}" '
            f'width="500" height="667" {perezosa}decoding="async">'
        )
    else:
        img = '<div style="width:100%;height:100%"></div>'

    sello = '<span class="sello">Oferta</span>' if p["antes"] else ""
    antes = f'<span class="precio--antes">S/ {soles(p["antes"])}</span>' if p["antes"] else ""

    n_col = len([c for c in p["colores"] if c["nombre"] != "Único"])
    meta = f"{n_col} colores" if n_col > 1 else e(p["colores"][0]["nombre"]) if p["colores"] else ""

    return f"""<a class="tarjeta revelar" href="/p/{p["slug"]}/">
  <div class="tarjeta__foto">{img}{sello}</div>
  <div>
    <div class="tarjeta__nombre">{e(p["nombre"])}</div>
    <div class="tarjeta__precios">
      <span class="precio">S/ {soles(p["precio"])}</span>{antes}
      <span class="tarjeta__meta">{meta}</span>
    </div>
  </div>
</a>"""


def pagina_listado(titulo, etiqueta, productos, categorias, canonica, descripcion, actual=None):
    tarjetas = "".join(tarjeta(p, i < 4) for i, p in enumerate(productos))
    og = productos[0]["galeria"][0] if productos and productos[0]["galeria"] else None
    n = len(productos)
    return (
        cabeza(titulo, descripcion, canonica, og)
        + cabecera(categorias, actual)
        + f"""<main id="principal">
  <div class="envoltura">
    <div class="titulo-seccion">
      <div>
        <div class="etiqueta">{e(etiqueta)}</div>
        <h1>{e(titulo.split(" · ")[0])}</h1>
      </div>
      <div class="cuenta">{n} {"producto" if n == 1 else "productos"}</div>
    </div>
    <div class="grilla">{tarjetas}</div>
  </div>
</main>
"""
        + pie()
    )


def pagina_ficha(p, categorias):
    cat = next((c for c in categorias if c["nombre"] == p["categoria"]), None)
    foto = p["galeria"][0] if p["galeria"] else None

    desc_meta = p["descripcion"] or f'{p["nombre"]} · S/ {soles(p["precio"])} · {p["categoria"]} · {TIENDA}'
    titulo = f'{p["nombre"]} · {TIENDA}'

    antes = f'<span class="precio--antes">S/ {soles(p["antes"])}</span>' if p["antes"] else ""
    sello = '<span class="sello" style="position:static">Oferta</span>' if p["antes"] else ""

    parrafo = f'<p class="ficha__desc">{e(p["descripcion"])}</p>' if p["descripcion"] else ""

    # Selector de color: se omite cuando el producto tiene un único color sin nombre real.
    muestra_colores = len(p["colores"]) > 1 or (
        p["colores"] and p["colores"][0]["nombre"] not in ("Único", "Unico")
    )
    bloque_colores = ""
    if muestra_colores:
        botones = "".join(
            f'<button type="button" class="chip" data-color="{i}" aria-pressed="false">{e(c["nombre"])}</button>'
            for i, c in enumerate(p["colores"])
        )
        bloque_colores = f"""<div class="grupo">
        <div class="grupo__titulo"><span>Color</span><span class="grupo__elegido" data-color-elegido></span></div>
        <div class="opciones" data-colores>{botones}</div>
      </div>"""

    principal = (
        f'<img data-foto-principal src="{ruta_img(foto, "full")}" alt="{e(p["nombre"])}" '
        f'width="1400" height="1867" decoding="async">'
        if foto else '<div style="width:100%;height:100%"></div>'
    )

    datos = json.dumps({
        "id": p["id"],
        "slug": p["slug"],
        "nombre": p["nombre"],
        "precio": soles(p["precio"]),
        "imagenes": p["galeria"],
        "colores": p["colores"],
    }, ensure_ascii=False, separators=(",", ":"))

    esquema = json.dumps({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": p["nombre"],
        "description": desc_meta,
        "sku": str(p["id"]),
        "brand": {"@type": "Brand", "name": p["marca"] or TIENDA},
        "offers": {
            "@type": "Offer",
            "price": soles(p["precio"]),
            "priceCurrency": "PEN",
            "availability": "https://schema.org/InStock",
            **({"url": f'{BASE_URL}/p/{p["slug"]}/'} if BASE_URL else {}),
        },
    }, ensure_ascii=False)

    return (
        cabeza(titulo, desc_meta, f'/p/{p["slug"]}/', foto, "product")
        + cabecera(categorias, cat["slug"] if cat else None)
        + f"""<main id="principal" class="ficha" data-ficha>
  <nav class="miga" aria-label="Migas de pan">
    <a href="{f'/c/{cat["slug"]}/' if cat else '/'}" aria-label="Volver">{ICONOS["atras"]}</a>
    <a href="{f'/c/{cat["slug"]}/' if cat else '/'}">{e(p["categoria"])}</a>
  </nav>
  <div class="ficha__cuerpo">
    <div class="galeria">
      <div class="galeria__principal">{principal}</div>
      <div class="galeria__tiras" data-tiras hidden></div>
    </div>
    <div class="ficha__datos">
      <div class="grupo">
        <h1>{e(p["nombre"])}</h1>
        <div class="ficha__precio">
          <span class="precio">S/ {soles(p["precio"])}</span>{antes}{sello}
        </div>
      </div>
      {parrafo}
      {bloque_colores}
      <div class="grupo" data-grupo-tallas hidden>
        <div class="grupo__titulo"><span>Talla</span><span class="grupo__elegido" data-talla-elegida></span></div>
        <div class="opciones" data-tallas></div>
      </div>
      <div class="grupo">
        <a class="cta" data-cta href="https://wa.me/{WHATSAPP}" target="_blank" rel="noopener">
          {ICONOS["whatsapp"]}<span>Continuar compra</span>
        </a>
        <div class="cta__nota">Se abre WhatsApp con tu pedido y la foto del producto</div>
      </div>
    </div>
  </div>
</main>
<script type="application/json" id="datos-producto">{datos}</script>
<script type="application/ld+json">{esquema}</script>
"""
        + pie()
    )


def pagina_offline():
    return f"""<!doctype html>
<html lang="es-PE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sin conexión · {e(TIENDA)}</title>
<link rel="stylesheet" href="/estilos.css">
</head>
<body>
<main id="principal" class="envoltura" style="padding-top:60px;text-align:center">
  <img src="/logo.svg" alt="{e(TIENDA)}" width="180" height="34" style="margin:0 auto 28px">
  <h1 style="font-size:20px;text-transform:uppercase;letter-spacing:.02em">Sin conexión</h1>
  <p style="color:#4d4d4d;max-width:34ch;margin:12px auto 28px">
    No pudimos cargar esta página. Revisa tu señal e inténtalo otra vez.
  </p>
  <a class="cta" href="/" style="max-width:280px;margin:0 auto;text-decoration:none">Volver al catálogo</a>
</main>
</body>
</html>
"""


def pagina_404(categorias):
    return (
        cabeza("Página no encontrada · " + TIENDA, "La página que buscas no existe.", "/404.html")
        + cabecera(categorias)
        + """<main id="principal" class="envoltura" style="padding-top:60px;text-align:center">
  <h1 style="font-size:20px;text-transform:uppercase;letter-spacing:.02em">No encontramos esa página</h1>
  <p style="color:#4d4d4d;max-width:36ch;margin:12px auto 28px">
    Puede que el producto ya no esté disponible. Mira el catálogo completo.
  </p>
  <a class="cta" href="/" style="max-width:280px;margin:0 auto;text-decoration:none">Ver el catálogo</a>
</main>
"""
        + pie()
    )


# ----------------------------------------------------------------- escritura

def escribir(destino: Path, contenido: str):
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(contenido, encoding="utf-8")


def copiar_imagenes(usados, salida: Path):
    origen = DATOS / "images" / "webp"
    destino = salida / "img" / "webp"
    destino.mkdir(parents=True, exist_ok=True)

    copiadas, faltantes = 0, 0
    # Las subidas no se copian: las sirve una función desde el almacén.
    for h in sorted(x for x in usados if not subida(x)):
        for medida in ("thumb", "full"):
            src = origen / f"{h}-{medida}.webp"
            dst = destino / f"{h}-{medida}.webp"
            if not src.exists():
                faltantes += 1
                continue
            if dst.exists():
                continue
            try:
                os.link(src, dst)          # enlace duro: no duplica bytes
            except OSError:
                shutil.copy2(src, dst)
            copiadas += 1
    return copiadas, faltantes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--salida", default=str(Path(__file__).resolve().parent / "publico"))
    ap.add_argument("--incluir-ocultos", action="store_true",
                    help="publica también los 210 productos desactivados")
    args = ap.parse_args()

    salida = Path(args.salida).resolve()
    if salida.exists():
        shutil.rmtree(salida)
    salida.mkdir(parents=True)

    productos, usados, incompletos = cargar(args.incluir_ocultos)
    categorias = por_categoria(productos)
    print(f"{len(productos)} productos · {len(categorias)} categorías · {len(usados)} imágenes")

    if incompletos:
        afectados = sum(1 for p in productos if p.get("colores_incompletos"))
        print(f"AVISO: {incompletos} colores en {afectados} productos no se publican "
              f"(sin tallas ni precio en el panel de la tienda). Ver reporte.")

    # portada
    escribir(salida / "index.html", pagina_listado(
        "Catálogo · " + TIENDA, "Colección", productos, categorias, "/",
        f"Catálogo completo de {TIENDA}: {len(productos)} productos. Elige color y talla y continúa tu compra por WhatsApp.",
    ))

    # categorías
    for c in categorias:
        escribir(salida / "c" / c["slug"] / "index.html", pagina_listado(
            f'{c["nombre"]} · {TIENDA}', "Categoría", c["productos"], categorias,
            f'/c/{c["slug"]}/',
            f'{c["nombre"]} de {TIENDA}: {len(c["productos"])} productos. Pide por WhatsApp.',
            actual=c["slug"],
        ))

    # fichas
    for p in productos:
        escribir(salida / "p" / p["slug"] / "index.html", pagina_ficha(p, categorias))

    # índice de búsqueda: claves cortas para que pese poco
    indice = [{
        "n": p["nombre"],
        "u": p["slug"],
        "c": p["categoria"],
        "p": soles(p["precio"]),
        "a": soles(p["antes"]) if p["antes"] else "",
        "i": p["galeria"][0] if p["galeria"] else "",
        "b": plano(f'{p["nombre"]} {p["categoria"]}'),
    } for p in productos]
    escribir(salida / "buscar.json", json.dumps(indice, ensure_ascii=False, separators=(",", ":")))

    escribir(salida / "offline.html", pagina_offline())
    escribir(salida / "404.html", pagina_404(categorias))

    # sitemap y robots
    urls = ["/"] + [f'/c/{c["slug"]}/' for c in categorias] + [f'/p/{p["slug"]}/' for p in productos]
    hoy = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cuerpo = "".join(
        f"<url><loc>{e(BASE_URL + u)}</loc><lastmod>{hoy}</lastmod></url>" for u in urls
    ) if BASE_URL else ""
    escribir(salida / "sitemap.xml",
             '<?xml version="1.0" encoding="UTF-8"?>\n'
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
             f"{cuerpo}</urlset>\n")
    escribir(salida / "robots.txt",
             "User-agent: *\nAllow: /\n"
             "Disallow: /trabajador/\nDisallow: /admin/\n" +
             (f"Sitemap: {BASE_URL}/sitemap.xml\n" if BASE_URL else ""))

    # --- _redirects y _headers.
    #
    # Las mismas reglas están en netlify.toml, pero estos dos archivos viven
    # dentro de la carpeta publicada y Netlify los lee siempre. En el
    # despliegue del sitio ya construido las reglas del netlify.toml no se
    # aplicaron (comprobado: /auth/* daba 404 y las cabeceras de /trabajador/
    # no salían), así que la copia que manda es esta.

    escribir(salida / "_redirects", "\n".join([
        "# Generado por sitio/generar.py. No editar a mano.",
        "",
        "# La sesión del equipo pasa por este dominio para que la cookie de",
        "# Neon Auth sea de primera parte (si no, Safari la bloquea en iPhone).",
        f"/auth/*  {AUTH_BASE}/:splat  200!",
        "",
        "# Los paneles son de una sola página. Sin '!', un archivo que exista",
        "# (panel.js, el manifiesto) se sirve antes que esta regla.",
        "/trabajador/*  /trabajador/index.html  200",
        "/admin/*  /admin/index.html  200",
        "",
    ]))

    escribir(salida / "_headers", "\n".join([
        "# Generado por sitio/generar.py. No editar a mano.",
        "",
        "/img/webp/*",
        "  Cache-Control: public, max-age=31536000, immutable",
        "",
        "/estilos.css",
        "  Cache-Control: public, max-age=3600",
        "",
        "/app.js",
        "  Cache-Control: public, max-age=3600",
        "",
        "/sw.js",
        "  Cache-Control: public, max-age=0, must-revalidate",
        "",
        "# Netlify sirve .webmanifest como octet-stream y el navegador lo",
        "# acepta, pero el tipo correcto evita sorpresas al instalar la app.",
        "/*.webmanifest",
        "  Content-Type: application/manifest+json; charset=utf-8",
        "",
        "# Los paneles no se indexan y su HTML no se cachea: son la",
        "# herramienta de trabajo, no el escaparate.",
        "/trabajador/*",
        "  X-Robots-Tag: noindex, nofollow",
        "  Cache-Control: no-cache",
        "",
        "/admin/*",
        "  X-Robots-Tag: noindex, nofollow",
        "  Cache-Control: no-cache",
        "",
        "/*",
        "  X-Content-Type-Options: nosniff",
        "  Referrer-Policy: strict-origin-when-cross-origin",
        "  X-Frame-Options: SAMEORIGIN",
        "",
    ]))

    # estáticos. Recursivo: los paneles del equipo son subcarpetas
    # (estatico/trabajador/, estatico/admin/) con su propio index, manifiesto
    # y service worker.
    for f in ESTATICO.rglob("*"):
        if f.is_file():
            destino = salida / f.relative_to(ESTATICO)
            destino.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, destino)
    shutil.copy2(RAIZ / "brand" / "logo.svg", salida / "logo.svg")
    shutil.copy2(RAIZ / "brand" / "favicon.png", salida / "favicon.png")

    copiadas, faltantes = copiar_imagenes(usados, salida)

    n_html = sum(1 for _ in salida.rglob("*.html"))
    print(f"HTML: {n_html} · imágenes enlazadas: {copiadas}" +
          (f" · faltantes: {faltantes}" if faltantes else ""))
    print(f"URL base para Open Graph: {BASE_URL or '(sin definir: se omiten og:image y sitemap)'}")
    print(f"Listo en {salida}")


if __name__ == "__main__":
    main()
