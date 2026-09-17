#!/usr/bin/env python3
"""Tests offline de los parsers contra respuestas reales guardadas en fixtures/.

No hace red. `python3 test_parsers.py`
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from minidom import parse                                            # noqa: E402
from euchel_scrape import (parse_ficha, parse_listado, parse_precio,  # noqa: E402
                           parse_tallas, imagenes_de, BASE)

FX = Path(__file__).resolve().parent / "fixtures"
fallos = []


def ok(cond, etiqueta, visto=None):
    if cond:
        print(f"  ok   {etiqueta}")
    else:
        print(f"  FALLO {etiqueta} — visto: {visto!r}")
        fallos.append(etiqueta)


print("ficha producto.php?id=1102")
p = parse_ficha(1102, (FX / "producto.php__id_1102.html").read_text())
ok(p["nombre"] == "SUPLEX FLARE PANTS", "nombre", p["nombre"])
ok(p["categoria"] == "Pantalones" and p["categoria_subid"] == 6, "categoría", (p["categoria"], p["categoria_subid"]))
ok(p["precio_base"] == 55.0, "precio meta", p["precio_base"])
ok(p["retailer_item_id"] == "1102SUP53656", "retailer_item_id", p["retailer_item_id"])
ok(p["marca"] == "Basic 21 Perú", "marca", p["marca"])
ok(p["descripcion"] == "", "descripción vacía (esta ficha no tiene)", p["descripcion"])
ok([c["id_color"] for c in p["colores_select"]] == [3344, 3414, 3416], "ids de color", p["colores_select"])
ok([c["nombre"] for c in p["colores_select"]] == ["Marrón", "Negro", "ROJO"], "nombres de color")
ok(len(p["imagenes_ficha"]) == 3, "3 imágenes de ficha", p["imagenes_ficha"])
ok(p["stock"] is None and p["agotado"] is None, "stock/agotado en null")

print("listado menu.php?subid=6")
cards = parse_listado((FX / "menu.php__subid_6.html").read_text(),
                      f"{BASE}menu.php?subid=6")
ok(len(cards) == 50, "50 tarjetas (coincide con categorias.csv)", len(cards))
c1102 = next(c for c in cards if c["id"] == 1102)
ok(c1102["precio_listado_normal"] == 55.0, "precio .normal", c1102)
ok(c1102["precio_listado_oferta"] is None, "sin .oferta", c1102)
ok(c1102["nombre_listado"] == "SUPLEX FLARE PANTS", "nombre de tarjeta")
ok(all(c["imagen_listado"] and c["imagen_listado"].startswith("https://") for c in cards),
   "todas las tarjetas traen imagen absoluta")

print("genera_talla.php?id=3344")
tallas = parse_tallas((FX / "genera_talla.php__id_3344.html").read_text())
ok(tallas == [{"id_talla": 3708, "nombre": "Standar"}], "talla única", tallas)

print("genera_precio.php?id=3344&idprod=1102")
precio, conf = parse_precio((FX / "genera_precio.php__id_3344_idprod_1102.html").read_text())
ok(precio == 55.0, "precio del color", precio)
ok(conf == 3344, "id_codigo confirmado", conf)

print("listar_foto2.php?id=3344&idprod=1102")
imgs = imagenes_de(parse((FX / "listar_foto2.php__id_3344_idprod_1102.html").read_text()), BASE)
ok(len(imgs) == 3, "3 imágenes del color", imgs)
ok(imgs[0].endswith("177698613645708641868302.jpg"), "primera imagen y orden", imgs[0])
ok(all(i.startswith("https://euchelperu.com/images/productos/") for i in imgs), "URLs absolutas")

print("oferta sintética (.normal + .oferta)")
oferta = parse_listado(
    """<div class="productos"><div class="producto">
       <div class="imagen"><a href="producto.php?id=999"><img src="images/productos/x.jpg"></a></div>
       <div class="nombre"><a href="producto.php?id=999">CON OFERTA</a></div>
       <div class="precio"><div class='normal'>S/ 39.00</div><div class='oferta'>S/ 79.00</div></div>
       </div></div>""", f"{BASE}ofertas.php")
ok(oferta[0]["precio_listado_normal"] == 39.0 and oferta[0]["precio_listado_oferta"] == 79.0,
   "mapeo .normal/.oferta", oferta[0])

print("descripción sintética (texto tras div.tit_desc dentro de div.informacion)")
d = parse_ficha(28, """<html><body>
  <div class="retorno"><ul><li><a href="menu.php?subid=6">Pantalones</a></li></ul></div>
  <h1 class="nmbpro">Pantalón Jean Wide Leg Vintage</h1>
  <meta property="product:price:amount" content="95.00">
  <div class="informacion">
     <div class="tit_desc">Descripción:</div>
     <p>Este pantalón jean ofrece comodidad,</p> libertad de movimiento
     <span>y un estilo retro moderno.</span>
     <script>no_debe_salir()</script>
  </div></body></html>""")
ok(d["descripcion"] == "Este pantalón jean ofrece comodidad, libertad de movimiento "
   "y un estilo retro moderno.", "descripción con markup anidado", d["descripcion"])
ok("no_debe_salir" not in d["descripcion"], "el <script> no entra en la descripción")

print("ficha inválida (sin h1.nmbpro)")
ok(parse_ficha(1, "<html><body>404</body></html>") is None, "devuelve None")

print()
if fallos:
    print(f"{len(fallos)} FALLOS: {fallos}")
    sys.exit(1)
print("todos los tests pasan")
