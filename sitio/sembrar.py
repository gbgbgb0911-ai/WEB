#!/usr/bin/env python3
"""Genera el SQL de carga inicial del catálogo en Neon.

    python3 sitio/sembrar.py > /tmp/semilla.sql
    psql "$DATABASE_URL" -f /tmp/semilla.sql

Carga los 962 productos de la extracción. Los 210 huérfanos entran con
visible = false: están desactivados en el panel de la tienda, y así los
dueños pueden reactivar desde el panel nuevo sin volver a extraer.

Idempotente: usa upsert por id, así que se puede correr otra vez sin
duplicar. No toca `visible`, `agotado` ni `archivado` de lo ya cargado,
para no pisar lo que el equipo haya cambiado desde el panel.
"""

from __future__ import annotations

import json
import sys
import unicodedata
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "scraper" / "data"


def babosa(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto or "")
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"[^A-Za-z0-9]+", "-", t).strip("-").lower()
    return t or "producto"


def lit(v) -> str:
    """Literal SQL seguro."""
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def main():
    productos = json.loads((DATOS / "productos_completo.json").read_text("utf-8"))
    mapa = json.loads((DATOS / "imagenes_map.json").read_text("utf-8"))
    hash_de = lambda u: (mapa.get(u) or {}).get("hash")

    w = sys.stdout.write
    w("-- Carga inicial del catálogo Euchel. Generado por sitio/sembrar.py\n")
    w("begin;\n\n")

    def lote(tabla, columnas, filas, conflicto, actualiza, por_tanda=400):
        """Un INSERT por tanda en vez de uno por fila. Con 8.000 sentencias
        sueltas la carga eran ~27 min de viajes de red contra una conexión
        que corta; por lotes son segundos."""
        if not filas:
            return
        for i in range(0, len(filas), por_tanda):
            vals = ", ".join(
                "(" + ", ".join(lit(v) for v in f) + ")" for f in filas[i:i + por_tanda]
            )
            w(f"insert into {tabla} ({', '.join(columnas)}) values {vals}\n"
              f"  on conflict ({conflicto}) do update set {actualiza};\n")

    # --- categorías
    cats = {}
    for p in productos:
        if p.get("categoria_subid") is not None:
            cats[p["categoria_subid"]] = p.get("categoria") or ("Sección %s" % p["categoria_subid"])
    w("-- categorías\n")
    lote("catalogo.categoria", ["subid", "nombre", "slug", "orden"],
         [(sid, nom, babosa(nom), sid) for sid, nom in sorted(cats.items())],
         "subid", "nombre = excluded.nombre, slug = excluded.slug")

    # --- productos. Los huérfanos entran ocultos: están desactivados en la
    # tienda. `visible`, `agotado` y `archivado` no se actualizan al recargar,
    # para no pisar lo que el equipo haya cambiado desde el panel.
    w("\n-- productos\n")
    lote("catalogo.producto",
         ["id", "slug", "nombre", "descripcion", "subid", "precio", "precio_antes",
          "marca", "visible", "editado_por"],
         [(p["id_original"], "%s-%s" % (p["id_original"], babosa(p["nombre"])), p["nombre"],
           (p.get("descripcion") or "").strip(), p.get("categoria_subid"),
           p.get("precio_base"), p.get("precio_oferta"), p.get("marca"),
           p.get("origen") != "barrido", "carga-inicial") for p in productos],
         "id",
         "slug = excluded.slug, nombre = excluded.nombre, descripcion = excluded.descripcion, "
         "subid = excluded.subid, precio = excluded.precio, "
         "precio_antes = excluded.precio_antes, marca = excluded.marca")

    # --- colores
    w("\n-- colores\n")
    lote("catalogo.color", ["id", "producto_id", "nombre", "precio", "orden"],
         [(c["id_color"], p["id_original"], c.get("nombre") or "Único", c.get("precio"), orden)
          for p in productos
          for orden, c in enumerate(p.get("colores") or [])
          if c.get("id_color") is not None],
         "id", "producto_id = excluded.producto_id, nombre = excluded.nombre, "
               "precio = excluded.precio, orden = excluded.orden")

    # --- tallas
    w("\n-- tallas\n")
    lote("catalogo.talla", ["color_id", "nombre", "orden"],
         [(c["id_color"], t.get("nombre"), orden)
          for p in productos
          for c in (p.get("colores") or []) if c.get("id_color") is not None
          for orden, t in enumerate(c.get("tallas") or [])],
         "color_id, nombre", "orden = excluded.orden")

    # --- imágenes de la extracción. Las que suba el equipo (fuente='subida')
    # no se tocan: solo se reemplazan las que vienen del scraping.
    w("\n-- imágenes\n")
    w("delete from catalogo.imagen where fuente = 'extraccion';\n")
    filas_img = []
    for p in productos:
        pid, vistos, orden = p["id_original"], set(), 0
        for u in p.get("imagenes_ficha") or []:
            h = hash_de(u)
            if h and h not in vistos:
                vistos.add(h)
                filas_img.append((pid, None, h, "extraccion", orden))
                orden += 1
        for c in p.get("colores") or []:
            if c.get("id_color") is None:
                continue
            for u in c.get("imagenes") or []:
                h = hash_de(u)
                if h:
                    filas_img.append((pid, c["id_color"], h, "extraccion", orden))
                    orden += 1
    for i in range(0, len(filas_img), 800):
        vals = ", ".join(
            "(" + ", ".join(lit(v) for v in f) + ")" for f in filas_img[i:i + 800]
        )
        w("insert into catalogo.imagen (producto_id, color_id, hash, fuente, orden) "
          f"values {vals};\n")

    w("\ncommit;\n")
    w("\n-- resumen\n")
    w("select (select count(*) from catalogo.categoria) as categorias,\n"
      "       (select count(*) from catalogo.producto) as productos,\n"
      "       (select count(*) from catalogo.producto where visible) as visibles,\n"
      "       (select count(*) from catalogo.color) as colores,\n"
      "       (select count(*) from catalogo.talla) as tallas,\n"
      "       (select count(*) from catalogo.imagen) as imagenes;\n")


if __name__ == "__main__":
    main()
