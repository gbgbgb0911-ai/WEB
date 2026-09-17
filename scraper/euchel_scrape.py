#!/usr/bin/env python3
"""EUCHEL — Tareas 1 y 2: descubrimiento de IDs + extracción por producto.

Cliente autorizado (dueños de euchelperu.com). Reglas duras del encargo:
  - 1 request concurrente, pausa de 500 ms DESPUÉS de cada respuesta.
  - Reanudable. Todo el HTML crudo queda en disco.
  - 3 reintentos con backoff exponencial. Timeout 45 s.
  - Ante 429 / 403 / 5xx: DETENERSE y avisar. No insistir.
  - Nunca se tocan sesion/compra/busqueda/libroreclamaciones/ll-admin.
  - Nunca se envían POST.

Uso:
    python3 euchel_scrape.py --prueba              # smoke test: 25 28 1102 113 1367
    python3 euchel_scrape.py --ids 25,1102         # IDs concretos
    python3 euchel_scrape.py                       # corrida completa
    python3 euchel_scrape.py --sin-barrido         # solo lo listado en categorías
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

sys.path.insert(0, str(Path(__file__).resolve().parent))
from minidom import parse  # noqa: E402

BASE = "https://euchelperu.com/"
UA = ("EuchelCatalogMigration/1.0 (extraccion autorizada por los duenos de la tienda; "
      "1 request concurrente, 500ms de pausa)")
PAUSA = 0.5
TIMEOUT = 45
REINTENTOS = 3
CATEGORIAS = range(2, 23)
BARRIDO_INICIAL = 1500
BARRIDO_PASO = 100
BARRIDO_CORTE = 50          # IDs inválidos consecutivos para cerrar el barrido
BARRIDO_TOPE = 5000         # tope de seguridad

PROHIBIDO = re.compile(r"(sesion|compra|busqueda|libroreclamaciones|ll-admin)", re.I)


class Detener(Exception):
    """El servidor pidió parar (429/403/5xx). No se insiste."""


# --------------------------------------------------------------------------- red

class Cliente:
    def __init__(self, dirs, verbose=True):
        self.dirs = dirs
        self.verbose = verbose
        self.peticiones = 0
        self.desde_cache = 0
        self.errores = []

    def _nombre_cache(self, url: str) -> Path:
        rel = url[len(BASE):] if url.startswith(BASE) else url
        # Solo caracteres seguros en cualquier SO (Windows prohíbe ? y &).
        rel = re.sub(r"[^A-Za-z0-9_.-]+", "_", rel) or "index"
        if not rel.endswith((".html", ".txt")):
            rel += ".html"
        return self.dirs["html"] / rel

    def get(self, url: str, cache=True, permitir_404=False):
        """Devuelve (status, texto). Usa caché en disco si existe."""
        if PROHIBIDO.search(url):
            raise ValueError(f"URL prohibida por el encargo: {url}")

        destino = self._nombre_cache(url)
        if cache and destino.exists():
            self.desde_cache += 1
            return 200, destino.read_text("utf-8", "replace")

        espera = 2
        for intento in range(1, REINTENTOS + 1):
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": UA, "Accept": "text/html,*/*"}, method="GET")
                with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                    cuerpo = r.read()
                    status = r.status
                self.peticiones += 1
                time.sleep(PAUSA)
                texto = cuerpo.decode("utf-8", "replace")
                if cache:
                    destino.parent.mkdir(parents=True, exist_ok=True)
                    destino.write_text(texto, encoding="utf-8")
                return status, texto

            except urllib.error.HTTPError as e:
                self.peticiones += 1
                time.sleep(PAUSA)
                if e.code == 404 and permitir_404:
                    return 404, ""
                if e.code in (403, 429) or e.code >= 500:
                    raise Detener(f"HTTP {e.code} en {url}")
                self._anotar(url, f"HTTP {e.code}", intento)
                if e.code < 500 and e.code != 408:
                    return e.code, ""
            except Exception as e:  # timeout, DNS, TLS, reset
                self._anotar(url, f"{type(e).__name__}: {e}", intento)

            if intento < REINTENTOS:
                time.sleep(espera)
                espera *= 2

        return 0, ""

    def _anotar(self, url, detalle, intento):
        self.errores.append({
            "url": url, "detalle": detalle, "intento": intento,
            "ts": ahora(),
        })
        if self.verbose:
            print(f"  WARN intento {intento}/{REINTENTOS} {url} — {detalle}", flush=True)


def ahora() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ------------------------------------------------------------------------ parsers

RE_PRECIO = re.compile(r"(\d+(?:[.,]\d{1,2})?)")


def a_float(txt: str):
    if not txt:
        return None
    m = RE_PRECIO.search(txt.replace(",", "."))
    return float(m.group(1)) if m else None


def metas(dom):
    out = {}
    for m in dom.find_all(tag="meta"):
        clave = m.get("property") or m.get("name")
        if clave:
            out.setdefault(clave, m.get("content", ""))
    return out


def imagenes_de(nodo, url_base):
    """`div.image-data`: <img src> + <div class=data data-large>. Orden preservado."""
    urls, vistas = [], set()
    for cont in nodo.find_all(tag="div", cls="image-data") or [nodo]:
        for hijo in cont.find_all():
            crudo = ""
            if hijo.tag == "img":
                crudo = hijo.get("src")
            elif "data" in hijo.classes:
                crudo = hijo.get("data-large") or hijo.get("data-small") or hijo.get("data-tiny")
            if not crudo or "images/productos" not in crudo:
                continue
            full = urljoin(url_base, crudo)
            if full not in vistas:
                vistas.add(full)
                urls.append(full)
    return urls


def parse_ficha(id_prod: int, html: str) -> dict | None:
    dom = parse(html)
    h1 = dom.find(tag="h1", cls="nmbpro")
    nombre = h1.text() if h1 else ""
    if not nombre:
        return None

    meta = metas(dom)

    categoria, subid = None, None
    retorno = dom.find(tag="div", cls="retorno")
    if retorno:
        a = retorno.find(tag="a", attr=("href", "menu.php?subid="))
        if a:
            categoria = a.text() or None
            m = re.search(r"subid=(\d+)", a.get("href"))
            subid = int(m.group(1)) if m else None

    descripcion = ""
    info = dom.find(tag="div", cls="informacion")
    if info:
        tit = info.find(tag="div", cls="tit_desc")
        posterior, visto = [], False
        for hijo in info.children:
            if hijo is tit:
                visto = True
                continue
            if visto:
                posterior.append(hijo if isinstance(hijo, str) else hijo.text())
        descripcion = re.sub(r"\s+", " ", " ".join(posterior)).strip()

    colores = []
    sel = dom.find(tag="select", id="clickfoto")
    if sel:
        for op in sel.find_all(tag="option"):
            val = op.get("value").strip()
            if val.isdigit():
                colores.append({"id_color": int(val), "nombre": op.text() or None})

    return {
        "id_original": id_prod,
        "url_original": f"{BASE}producto.php?id={id_prod}",
        "nombre": nombre,
        "descripcion": descripcion,
        "categoria": categoria,
        "categoria_subid": subid,
        "precio_base": a_float(meta.get("product:price:amount")),
        "moneda": meta.get("product:price:currency") or "PEN",
        "precio_oferta": None,          # solo existe en la tarjeta del listado
        "retailer_item_id": meta.get("product:retailer_item_id") or None,
        "item_group_id": meta.get("product:item_group_id") or None,
        "marca": meta.get("product:brand") or None,
        "colores_select": colores,
        "imagenes_ficha": imagenes_de(dom, f"{BASE}producto.php?id={id_prod}"),
        "stock": None,                  # no existe públicamente
        "agotado": None,                # product:availability siempre "in stock"
    }


def parse_tallas(html: str) -> list:
    dom = parse(html)
    out, vistas = [], set()
    for sp in dom.find_all(tag="span", attr=("name", "spancolor")):
        idt = sp.get("id").strip()
        nombre = sp.text() or None
        clave = (idt, nombre)
        if clave in vistas:
            continue
        vistas.add(clave)
        out.append({"id_talla": int(idt) if idt.isdigit() else idt, "nombre": nombre})
    return out


def parse_precio(html: str):
    dom = parse(html)
    div = dom.find(tag="div", cls="precio")
    precio = a_float(div.text()) if div else None
    inp = dom.find(tag="input", attr=("name", "id_codigo"))
    confirmado = inp.get("value") if inp else None
    return precio, (int(confirmado) if (confirmado or "").isdigit() else None)


def parse_listado(html: str, url: str) -> list:
    """Tarjetas `div.producto` de menu.php / nuevo.php / ofertas.php."""
    dom = parse(html)
    fichas = []
    for card in dom.find_all(tag="div", cls="producto"):
        enlace = None
        nombre_div = card.find(tag="div", cls="nombre")
        if nombre_div:
            enlace = nombre_div.find(tag="a", attr=("href", "producto.php?id="))
        if enlace is None:
            enlace = card.find(tag="a", attr=("href", "producto.php?id="))
        if enlace is None:
            continue
        m = re.search(r"id=(\d+)", enlace.get("href"))
        if not m:
            continue
        precio_div = card.find(tag="div", cls="precio")
        normal = oferta = None
        if precio_div:
            n = precio_div.find(tag="div", cls="normal")
            o = precio_div.find(tag="div", cls="oferta")
            normal = a_float(n.text()) if n else None
            oferta = a_float(o.text()) if o else None
        img = card.find(tag="img")
        fichas.append({
            "id": int(m.group(1)),
            "nombre_listado": enlace.text() or None,
            "precio_listado_normal": normal,
            "precio_listado_oferta": oferta,
            "imagen_listado": urljoin(url, img.get("src")) if img and img.get("src") else None,
        })
    return fichas


# --------------------------------------------------------------------- tarea 1

def descubrir(cli, dirs, hacer_barrido=True, tope_inicial=BARRIDO_INICIAL, refrescar_listados=True):
    print("TAREA 1 — descubrimiento de IDs")
    listados = {}
    por_categoria = {}

    paginas = [(f"{BASE}menu.php?subid={n}", f"categoria:{n}") for n in CATEGORIAS]
    paginas += [(f"{BASE}nuevo.php", "nuevo"), (f"{BASE}ofertas.php", "ofertas")]

    for url, etiqueta in paginas:
        status, html = cli.get(url, cache=not refrescar_listados)
        if status != 200 or not html:
            print(f"  {etiqueta}: sin respuesta utilizable (status {status})")
            por_categoria[etiqueta] = []
            continue
        fichas = parse_listado(html, url)
        por_categoria[etiqueta] = [f["id"] for f in fichas]
        for f in fichas:
            prev = listados.get(f["id"])
            if prev is None:
                listados[f["id"]] = dict(f, fuentes=[etiqueta])
            else:
                prev["fuentes"].append(etiqueta)
                # La tarjeta con oferta manda: es la que trae los dos precios.
                if prev.get("precio_listado_oferta") is None and f["precio_listado_oferta"]:
                    prev["precio_listado_normal"] = f["precio_listado_normal"]
                    prev["precio_listado_oferta"] = f["precio_listado_oferta"]
        print(f"  {etiqueta}: {len(fichas)} tarjetas", flush=True)

    ids_categoria = set(listados)
    print(f"  total por listados: {len(ids_categoria)} IDs únicos")

    validos_barrido, invalidos = set(), []
    if hacer_barrido:
        print(f"TAREA 1b — barrido de IDs 1..{tope_inicial} (se extiende hasta "
              f"{BARRIDO_CORTE} inválidos consecutivos)")
        consecutivos, tope, n = 0, tope_inicial, 0
        while n < tope and n < BARRIDO_TOPE:
            n += 1
            url = f"{BASE}producto.php?id={n}"
            status, html = cli.get(url, permitir_404=True)
            ok = status == 200 and bool(html) and bool(
                re.search(r"class=['\"][^'\"]*nmbpro", html))
            if ok:
                validos_barrido.add(n)
                consecutivos = 0
            else:
                invalidos.append({"id": n, "status": status})
                consecutivos += 1
            if n % 100 == 0:
                print(f"  barrido {n}/{tope} — válidos {len(validos_barrido)}, "
                      f"inválidos {len(invalidos)}, racha {consecutivos}", flush=True)
            if n == tope and consecutivos < BARRIDO_CORTE and tope < BARRIDO_TOPE:
                tope = min(tope + BARRIDO_PASO, BARRIDO_TOPE)
                print(f"  racha de inválidos = {consecutivos} < {BARRIDO_CORTE}: "
                      f"extiendo barrido a {tope}", flush=True)
        escribir_json(dirs["data"] / "ids_invalidos.json", {
            "total": len(invalidos), "corte_barrido": n, "detalle": invalidos})

    todos = sorted(ids_categoria | validos_barrido)
    detalle = []
    for i in todos:
        if i in ids_categoria and i in validos_barrido:
            origen = "ambos"
        elif i in ids_categoria:
            origen = "categoria"
        else:
            origen = "barrido"
        detalle.append({"id": i, "origen": origen,
                        "fuentes_listado": listados.get(i, {}).get("fuentes", [])})

    huerfanos = [d["id"] for d in detalle if d["origen"] == "barrido"]
    escribir_json(dirs["data"] / "ids_encontrados.json", {
        "generado": ahora(),
        "total": len(todos),
        "solo_categoria": sum(1 for d in detalle if d["origen"] == "categoria"),
        "solo_barrido": len(huerfanos),
        "ambos": sum(1 for d in detalle if d["origen"] == "ambos"),
        "barrido_ejecutado": hacer_barrido,
        "huerfanos": huerfanos,
        "por_categoria": por_categoria,
        "detalle": detalle,
    })
    escribir_json(dirs["data"] / "listados.json", listados)
    print(f"  IDs válidos totales: {len(todos)} (huérfanos: {len(huerfanos)})")
    return todos, listados, {d["id"]: d["origen"] for d in detalle}


# --------------------------------------------------------------------- tarea 2

def extraer_producto(cli, id_prod, listado, origen):
    status, html = cli.get(f"{BASE}producto.php?id={id_prod}", permitir_404=True)
    if status != 200 or not html:
        return None, f"status {status}"
    prod = parse_ficha(id_prod, html)
    if prod is None:
        return None, "h1.nmbpro vacío"

    prod["origen"] = origen
    if listado:
        prod["nombre_listado"] = listado.get("nombre_listado")
        prod["precio_listado_normal"] = listado.get("precio_listado_normal")
        prod["precio_listado_oferta"] = listado.get("precio_listado_oferta")
        # Mapeo pedido en la especificación: .normal -> precio, .oferta -> precio_oferta.
        if listado.get("precio_listado_normal") is not None:
            prod["precio_base"] = listado["precio_listado_normal"]
        prod["precio_oferta"] = listado.get("precio_listado_oferta")
    else:
        prod["nombre_listado"] = None
        prod["precio_listado_normal"] = None
        prod["precio_listado_oferta"] = None

    colores = []
    for c in prod.pop("colores_select"):
        idc = c["id_color"]
        _, h_tallas = cli.get(f"{BASE}genera_talla.php?id={idc}")
        _, h_precio = cli.get(f"{BASE}genera_precio.php?id={idc}&idprod={id_prod}")
        _, h_fotos = cli.get(f"{BASE}listar_foto2.php?id={idc}&idprod={id_prod}")
        precio, confirmado = parse_precio(h_precio) if h_precio else (None, None)
        colores.append({
            "id_color": idc,
            "nombre": c["nombre"],
            "precio": precio,
            "id_color_confirmado": confirmado,
            "tallas": parse_tallas(h_tallas) if h_tallas else [],
            "imagenes": imagenes_de(parse(h_fotos), BASE) if h_fotos else [],
        })

    if not colores:
        # Sin select de colores: color único, precio del meta, imágenes de la ficha.
        colores = [{
            "id_color": None,
            "nombre": "Único",
            "precio": prod["precio_base"],
            "id_color_confirmado": None,
            "tallas": [],
            "imagenes": list(prod["imagenes_ficha"]),
            "nota": "producto sin select#clickfoto; tratado como color único",
        }]

    prod["colores"] = colores
    prod["scraped_at"] = ahora()
    return prod, None


def correr(cli, dirs, ids, listados, origenes):
    hechos = {}
    for f in sorted(dirs["prod"].glob("*.json")):
        try:
            hechos[int(f.stem)] = json.loads(f.read_text("utf-8"))
        except Exception:
            f.unlink()
    if hechos:
        print(f"TAREA 2 — reanudando: {len(hechos)} productos ya en disco")
    else:
        print("TAREA 2 — extracción por producto")

    fallidos = []
    total = len(ids)
    for i, id_prod in enumerate(ids, 1):
        if id_prod in hechos:
            continue
        prod, error = extraer_producto(
            cli, id_prod, listados.get(id_prod), origenes.get(id_prod, "barrido"))
        if prod is None:
            fallidos.append({"id": id_prod, "motivo": error})
            print(f"[{i}/{total}] id={id_prod} FALLO — {error}", flush=True)
            continue
        (dirs["prod"] / f"{id_prod}.json").write_text(
            json.dumps(prod, ensure_ascii=False, indent=2), encoding="utf-8")
        hechos[id_prod] = prod
        n_img = len({u for c in prod["colores"] for u in c["imagenes"]} |
                    set(prod["imagenes_ficha"]))
        print(f"[{i}/{total}] id={id_prod} ok — {len(prod['colores'])} colores, "
              f"{n_img} imgs", flush=True)
        escribir_json(dirs["data"] / "progress.json", {
            "actualizado": ahora(), "hechos": len(hechos), "total": total,
            "pendientes": [x for x in ids if x not in hechos],
            "fallidos": fallidos,
        })

    if fallidos:
        escribir_json(dirs["data"] / "errores_productos.json", fallidos)
    return [hechos[i] for i in ids if i in hechos]


# ----------------------------------------------------------------------- salidas

def escribir_json(path: Path, datos):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")


CAMPOS = ["id_original", "nombre", "categoria", "categoria_subid", "precio_base",
          "precio_oferta", "moneda", "retailer_item_id", "item_group_id", "marca",
          "origen", "descripcion", "stock", "agotado", "colores", "tallas",
          "imagenes", "url_original", "scraped_at"]


def escribir_csv(productos, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=CAMPOS)
        w.writeheader()
        for p in productos:
            imgs = list(dict.fromkeys(
                [u for c in p["colores"] for u in c["imagenes"]] + p["imagenes_ficha"]))
            tallas = list(dict.fromkeys(
                str(t["nombre"]) for c in p["colores"] for t in c["tallas"]))
            fila = {k: p.get(k) for k in CAMPOS}
            fila["colores"] = " | ".join(
                f"{c['nombre']} ({c['id_color']})" for c in p["colores"])
            fila["tallas"] = " | ".join(tallas)
            fila["imagenes"] = " | ".join(imgs)
            w.writerow(fila)


def escribir_csv_variantes(productos, path: Path):
    """Una fila por color × talla. Forma directa para cargar el catálogo nuevo."""
    with path.open("w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerow(["id_original", "nombre", "categoria", "id_color", "color",
                    "id_talla", "talla", "precio_color", "precio_base",
                    "precio_oferta", "stock", "imagenes_color"])
        for p in productos:
            for c in p["colores"]:
                tallas = c["tallas"] or [{"id_talla": None, "nombre": None}]
                for t in tallas:
                    w.writerow([p["id_original"], p["nombre"], p["categoria"],
                                c["id_color"], c["nombre"], t["id_talla"], t["nombre"],
                                c["precio"], p["precio_base"], p["precio_oferta"],
                                "", " | ".join(c["imagenes"])])


# -------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data", help="directorio de salida (def: data)")
    ap.add_argument("--ids", help="lista de IDs separados por coma")
    ap.add_argument("--prueba", action="store_true",
                    help="smoke test con 25,28,1102,113,1367")
    ap.add_argument("--sin-barrido", action="store_true",
                    help="omite el barrido 1..N de la tarea 1")
    ap.add_argument("--tope-barrido", type=int, default=BARRIDO_INICIAL)
    args = ap.parse_args()

    raiz = Path(args.data).resolve()
    dirs = {"data": raiz, "html": raiz / "html", "prod": raiz / "productos"}
    for d in dirs.values():
        d.mkdir(parents=True, exist_ok=True)

    cli = Cliente(dirs)
    inicio = time.time()

    try:
        _, robots = cli.get(urljoin(BASE, "robots.txt"), cache=False)
        (raiz / "robots.txt").write_text(robots or "", encoding="utf-8")
        print(f"robots.txt guardado ({len(robots or '')} bytes)")

        if args.prueba or args.ids:
            ids = [25, 28, 1102, 113, 1367] if args.prueba else \
                  [int(x) for x in args.ids.split(",") if x.strip()]
            # Se recorren los listados para conocer precio_oferta de esos IDs.
            _, listados, origenes = descubrir(cli, dirs, hacer_barrido=False)
            productos = correr(cli, dirs, ids, listados,
                               {i: origenes.get(i, "barrido") for i in ids})
            salida = raiz / ("muestra_prueba.json" if args.prueba else "seleccion.json")
            escribir_json(salida, productos)
            print(f"\n{'='*70}\n{salida}\n{'='*70}")
            print(json.dumps(productos, ensure_ascii=False, indent=2))
        else:
            ids, listados, origenes = descubrir(
                cli, dirs, hacer_barrido=not args.sin_barrido,
                tope_inicial=args.tope_barrido)
            productos = correr(cli, dirs, ids, listados, origenes)
            escribir_json(raiz / "productos_completo.json", productos)
            escribir_csv(productos, raiz / "productos_completo.csv")
            escribir_csv_variantes(productos, raiz / "variantes_completo.csv")
            print(f"\nOK — {len(productos)} productos en {raiz}/productos_completo.json")

    except Detener as e:
        escribir_json(raiz / "errores.json", cli.errores)
        print(f"\n!!! DETENIDO: {e}", file=sys.stderr)
        print("El servidor respondió 403/429/5xx. No se insiste. "
              "El progreso quedó en disco: relanzar el mismo comando para continuar.",
              file=sys.stderr)
        sys.exit(2)
    except KeyboardInterrupt:
        escribir_json(raiz / "errores.json", cli.errores)
        print("\nInterrumpido. Progreso en disco.", file=sys.stderr)
        sys.exit(130)

    escribir_json(raiz / "errores.json", cli.errores)
    escribir_json(raiz / "run_meta.json", {
        "terminado": ahora(),
        "segundos": round(time.time() - inicio, 1),
        "peticiones_http": cli.peticiones,
        "respuestas_desde_cache": cli.desde_cache,
        "errores_reintentados": len(cli.errores),
        "user_agent": UA,
        "pausa_segundos": PAUSA,
        "concurrencia": 1,
    })
    print(f"peticiones HTTP: {cli.peticiones} | desde caché: {cli.desde_cache} | "
          f"{round(time.time() - inicio, 1)}s")


if __name__ == "__main__":
    main()
