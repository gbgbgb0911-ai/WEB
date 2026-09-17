#!/usr/bin/env python3
"""EUCHEL — Tarea 4: reporte de auditoría.

    python3 reporte.py [--data data]

Lee lo que dejaron las tareas 1-3 y escribe data/reporte.md. No hace red.
Si falta un insumo (p. ej. imágenes todavía no corridas), lo dice en el
reporte en lugar de inventar el dato.
"""

from __future__ import annotations

import argparse
import json
import statistics
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

REF = Path(__file__).resolve().parent / "referencia" / "productos_752_corregidos.json"


def leer(path: Path, def_=None):
    try:
        return json.loads(path.read_text("utf-8"))
    except Exception:
        return def_


def mb(n):
    return f"{n / 1_048_576:.1f} MB" if isinstance(n, (int, float)) else "n/d"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data")
    args = ap.parse_args()
    raiz = Path(args.data).resolve()

    productos = leer(raiz / "productos_completo.json", [])
    if not productos:
        raise SystemExit(f"No hay {raiz}/productos_completo.json. Corre euchel_scrape.py.")
    ids_enc = leer(raiz / "ids_encontrados.json", {})
    ids_inv = leer(raiz / "ids_invalidos.json", {})
    img = leer(raiz / "imagenes_resumen.json", {})
    meta = leer(raiz / "run_meta.json", {})
    errores_prod = leer(raiz / "errores_productos.json", [])
    previos = leer(REF, [])

    L = []
    w = L.append
    w("# Reporte de auditoría — extracción EUCHEL")
    w("")
    w(f"Generado: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}  ")
    w(f"Fuente: https://euchelperu.com — extracción autorizada por los dueños  ")
    w(f"Corrida: {meta.get('peticiones_http', 'n/d')} peticiones HTTP, "
      f"1 concurrente, pausa {meta.get('pausa_segundos', 'n/d')} s, "
      f"{meta.get('segundos', 'n/d')} s totales")
    w("")

    # ---- IDs
    probados = ids_inv.get("corte_barrido")
    w("## 1. IDs")
    w("")
    w("| Métrica | Valor |")
    w("|---|---|")
    w(f"| IDs probados en el barrido | {probados if probados else 'barrido no ejecutado'} |")
    w(f"| IDs válidos (producto con `h1.nmbpro`) | {ids_enc.get('total', len(productos))} |")
    w(f"| IDs inválidos (404 o ficha vacía) | {ids_inv.get('total', 'n/d')} |")
    w(f"| Productos extraídos con éxito | {len(productos)} |")
    w(f"| Productos que fallaron la extracción | {len(errores_prod)} |")
    w(f"| Solo en categorías | {ids_enc.get('solo_categoria', 'n/d')} |")
    w(f"| Solo por barrido (huérfanos) | {ids_enc.get('solo_barrido', 'n/d')} |")
    w(f"| En ambas fuentes | {ids_enc.get('ambos', 'n/d')} |")
    w("")
    if productos:
        ids = [p["id_original"] for p in productos]
        w(f"Rango de IDs válidos: {min(ids)} – {max(ids)}.")
        w("")

    # ---- Categorías
    w("## 2. Productos por categoría")
    w("")
    por_cat = Counter((p.get("categoria") or "(sin categoría)") for p in productos)
    w("| Categoría | subid | Productos |")
    w("|---|---|---|")
    subids = {}
    for p in productos:
        if p.get("categoria"):
            subids[p["categoria"]] = p.get("categoria_subid")
    for cat, n in sorted(por_cat.items(), key=lambda x: -x[1]):
        w(f"| {cat} | {subids.get(cat, '—')} | {n} |")
    w(f"| **Total** | | **{len(productos)}** |")
    w("")

    # ---- Huérfanos
    w("## 3. Productos huérfanos (solo hallados por barrido)")
    w("")
    huerf = [p for p in productos if p.get("origen") == "barrido"]
    if not huerf:
        w("Ninguno. Todos los productos válidos aparecen en alguna categoría, "
          "`nuevo.php` u `ofertas.php`.")
    else:
        w(f"{len(huerf)} productos existen en `producto.php?id=` pero no se listan en "
          "ninguna categoría. Probablemente están ocultos a propósito: **confirmar con "
          "los dueños antes de migrarlos.**")
        w("")
        w("| ID | Nombre | Categoría en breadcrumb | Precio |")
        w("|---|---|---|---|")
        for p in huerf:
            w(f"| {p['id_original']} | {p['nombre']} | {p.get('categoria') or '—'} "
              f"| {p.get('precio_base') if p.get('precio_base') is not None else '—'} |")
    w("")

    # ---- Huecos de datos
    sin_desc = [p for p in productos if not (p.get("descripcion") or "").strip()]
    sin_img = [p for p in productos if not (
        p.get("imagenes_ficha") or any(c.get("imagenes") for c in p.get("colores", [])))]
    sin_color_select = [p for p in productos
                        if len(p.get("colores", [])) == 1
                        and p["colores"][0].get("id_color") is None]
    sin_tallas = [p for p in productos
                  if not any(c.get("tallas") for c in p.get("colores", []))]
    con_oferta = [p for p in productos if p.get("precio_oferta") is not None]
    sin_precio = [p for p in productos if p.get("precio_base") is None]

    w("## 4. Huecos de datos")
    w("")
    w("| Hueco | Productos | % |")
    w("|---|---|---|")
    tot = len(productos)
    for etiqueta, grupo in [
        ("Sin descripción", sin_desc),
        ("Sin ninguna imagen", sin_img),
        ("Sin selector de color (tratados como color único)", sin_color_select),
        ("Sin ninguna talla", sin_tallas),
        ("Sin precio", sin_precio),
        ("Con precio de oferta", con_oferta),
    ]:
        w(f"| {etiqueta} | {len(grupo)} | {100 * len(grupo) / tot:.1f}% |")
    w("")
    if sin_img:
        w("IDs sin imagen: " + ", ".join(str(p["id_original"]) for p in sin_img[:80])
          + (" …" if len(sin_img) > 80 else ""))
        w("")
    if sin_desc:
        w(f"IDs sin descripción ({len(sin_desc)}): "
          + ", ".join(str(p["id_original"]) for p in sin_desc[:80])
          + (" …" if len(sin_desc) > 80 else ""))
        w("")

    # ---- Precios
    w("## 5. Precios")
    w("")
    precios = [p["precio_base"] for p in productos if p.get("precio_base") is not None]
    if precios:
        w("| Métrica | S/ |")
        w("|---|---|")
        w(f"| Mínimo | {min(precios):.2f} |")
        w(f"| Máximo | {max(precios):.2f} |")
        w(f"| Promedio | {statistics.mean(precios):.2f} |")
        w(f"| Mediana | {statistics.median(precios):.2f} |")
        w("")
    disc = [p for p in productos
            if any(c.get("precio") is not None and p.get("precio_base") is not None
                   and abs(c["precio"] - p["precio_base"]) > 0.001
                   for c in p.get("colores", []))]
    w(f"Productos donde el precio AJAX de algún color difiere del precio base: {len(disc)}.")
    if disc:
        w("Estos requieren decisión de negocio: el catálogo nuevo debe guardar el precio "
          "por color, no uno solo por producto.")
        w("")
        w("| ID | Nombre | Precio base | Precios por color |")
        w("|---|---|---|---|")
        for p in disc[:40]:
            detalle = ", ".join(f"{c['nombre']}={c['precio']}" for c in p["colores"])
            w(f"| {p['id_original']} | {p['nombre']} | {p['precio_base']} | {detalle} |")
    w("")
    w("Nota de mapeo: en las tarjetas de listado, `.normal` es el precio vigente y "
      "`.oferta` el precio anterior tachado. Se guardó `precio_base` = `.normal` y "
      "`precio_oferta` = `.oferta` según lo pedido; **confirmar con los dueños** que esa "
      "es la semántica deseada en el catálogo nuevo, porque el valor de `precio_oferta` "
      "es el precio ANTES del descuento, no el rebajado.")
    w("")

    # ---- Colores y tallas
    w("## 6. Colores y tallas")
    w("")
    colores = Counter()
    tallas = Counter()
    for p in productos:
        for c in p.get("colores", []):
            if c.get("nombre"):
                colores[c["nombre"].strip()] += 1
            for t in c.get("tallas", []):
                if t.get("nombre"):
                    tallas[str(t["nombre"]).strip()] += 1
    w(f"Colores únicos (por nombre, sin normalizar mayúsculas): **{len(colores)}**  ")
    w(f"Tallas únicas: **{len(tallas)}**")
    w("")
    w("### Tallas encontradas (valor — nº de variantes)")
    w("")
    w(", ".join(f"`{k}` ({v})" for k, v in tallas.most_common()) or "ninguna")
    w("")
    w("### Colores encontrados (valor — nº de productos)")
    w("")
    top = colores.most_common(60)
    w(", ".join(f"`{k}` ({v})" for k, v in top) or "ninguno")
    if len(colores) > len(top):
        w("")
        w(f"… y {len(colores) - len(top)} más. Lista completa de colores y tallas en "
          "`valores_unicos.json`.")
    w("")
    (raiz / "valores_unicos.json").write_text(json.dumps(
        {"colores": dict(colores.most_common()), "tallas": dict(tallas.most_common())},
        ensure_ascii=False, indent=2), encoding="utf-8")
    normal = defaultdict(set)
    for k in colores:
        normal[k.strip().lower()].add(k)
    dup = {k: sorted(v) for k, v in normal.items() if len(v) > 1}
    if dup:
        w("Variantes del mismo color escritas de distinta forma (hay que normalizar al "
          "migrar):")
        w("")
        for k, v in sorted(dup.items()):
            w(f"- `{k}` → {', '.join(repr(x) for x in v)}")
        w("")

    # ---- Imágenes
    w("## 7. Imágenes")
    w("")
    if img.get("resumen"):
        r = img["resumen"]
        w("| Métrica | Valor |")
        w("|---|---|")
        w(f"| URLs únicas | {r.get('urls_unicas')} |")
        w(f"| Descargadas y convertidas | {r.get('convertidas')} |")
        w(f"| Fallidas | {r.get('fallidas')} |")
        w(f"| Peso original | {mb(r.get('bytes_originales'))} |")
        w(f"| Peso WebP (thumb 500 + full 1400, q{r.get('calidad_webp')}) "
          f"| {mb(r.get('bytes_webp'))} |")
        w(f"| Ahorro | {r.get('ahorro_pct')}% |")
        w("")
        if img.get("fallidas"):
            w("Fallidas:")
            w("")
            for f in img["fallidas"][:50]:
                w(f"- `{f['url']}` — {f['motivo']}")
            w("")
    else:
        w("Tarea 3 no ejecutada todavía (falta `imagenes_resumen.json`). "
          "Correr `node imagenes.mjs`.")
        urls = {u for p in productos for u in (p.get("imagenes_ficha") or [])}
        urls |= {u for p in productos for c in p.get("colores", [])
                 for u in (c.get("imagenes") or [])}
        w("")
        w(f"URLs de imagen únicas ya identificadas en el JSON: **{len(urls)}**.")
    w("")
    w("Las tres variantes del sitio (`data-tiny`, `data-small`, `data-large`) apuntan al "
      "mismo archivo: solo existe una resolución por imagen.")
    w("")

    # ---- Diff contra la extracción previa
    w("## 8. Diferencia contra la extracción previa (752 productos)")
    w("")
    if not previos:
        w("No se encontró `referencia/productos_752_corregidos.json`.")
    else:
        ids_prev = {p["id_original"] for p in previos}
        ids_now = {p["id_original"] for p in productos}
        nuevos = sorted(ids_now - ids_prev)
        idos = sorted(ids_prev - ids_now)
        prev_por_id = {p["id_original"]: p for p in previos}
        w("| Métrica | Valor |")
        w("|---|---|")
        w(f"| Productos en la extracción previa | {len(ids_prev)} |")
        w(f"| Productos en esta extracción | {len(ids_now)} |")
        w(f"| IDs nuevos | {len(nuevos)} |")
        w(f"| IDs que ya no aparecen | {len(idos)} |")
        w("")
        if nuevos:
            w("IDs nuevos: " + ", ".join(map(str, nuevos)))
            w("")
        if idos:
            w("IDs desaparecidos (retirados del catálogo, o fallo de esta corrida — "
              "cruzar con `errores_productos.json`):")
            w("")
            w("| ID | Nombre en la extracción previa |")
            w("|---|---|")
            for i in idos:
                w(f"| {i} | {prev_por_id[i].get('nombre', '—')} |")
            w("")
        cambios = []
        for i in sorted(ids_now & ids_prev):
            a = prev_por_id[i]
            b = next(p for p in productos if p["id_original"] == i)
            if a.get("precio") is not None and b.get("precio_base") is not None \
                    and abs(a["precio"] - b["precio_base"]) > 0.001:
                cambios.append((i, b["nombre"], a["precio"], b["precio_base"]))
        w(f"Productos con precio distinto al de la extracción previa: {len(cambios)}.")
        if cambios:
            w("")
            w("| ID | Nombre | Antes S/ | Ahora S/ |")
            w("|---|---|---|---|")
            for i, n, x, y in cambios[:60]:
                w(f"| {i} | {n} | {x:.2f} | {y:.2f} |")
            if len(cambios) > 60:
                w(f"\n… y {len(cambios) - 60} más.")
        w("")
        sin_desc_prev = sum(1 for p in previos if not (p.get("descripcion") or "").strip())
        w(f"Sin descripción: {sin_desc_prev} antes → {len(sin_desc)} ahora.")
        w("")

    # ---- Lo que no existe en la web
    w("## 9. Campos que NO existen en la web — hay que pedirlos a los dueños")
    w("")
    w("| Campo | Estado | Por qué |")
    w("|---|---|---|")
    w("| Stock numérico | `null` en todos | No hay cantidad pública. El `max=\"5\"` del "
      "input de cantidad es un límite del formulario, no stock. |")
    w("| Agotado / disponibilidad real | `null` en todos | `product:availability` dice "
      "`in stock` en el 100% de las fichas, también en productos que podrían estar "
      "agotados. Dato inútil: ignorado. |")
    w("| SKU real | `null` | Solo existe `product:retailer_item_id` (p. ej. "
      "`1102SUP53656`), que es un identificador de retailer, no necesariamente el SKU "
      "interno. Se guarda aparte, sin presumir equivalencia. |")
    w(f"| Descripciones faltantes | {len(sin_desc)} productos | La ficha trae "
      "`div.tit_desc` vacío. Hay que redactarlas o pedirlas. |")
    w("| Peso / medidas / material / guía de tallas | no existe | Ningún campo público. |")
    w("| Costo, margen, proveedor | no existe | Datos internos, nunca públicos. |")
    w("| Orden de catálogo / destacados | parcial | Se puede inferir del orden de las "
      "tarjetas en cada categoría, no hay campo explícito. |")
    w("")
    w("## 10. Archivos generados")
    w("")
    for nombre, desc in [
        ("productos_completo.json", "catálogo completo, un objeto por producto"),
        ("productos_completo.csv", "el mismo catálogo, una fila por producto"),
        ("variantes_completo.csv", "una fila por color × talla, para cargar el catálogo nuevo"),
        ("ids_encontrados.json", "todos los IDs válidos con su origen"),
        ("ids_invalidos.json", "IDs probados que dieron 404 o ficha vacía"),
        ("imagenes_map.json", "URL original → archivos locales → producto y color"),
        ("imagenes_resumen.json", "totales de imágenes y pesos"),
        ("progress.json", "estado de reanudación"),
        ("errores.json / errores_productos.json", "fallos de red y de extracción"),
        ("html/", "cada respuesta HTML cruda, tal como llegó"),
        ("robots.txt", "robots.txt del sitio al momento de la corrida"),
        ("run_meta.json", "metadatos de la corrida (peticiones, tiempos, user-agent)"),
    ]:
        existe = "✓" if (raiz / nombre.split(" /")[0].split("/")[0]).exists() else "—"
        w(f"- {existe} `{nombre}` — {desc}")
    w("")

    destino = raiz / "reporte.md"
    destino.write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"Escrito {destino} ({len(L)} líneas)")


if __name__ == "__main__":
    main()
