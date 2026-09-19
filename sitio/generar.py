#!/usr/bin/env python3
"""Arma la carpeta que se publica en Netlify: solo lo estático.

    python3 sitio/generar.py --salida dist

Copia los archivos fijos (CSS, JS, iconos, los paneles del equipo, la página
sin conexión), enlaza las imágenes de la extracción y escribe las reglas de
Netlify (_headers, _redirects, robots.txt).

Ya no genera páginas de productos. Antes escribía 778 archivos HTML con el
catálogo metido dentro, y cada producto nuevo obligaba a reconstruir y
desplegar. Ahora las páginas las arma al momento la función
netlify/functions/catalogo.mts, leyendo la base, y el borde de Netlify las
cachea hasta que el panel guarde un cambio. Hay una sola forma de armar una
página, y es esa.

Lo único que hay que desplegar es esta carpeta, y solo cuando cambie el
código: nunca por un producto.
"""

from __future__ import annotations

import argparse
import os
import shutil
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

# El único sitio donde hace falta escribir la dirección del sitio: el
# robots.txt, que tiene que decir dónde está el sitemap en absoluto. Todo lo
# demás (canónicas, sitemap, vistas previas de WhatsApp) lo arma la función
# con la dirección por la que entró la visita, así que el dominio se cambia
# sin tocar código.
SITIO = os.environ.get("SITIO_BASE", "https://euchelperu.com").rstrip("/")


def escribir(destino: Path, contenido: str):
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(contenido, encoding="utf-8")


def copiar_imagenes(salida: Path) -> int:
    """Enlaza todos los WebP de la extracción. Todos: la función decide cuáles
    usa cada página, y un producto oculto puede activarse desde el panel en
    cualquier momento sin volver a desplegar."""
    origen = DATOS / "images" / "webp"
    destino = salida / "img" / "webp"
    destino.mkdir(parents=True, exist_ok=True)

    copiadas = 0
    for src in sorted(origen.glob("*.webp")):
        dst = destino / src.name
        if dst.exists():
            continue
        try:
            os.link(src, dst)          # enlace duro: no duplica bytes
        except OSError:
            shutil.copy2(src, dst)
        copiadas += 1
    return copiadas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--salida", default=str(Path(__file__).resolve().parent / "publico"))
    args = ap.parse_args()

    salida = Path(args.salida).resolve()
    if salida.exists():
        shutil.rmtree(salida)
    salida.mkdir(parents=True)

    escribir(salida / "robots.txt",
             "User-agent: *\nAllow: /\n"
             "Disallow: /trabajador/\nDisallow: /admin/\n"
             f"Sitemap: {SITIO}/sitemap.xml\n")

    # --- _redirects y _headers.
    #
    # Viven dentro de la carpeta publicada porque Netlify los lee siempre; las
    # reglas del netlify.toml no se aplicaron en un despliegue del sitio ya
    # construido (comprobado: /auth/* daba 404).

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
        "# Aquí NO va ninguna regla comodín.",
        "#",
        "# Había una, `/*  /404  404`, para que la función del catálogo pintara",
        "# la página de no encontrado con el menú y el buscador. Se metía por",
        "# medio de archivos que sí estaban: una parte de las fotos del",
        "# catálogo devolvía esa página en vez de la imagen, y el borde la",
        "# guardaba bajo la URL de la foto. Medio catálogo sin fotos, con los",
        "# archivos intactos en el servidor.",
        "#",
        "# Para las direcciones que no existen está 404.html, que Netlify sirve",
        "# solo, sin regla ninguna y sin pasar por delante de nada.",
        "",
    ]))

    escribir(salida / "_headers", "\n".join([
        "# Generado por sitio/generar.py. No editar a mano.",
        "",
        "/img/webp/*",
        "  Cache-Control: public, max-age=31536000, immutable",
        "",
        "# Las páginas los enlazan con ?v=<despliegue>, así que cada despliegue",
        "# es una URL nueva: el navegador puede guardarlos mucho tiempo sin",
        "# quedarse con un diseño viejo.",
        "/estilos.css",
        "  Cache-Control: public, max-age=604800, stale-while-revalidate=86400",
        "",
        "/app.js",
        "  Cache-Control: public, max-age=604800, stale-while-revalidate=86400",
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

    # Estáticos, recursivo: los paneles del equipo son subcarpetas con su
    # propio index, manifiesto y service worker.
    for f in ESTATICO.rglob("*"):
        if f.is_file():
            destino = salida / f.relative_to(ESTATICO)
            destino.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, destino)
    shutil.copy2(RAIZ / "brand" / "logo.svg", salida / "logo.svg")
    shutil.copy2(RAIZ / "brand" / "favicon.png", salida / "favicon.png")

    copiadas = copiar_imagenes(salida)
    print(f"estáticos listos · imágenes enlazadas: {copiadas}")
    print(f"Listo en {salida}")


if __name__ == "__main__":
    main()
