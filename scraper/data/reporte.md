# Reporte de auditoría — extracción EUCHEL

Generado: 2026-09-18 01:55 UTC  
Fuente: https://euchelperu.com — extracción autorizada por los dueños  
Corrida: 62 peticiones HTTP, 1 concurrente, pausa 0.5 s, 341.3 s totales

## 1. IDs

| Métrica | Valor |
|---|---|
| IDs probados en el barrido | 1500 |
| IDs válidos (producto con `h1.nmbpro`) | 962 |
| IDs inválidos (404 o ficha vacía) | 538 |
| Productos extraídos con éxito | 467 |
| Productos que fallaron la extracción | 0 |
| Solo en categorías | 0 |
| Solo por barrido (huérfanos) | 210 |
| En ambas fuentes | 752 |

Rango de IDs válidos: 9 – 1367.

## 2. Productos por categoría

| Categoría | subid | Productos |
|---|---|---|
| Vestidos | 8 | 94 |
| Tops | 3 | 76 |
| Carteras | 12 | 53 |
| Pantalones | 6 | 36 |
| BIKINIS | 21 | 33 |
| Perfumes | 17 | 26 |
| Set | 10 | 23 |
| Accesorios | 19 | 20 |
| Cuidado personal | 15 | 18 |
| Faldas | 7 | 16 |
| Chaquetas | 9 | 10 |
| Complementos | 11 | 10 |
| Billeteras | 13 | 9 |
| Correas | 14 | 8 |
| Blusas | 18 | 8 |
| Shorts | 20 | 8 |
| Calzado | 22 | 7 |
| Sweaters | 4 | 6 |
| Abrigos | 2 | 3 |
| Poleras | 5 | 2 |
| Enterizos | 16 | 1 |
| **Total** | | **467** |

## 3. Productos huérfanos (solo hallados por barrido)

174 productos existen en `producto.php?id=` pero no se listan en ninguna categoría.

**Verificado en el panel de administración: están DESACTIVADOS.** Se comprobó el ID 9 (`Flare Pants Chompero`) en `ll-admin`: punto rojo y botón `Activar`, frente al punto verde y `Desactivar` de los productos vivos. Su ruta es `Productos/Pantalones`, el mismo menú que el resto, así que no son de otra tienda: los dueños los apagaron.

Encaja con lo observado: un producto desactivado desaparece de `menu.php?subid=`, pero `producto.php?id=` sigue sirviendo la ficha completa. De ahí que solo los encuentre el barrido.

**Recomendación: migrarlos marcados como inactivos**, no como productos vivos ni descartarlos. Ya están extraídos, conservarlos no cuesta nada, y así los dueños pueden reactivar lo que quieran sin volver a extraer. La decisión de cuáles revivir es de ellos.

| ID | Nombre | Categoría en breadcrumb | Precio |
|---|---|---|---|
| 9 | Flare Pants Chompero | Pantalones | 50.0 |
| 16 | Top Karol | Tops | 35.0 |
| 22 | Chompa Qata manga larga | Tops | 29.0 |
| 24 | Pantalón Jean Baggy | Pantalones | 95.0 |
| 40 | Pantalón Sastre Franja | Pantalones | 75.0 |
| 41 | Palazzo Pinzas Loma | Pantalones | — |
| 42 | Pantalón Klein Box | Pantalones | 85.0 |
| 43 | Pantalón sastre con correa | Pantalones | 85.0 |
| 46 | Flare polar Valeria | Pantalones | 65.0 |
| 47 | Flare Lady | Pantalones | 29.0 |
| 48 | Jass Buzo | Pantalones | 50.0 |
| 52 | Falda Larga Basic | Faldas | 35.0 |
| 53 | Vestido Cafarena | Vestidos | 55.0 |
| 55 | Vestido Tropical | Vestidos | 59.0 |
| 56 | Vestido Tarzán Tul | Vestidos | 49.0 |
| 57 | Vestido Anna | Vestidos | 35.0 |
| 58 | Vestido Amanecer | Vestidos | 59.0 |
| 59 | Vestido Pliegue Arcoíris | Vestidos | 49.0 |
| 69 | Vestido Jazmin Aro | Vestidos | 75.0 |
| 73 | Vestido Artemi Push Up | Vestidos | 69.0 |
| 74 | Vestido Cuello Corrugado | Vestidos | 69.0 |
| 75 | Vestido Manga Larga Espalda | Vestidos | 75.0 |
| 76 | Borda Vestido Escote | Vestidos | 59.0 |
| 78 | Vestido Trenzado Abertura Posterior | Vestidos | 59.0 |
| 79 | Vestido Mary | Vestidos | 55.0 |
| 84 | Vestido Mellsh | Vestidos | 39.0 |
| 89 | Vestido Valen bicolor | Vestidos | 79.0 |
| 95 | Top Mia | Tops | 25.0 |
| 101 | Top Satín Copa | Tops | 45.0 |
| 106 | Chaleco Cuerina Cierre | Chaquetas | 49.0 |
| 107 | Chaleco Cuerina Carnero | Chaquetas | 39.0 |
| 109 | Puffer Cuerina | Chaquetas | 99.0 |
| 116 | Set Corrugado Lateral | Set | 50.0 |
| 118 | Set Corazón | Set | 75.0 |
| 128 | Casaca Biker Cuerina | Chaquetas | 125.0 |
| 132 | Cafarena Hilo Soft | Tops | 49.0 |
| 134 | Top Cuello Corrugado | Tops | 25.0 |
| 141 | Vestido Copa Andrea | Vestidos | 59.0 |
| 149 | Mini Vestido Manga Encaje | Vestidos | 69.0 |
| 151 | Mini Vestido Bobos | Vestidos | 69.0 |
| 152 | Cartera Prestige Purses | Carteras | 120.0 |
| 155 | Cartera Purse Palace | Carteras | 90.0 |
| 156 | Cartera UrbanBag | Carteras | 60.0 |
| 157 | Cartera Bag Bliss | Carteras | 65.0 |
| 159 | Cartera Lady | Carteras | 79.0 |
| 160 | Cartera Muse | Carteras | 59.0 |
| 161 | Cartera Diva | Carteras | 65.0 |
| 162 | Cartera Rubi | Carteras | 60.0 |
| 163 | Cartera All Posh | Carteras | 75.0 |
| 164 | Tote Chic | Carteras | 69.0 |
| 165 | Baguette Chic | Carteras | 65.0 |
| 166 | Cartera Caprice | Carteras | 120.0 |
| 167 | Billetera Classic & Modern | Billeteras | 45.0 |
| 168 | Billetera Vela | Billeteras | 45.0 |
| 180 | Rizador | Cuidado personal | 8.0 |
| 192 | Set De Brochas | Cuidado personal | 19.0 |
| 204 | Top Bufanda Puntos | Tops | 39.0 |
| 206 | Top Jean Botones | Tops | 55.0 |
| 216 | Vestido Ariel Suplex | Vestidos | 75.0 |
| 217 | Vestido Listones Manga Larga | Vestidos | 50.0 |
| 219 | Vestido Selena Cuello | Vestidos | 95.0 |
| 222 | Vestido Tarzán Abertura | Vestidos | 75.0 |
| 223 | Vestido Murciélago | Vestidos | 69.0 |
| 224 | Set Viena Suplex | Set | 69.0 |
| 255 | Pantalón Shine | Pantalones | 95.0 |
| 261 | Abrigo Lalesh Paño | Abrigos | 130.0 |
| 262 | Vestido Coquette | Vestidos | 75.0 |
| 263 | Pullover Bicolor Hilo | Sweaters | 35.0 |
| 265 | Vestido Kim | Vestidos | 65.0 |
| 267 | Vestido Espalda Tul | Vestidos | 85.0 |
| 268 | Top Zella | Tops | 29.0 |
| 269 | Top Ivana Corrugado | Tops | 25.0 |
| 270 | Top Strapless Corrugado Punta | Tops | 39.0 |
| 273 | Cartera Pearl | Carteras | 69.0 |
| 274 | Cartera Zerom | Carteras | 75.0 |
| 275 | Cartera Birdy | Carteras | 120.0 |
| 276 | Cartera Luxure | Carteras | 120.0 |
| 277 | Cartera Vaine | Carteras | 99.0 |
| 278 | Cartera Bagway | Carteras | 79.0 |
| 279 | Cartera Gemma | Carteras | 95.0 |
| 280 | Iconic Tote | Carteras | 75.0 |
| 281 | Cartera Style Chic | Carteras | 110.0 |
| 282 | Billetera Nova | Billeteras | 49.0 |
| 284 | Cartera Posh Purse | Carteras | 55.0 |
| 286 | Trendy Tote | Carteras | 85.0 |
| 287 | Cartera Aura Bag | Carteras | 65.0 |
| 298 | Pantalón Broche Zenit | Pantalones | 95.0 |
| 299 | Set Marmoleado | Set | 39.0 |
| 320 | Vestido Medusa Tul | Vestidos | 49.0 |
| 321 | Vestido Sabrina Strapless Tul | Vestidos | 65.0 |
| 326 | Vestido Gabriela Copa Tul | Vestidos | 65.0 |
| 329 | Cardigan Emily | Sweaters | 59.0 |
| 331 | Vestido Meli Copa Aro | Vestidos | 69.0 |
| 332 | Polera Volkisch | Poleras | 65.0 |
| 337 | Casaca Zenit Oversize | Chaquetas | 145.0 |
| 338 | Top Mesh Plus | Tops | 45.0 |
| 339 | Top Medusa Mesh | Tops | 35.0 |
| 343 | Casaca Zenit Cuerina | Chaquetas | 125.0 |
| 345 | Savanna bag | Carteras | 85.0 |
| 346 | Leather&key bag | Carteras | 90.0 |
| 347 | Kuna bag | Carteras | 139.0 |
| 348 | Tote Urbelle bag | Carteras | 95.0 |
| 349 | Luxe Minimal Tote bag | Carteras | 95.0 |
| 350 | Vintage Siena bag | Carteras | 89.0 |
| 352 | Short Shine | Shorts | 65.0 |
| 353 | Buzo Sayuri cierre | Set | 110.0 |
| 354 | Buzo Kaori | Set | 99.0 |
| 356 | Top Leila espalda | Tops | 20.0 |
| 372 | Bikini Ocean | BIKINIS | 69.0 |
| 378 | Top Demi Broche | Tops | 35.0 |
| 382 | Top martina | Tops | 49.0 |
| 384 | Vestido Broche Mariposa | Vestidos | 69.0 |
| 385 | Mini vestido lucia | Vestidos | 69.0 |
| 388 | Set summer | Set | 75.0 |
| 398 | Top envolvente puntos | Tops | 45.0 |
| 400 | Vestido estrella corrugado | Vestidos | 59.0 |
| 401 | Top teffy punta | Tops | 25.0 |
| 404 | Top Jazmin | Tops | 45.0 |
| 408 | Top camila rollete | Tops | 45.0 |
| 410 | Sombrero jessie | Accesorios | 20.0 |
| 415 | Top Hilary Aro | Tops | 49.0 |
| 421 | Vincha diosa | Accesorios | 6.0 |
| 422 | Falda Jean | Faldas | 89.0 |
| 425 | Pantalón Meli Buzo | Pantalones | 59.0 |
| 428 | Falda Dorada | Faldas | 39.0 |
| 438 | Vestido Cuello Tortuga | Vestidos | 75.0 |
| 439 | VESTIDO FUSIÓN AZUL | Vestidos | 45.0 |
| 441 | TOP AURORA | Tops | 29.0 |
| 442 | FALDA DIOSA TUL | Faldas | 55.0 |
| 443 | TOP DIOSA TUL | Tops | 15.0 |
| 449 | TOP LEOPARDO | Tops | 39.0 |
| 450 | SHORT LEOPARDO | Shorts | 45.0 |
| 456 | Top Venus | Tops | 39.0 |
| 486 | Corset Sabrina | Tops | 55.0 |
| 499 | Alice bag | Carteras | 65.0 |
| 505 | Olivia bag | Carteras | 85.0 |
| 506 | Camile bag | Carteras | 85.0 |
| 508 | Kassy bag | Carteras | 75.0 |
| 512 | Set Isabella Hilo | Set | 59.0 |
| 515 | Top Caroline Escote | Tops | 39.0 |
| 517 | Top Alice | Tops | 45.0 |
| 522 | Falda Short Novata | Faldas | 69.0 |
| 533 | STRAPLESS LISS ENCAJE | Tops | 39.0 |
| 540 | TOP LUANA | Tops | 39.0 |
| 542 | VESTIDO ALICE COPA | Vestidos | 59.0 |
| 559 | TOP MELANY BUFANDA | Tops | 39.0 |
| 570 | TOP PAULA SHINE | Tops | 45.0 |
| 586 | TOP FLOR TUL | Tops | 45.0 |
| 588 | SET MAYRA SHINE | Set | 99.0 |
| 597 | VESTIDO ANIMAL PRINT | Vestidos | 85.0 |
| 604 | TOP MELY SATIN | Tops | 50.0 |
| 612 | CORSET DUA LENTEJUELAS | Tops | 55.0 |
| 621 | CHALECO MELISSA SASTRE | Chaquetas | 65.0 |
| 635 | SANDALIA SUECO | Calzado | 85.0 |
| 636 | SANDALIA CHAROL | Calzado | 95.0 |
| 638 | TOTE NUDO CLASICO | Carteras | 85.0 |
| 641 | BOLSO NOVA | Carteras | 69.0 |
| 642 | Diva Animal Print | Carteras | 65.0 |
| 644 | BOLSO CHERRY CLASSIC | Carteras | 75.0 |
| 646 | ATHENA BAG | Carteras | 75.0 |
| 647 | PERLA BOW BAG | Carteras | 75.0 |
| 649 | BOHO SEQUIN BAG | Carteras | 75.0 |
| 651 | ÁMBAR SHINE | Carteras | 49.0 |
| 652 | Siena glam | Carteras | 55.0 |
| 653 | BOLSO LIA | Carteras | 55.0 |
| 654 | TRINITY TOTE | Carteras | 85.0 |
| 656 | CARTERA SUMMER | Carteras | 59.0 |
| 677 | MINI VESTIDO VENUS BROCHE | Vestidos | 59.0 |
| 696 | MINI VESTIDO KATH COPA | Vestidos | 70.0 |
| 705 | MAXI VESTIDO LISBETH ENCAJE | Vestidos | 110.0 |
| 710 | TOP BROCHE CUELLO AMARRABLE | Tops | 39.0 |
| 714 | Top Arely Encaje | Tops | 45.0 |
| 744 | VESTIDO VALERI | Vestidos | 65.0 |
| 745 | PANTALON EXTASIS BOLSILLO | Pantalones | 95.0 |

## 4. Huecos de datos

| Hueco | Productos | % |
|---|---|---|
| Sin descripción | 87 | 18.6% |
| Sin ninguna imagen | 3 | 0.6% |
| Sin selector de color (tratados como color único) | 0 | 0.0% |
| Sin ninguna talla | 1 | 0.2% |
| Sin precio | 1 | 0.2% |
| Con precio de oferta | 13 | 2.8% |

IDs sin imagen: 621, 636, 735

IDs sin descripción (87): 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 384, 385, 388, 410, 468, 469, 470, 472, 484, 485, 486, 489, 493, 496, 497, 499, 500, 502, 505, 506, 508, 510, 634, 635, 636, 637, 652, 665, 666, 667, 669, 678, 679, 680, 681, 682, 683, 684, 685, 686, 687, 688, 689, 690, 691, 692, 693, 711, 712, 713, 714, 717, 718, 720 …

## 5. Precios

| Métrica | S/ |
|---|---|
| Mínimo | 3.00 |
| Máximo | 169.00 |
| Promedio | 63.01 |
| Mediana | 59.00 |

Productos donde el precio AJAX de algún color difiere del precio base: 50.
Estos requieren decisión de negocio: el catálogo nuevo debe guardar el precio por color, no uno solo por producto.

| ID | Nombre | Precio base | Precios por color |
|---|---|---|---|
| 9 | Flare Pants Chompero | 50.0 | Verde Pistacho=50.0, Marrón=50.0, Azul=0.0, Negro=50.0, Blanco=50.0 |
| 16 | Top Karol | 35.0 | Rojo=45.0 |
| 22 | Chompa Qata manga larga | 29.0 | Celeste=49.0 |
| 47 | Flare Lady | 29.0 | Piel=49.0 |
| 52 | Falda Larga Basic | 35.0 | Negro=59.0, Marrón=59.0, Plomo=59.0, Blanco=59.0 |
| 53 | Vestido Cafarena | 55.0 | Plomo=69.0 |
| 56 | Vestido Tarzán Tul | 49.0 | Fucsia=65.0 |
| 57 | Vestido Anna | 35.0 | Anaranjado=65.0 |
| 58 | Vestido Amanecer | 59.0 | Rosa=79.0 |
| 59 | Vestido Pliegue Arcoíris | 49.0 | Arcoíris=69.0 |
| 76 | Borda Vestido Escote | 59.0 | Palo Rosa=69.0 |
| 78 | Vestido Trenzado Abertura Posterior | 59.0 | Negro=69.0 |
| 84 | Vestido Mellsh | 39.0 | Blanco=75.0 |
| 92 | Vestido Listones | 55.0 | Blanco=75.0, Beige=75.0, Azul Noche=75.0, Negro=75.0, Vino=75.0, Marrón=75.0, Verde=None |
| 95 | Top Mia | 25.0 | Beige=39.0 |
| 106 | Chaleco Cuerina Cierre | 49.0 | Vino=89.0 |
| 107 | Chaleco Cuerina Carnero | 39.0 | Marrón=95.0 |
| 116 | Set Corrugado Lateral | 50.0 | Negro=69.0, Verde Pistacho=69.0 |
| 134 | Top Cuello Corrugado | 25.0 | Blanco=49.0 |
| 217 | Vestido Listones Manga Larga | 50.0 | Gris=79.0, Vino=79.0, Verde=79.0, Negro=79.0 |
| 263 | Pullover Bicolor Hilo | 35.0 | Beige/negro=45.0 |
| 265 | Vestido Kim | 65.0 | Negro=95.0, Beige=95.0 |
| 268 | Top Zella | 29.0 | Celeste=45.0 |
| 269 | Top Ivana Corrugado | 25.0 | Jade=39.0, Blanco=39.0, Rojo=39.0, Topo=39.0 |
| 288 | Correa Dorelle | 25.0 | Negro=25.0, Marrón=20.0, Ladrillo=20.0, Beige=20.0 |
| 293 | Top piel y2k | 29.0 | Vino=45.0, Negro=45.0, Azul=45.0 |
| 299 | Set Marmoleado | 39.0 | Único=79.0 |
| 303 | Blusa Lady Manga Larga | 49.0 | Blanco c/ Plomo=59.0, Blanco c/ Celeste=59.0, Blanco c/ Beige=59.0, Moca=59.0, Negro=59.0, Beige=59.0, Celeste=59.0 |
| 320 | Vestido Medusa Tul | 49.0 | Celeste=75.0, Blanco=75.0, Verde=75.0, Negro=75.0, Vino=75.0, Gris=75.0 |
| 339 | Top Medusa Mesh | 35.0 | Vino=45.0, Negro=45.0, Marrón=45.0, Puntos=45.0 |
| 341 | Vestido Ale | 49.0 | Amarillo=59.0, Negro=59.0, Blanco=59.0, Azul=59.0, Rosado=59.0 |
| 356 | Top Leila espalda | 20.0 | Rojo=45.0, Negro=45.0, Marrón=45.0 |
| 367 | Bikini Soleil | 69.0 | Rojo=89.0, Amarillo=89.0 |
| 368 | Bikini Halo | 69.0 | Bicolor=89.0 |
| 369 | Bikini Floral Bliss | 69.0 | Floral=89.0 |
| 370 | Bikini Wild Print | 69.0 | Animal Print=89.0 |
| 371 | Bikini Coralina | 69.0 | Rosado=89.0 |
| 372 | Bikini Ocean | 69.0 | Marrón=89.0 |
| 373 | Bikini Lua | 69.0 | Celeste=89.0, Morado=89.0 |
| 374 | Bikini Venus | 69.0 | Morado=89.0 |

Nota de mapeo: en las tarjetas de listado, `.normal` es el precio vigente y `.oferta` el precio anterior tachado. Se guardó `precio_base` = `.normal` y `precio_oferta` = `.oferta` según lo pedido; **confirmar con los dueños** que esa es la semántica deseada en el catálogo nuevo, porque el valor de `precio_oferta` es el precio ANTES del descuento, no el rebajado.

## 6. Colores y tallas

Colores únicos (por nombre, sin normalizar mayúsculas): **153**  
Tallas únicas: **36**

### Tallas encontradas (valor — nº de variantes)

`Standar` (452), `Standard` (379), `S` (131), `M` (112), `único` (61), `32` (45), `L` (45), `XS` (44), `34` (42), `28` (39), `30` (38), `26` (35), `37` (15), `36` (12), `39` (11), `35` (10), `38` (10), `S-M` (7), `Medium` (7), `SMALL` (5), `MEDIUM` (5), `24` (3), `Cleo Charm` (3), `standar` (3), `B` (2), `C` (2), `D` (2), `Mila Leopard` (2), `Kairo Taupe` (2), `Tosu Grace` (2), `The Tote Bag` (2), `Clasp bag` (2), `A` (1), `XL` (1), `M-L` (1), `s` (1)

### Colores encontrados (valor — nº de productos)

`Negro` (206), `Blanco` (137), `Marrón` (94), `Único` (90), `Beige` (71), `Vino` (69), `Rojo` (40), `Amarillo` (40), `Celeste` (28), `Azul` (26), `Rosado` (25), `Verde` (22), `Plomo` (16), `Gris` (14), `Plateado` (13), `Dorado` (13), `Acero` (12), `Rosa` (9), `Color 1` (9), `Color 2` (9), `Color 3` (8), `Beige oscuro` (7), `Camel` (7), `Verde Pistacho` (6), `tono 1` (6), `tono 2` (6), `Beige claro` (6), `Azul marino` (5), `Ladrillo` (5), `Animal Print` (5), `Crema` (5), `Hueso` (5), `tono 3` (4), `Perla` (4), `Palo Rosa` (4), `Jade` (4), `Chocolate` (4), `Topo` (4), `Anaranjado` (3), `Azul Noche` (3), `Marron` (3), `Verde Botella` (3), `Color 4` (3), `Color 5` (3), `Morado` (3), `Rosado pastel` (3), `Verde Olivo` (3), `Verde olivo` (3), `tono 4` (2), `tono 5` (2), `Piel` (2), `Fucsia` (2), `Moca` (2), `Azul Acero` (2), `Color 6` (2), `Turquesa` (2), `rojo` (2), `Negro c/ puntos` (2), `Diseño 1` (2), `Diseño 2` (2)

… y 93 más. Lista completa de colores y tallas en `valores_unicos.json`.

Variantes del mismo color escritas de distinta forma (hay que normalizar al migrar):

- `animal print` → 'Animal Print', 'animal print'
- `azul noche` → 'Azul Noche', 'Azul noche'
- `blanco` → 'Blanco', 'blanco'
- `crema` → 'Crema', 'crema'
- `dorado` → 'Dorado', 'dorado'
- `negro` → 'NEGRO', 'Negro', 'negro'
- `plateado` → 'Plateado', 'plateado'
- `rojo` → 'ROJO', 'Rojo', 'rojo'
- `rosa` → 'Rosa', 'rosa'
- `tono 1` → 'Tono 1', 'tono 1'
- `tono 2` → 'Tono 2', 'tono 2'
- `tono 3` → 'Tono 3', 'tono 3'
- `verde agua` → 'Verde agua', 'verde agua'
- `verde olivo` → 'Verde Olivo', 'Verde olivo', 'verde olivo'
- `vino` → 'Vino', 'vino'

## 7. Imágenes

Tarea 3 no ejecutada todavía (falta `imagenes_resumen.json`). Correr `node imagenes.mjs`.

URLs de imagen únicas ya identificadas en el JSON: **997**.

Las tres variantes del sitio (`data-tiny`, `data-small`, `data-large`) apuntan al mismo archivo: solo existe una resolución por imagen.

## 8. Diferencia contra la extracción previa (752 productos)

| Métrica | Valor |
|---|---|
| Productos en la extracción previa | 752 |
| Productos en esta extracción | 467 |
| IDs nuevos | 174 |
| IDs que ya no aparecen | 459 |

IDs nuevos: 9, 16, 22, 24, 40, 41, 42, 43, 46, 47, 48, 52, 53, 55, 56, 57, 58, 59, 69, 73, 74, 75, 76, 78, 79, 84, 89, 95, 101, 106, 107, 109, 116, 118, 128, 132, 134, 141, 149, 151, 152, 155, 156, 157, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 180, 192, 204, 206, 216, 217, 219, 222, 223, 224, 255, 261, 262, 263, 265, 267, 268, 269, 270, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 284, 286, 287, 298, 299, 320, 321, 326, 329, 331, 332, 337, 338, 339, 343, 345, 346, 347, 348, 349, 350, 352, 353, 354, 356, 372, 378, 382, 384, 385, 388, 398, 400, 401, 404, 408, 410, 415, 421, 422, 425, 428, 438, 439, 441, 442, 443, 449, 450, 456, 486, 499, 505, 506, 508, 512, 515, 517, 522, 533, 540, 542, 559, 570, 586, 588, 597, 604, 612, 621, 635, 636, 638, 641, 642, 644, 646, 647, 649, 651, 652, 653, 654, 656, 677, 696, 705, 710, 714, 744, 745

IDs desaparecidos (retirados del catálogo, o fallo de esta corrida — cruzar con `errores_productos.json`):

| ID | Nombre en la extracción previa |
|---|---|
| 769 | Top Moana |
| 770 | Top Luciana amarrable |
| 771 | Set Martina |
| 773 | Vestido Esther Shine |
| 774 | Top broche lazo |
| 776 | Body Corset Satin |
| 777 | Top lina |
| 778 | Top Bri Shine |
| 779 | Top Zoe broche |
| 780 | Top Lucero asimetrico |
| 785 | Top Vania encaje |
| 788 | Camelia Bag |
| 789 | Ibiza Bag |
| 793 | Sand Hobo |
| 796 | Top Aldama hilo |
| 799 | Vestido Cami broche |
| 801 | Conjunto Vania satin |
| 804 | Falda nudo suplex |
| 805 | Falda Zendaya lentejuela |
| 806 | Short perception |
| 810 | Vestido Margaret corrugado |
| 811 | Top strapless suplex |
| 812 | Salida de playa Michelly |
| 815 | Top Claudia bobos |
| 817 | Sandalia summer |
| 818 | Sandalia Angely |
| 820 | MAXI VESTIDO MICAELA HILO |
| 822 | FALDA SHORT ZENIT |
| 824 | STRAPLESS SOF ENCAJE |
| 825 | falda shor zenit |
| 827 | VESTIDO NAHOMY |
| 828 | TOP ESTRELLA AMARRABLE |
| 829 | PANTALON HILO |
| 830 | VESTIDO MELODY HILO |
| 833 | MINI VESTIDO THAISSA HILO |
| 834 | MINI VESTIDO ESTRELLA BLONDA |
| 837 | TOP SAMY STRAPLESS ASIMETRICO |
| 839 | TOP FLORENCIA |
| 840 | VESTIDO RENATA ALGODON |
| 842 | SET ISABELLA HILO |
| 843 | BLUSA LEONOR AMARRABLE |
| 844 | TOP MARY LAZOS |
| 845 | COTTON (PEQUEÑO) |
| 846 | COTTON (GRANDE) |
| 847 | PEINE |
| 848 | TOALLAS HUMEDAS |
| 849 | SET COLET CORAZON |
| 850 | COLET |
| 853 | Sienna Bag |
| 855 | Cherry Night |
| 857 | Amalfi Bag |
| 858 | Midnight Bag |
| 859 | short sara |
| 860 | top dany escote |
| 861 | top aby star |
| 862 | MINI VESTIDO SOLANGE BRILLO |
| 864 | BIKINI MARY |
| 865 | BIKINI STEPHANY |
| 866 | BIKINI LUANA |
| 867 | BIKINI DANAE |
| 868 | BIKINI VAQUERO |
| 869 | BIKINI ANNY |
| 870 | BIKINI VANE |
| 871 | BIKINI CAROLINA |
| 872 | BIKINI SHEYLA |
| 873 | BIKINI LIRI |
| 874 | BIKINI RUBI |
| 875 | BIKINI ORQUIDEA |
| 876 | BIKINI ORIANA |
| 877 | BKINI ROSSETA |
| 878 | TOP BABI BROCHE |
| 879 | TOP BELINDA LENTEJUELAS |
| 880 | TOP KARO ENCAJE |
| 882 | BIKINI KENDAL |
| 890 | Top tessa sastre |
| 891 | Top rose encaje |
| 892 | Set estrella broche |
| 893 | Vestido Antonella |
| 894 | Vestido star hilo |
| 895 | Vestido rib ross |
| 896 | Mini vestido carol |
| 897 | Arena tote |
| 899 | vestido sharon amarre |
| 900 | mini vestido cami broche |
| 901 | mini vestido rayza hilo |
| 903 | top blondy estrella |
| 904 | top lia sastre strapless |
| 906 | set amanda capa |
| 908 | maxi vestido luba hilo broche |
| 910 | cartera NUBE URBAN |
| 911 | essential blue |
| 912 | pacific soul |
| 913 | moderna camel |
| 915 | bikini cacao vintage |
| 916 | bikini zafiro real |
| 917 | bikini melocoton soft |
| 918 | bikini lavander flora |
| 919 | bikini selva oscura |
| 920 | bikini arena gold |
| 921 | bikini choco pink |
| 922 | top ale |
| 923 | bikini pacific garden |
| 924 | bikini aura classy |
| 925 | bikini honey glow |
| 926 | bikini nectar bloom |
| 927 | bikini paradise petals |
| 928 | bikini latte coast |
| 929 | bikini rivera mosaic |
| 930 | bikini terra crochet |
| 931 | bikini estela de mar |
| 933 | bikini moka dream |
| 934 | falda taylor lentejuela |
| 935 | top mia lentejuelas |
| 936 | set nautica |
| 938 | Mini Vestido Dana |
| 939 | Vestido Jazmin Copa Aro |
| 940 | Vestido Hilo Bico |
| 942 | Vestido Salomé |
| 943 | Top Romi |
| 945 | vestido maggie hilo |
| 946 | vestido jedat |
| 947 | SHORT LINA |
| 948 | Blusa Broderi |
| 949 | Pantalón Lina |
| 950 | Camisa Summer Lino |
| 951 | Short Luci |
| 952 | Correa Maite |
| 954 | RUBY |
| 955 | OLIVE |
| 956 | CLOUD |
| 957 | BLACK MUSE |
| 958 | SET MARIBEL |
| 959 | VESTIDO ADA |
| 960 | VESTIDO TAMMY COPAS |
| 961 | TOP RAW |
| 962 | TOP ENCAJE MINE |
| 964 | Top espalda manga corta |
| 965 | POLO MANGA CORTA |
| 966 | Top Lexi |
| 967 | top Cesi |
| 968 | VESTIDO VELVET |
| 969 | Vestido Pao |
| 970 | Vestido Kiara Flecos |
| 971 | vestido multiaguja |
| 972 | Vestido Elasty |
| 973 | Vestido Grecia |
| 974 | Vestido Anto |
| 977 | VESTIDO LUA SIRENA |
| 978 | VESTIDO ALICE COPA |
| 979 | VESTIDO PIA |
| 980 | VESTIDO LARISSA |
| 981 | Top Rubbe |
| 982 | Top Strapless |
| 983 | Top Mariana Blonda |
| 984 | Top Chyna |
| 986 | Pantalón Zenit |
| 987 | Palazzo Divas |
| 988 | Cartera Odisea |
| 992 | VESTIDO LIUBA |
| 994 | cartera bruma |
| 997 | blusa belen |
| 998 | VESTIDO ASIA |
| 999 | TOP SASTRE OLIVIA |
| 1000 | Falda Short Ema Rígido |
| 1001 | Falda Short Cadera Charlotte |
| 1002 | Flare Cadera Dava |
| 1003 | Wide Leg Ultra Cadera Aby |
| 1004 | Pantalón Bootcut Cadera |
| 1005 | BLUSA MANGA CORTA |
| 1006 | Vestido Sami |
| 1007 | top baloon manga laga |
| 1008 | TOP CREPPIE |
| 1009 | TOP LINDA |
| 1010 | MINI VESTIDO VENUS BROCHE |
| 1011 | TOP INDDIGO |
| 1012 | CORSET DUA LENTEJUELAS |
| 1013 | top milenka |
| 1014 | top gricell |
| 1015 | polo jimena ojál |
| 1016 | VESTIDO SAM |
| 1017 | BLUSA LAZO |
| 1018 | BIKINI SUMMER |
| 1019 | FALDA LENTEJUELA NOIR |
| 1020 | FALDA LENTEJUELA STELLAR |
| 1021 | FALDA LENTEJUELA DARCY |
| 1022 | RELOJES DE 59 |
| 1023 | BRAZAETE HADE |
| 1025 | BRAZALETE AURA DORADA |
| 1026 | BRAZALETE AURA NACAR |
| 1027 | chaqueta demin bolsillos |
| 1029 | Sweater Ojal Hilo |
| 1030 | Chaleco Cesia |
| 1031 | Vestido Vichy |
| 1032 | Cardigan Bicolor Hilo |
| 1033 | TOP BICOLOR HILO |
| 1034 | POLO CUELLO REDONDO M/LARGA |
| 1035 | OFF SHOULDER HILO |
| 1037 | TOP BRAVE M/LARGA |
| 1039 | GABARDINA |
| 1041 | CHOMPA HILO WINNIE |
| 1042 | PANTALON SASTRE MIA |
| 1043 | TOP ROLLETE |
| 1044 | TOP ROSSI |
| 1046 | TOP RIB MELODY |
| 1047 | TOP SUECIA |
| 1048 | TOP MANDY |
| 1049 | CAMISACO CUERINA |
| 1050 | CHAQUETA BOMBER CUERINA |
| 1051 | BLUSA POPELINA |
| 1052 | TOP OFF SHOULDER PRETINA M/LARGA |
| 1053 | CHOMPA CAMISERO GABY |
| 1054 | CARDIGAN PRESS |
| 1055 | CARDIGAN ZARA |
| 1056 | CHOMPA ROMY RAYADO |
| 1057 | glam rubi |
| 1058 | EBANO CHIC |
| 1059 | LEOPARD QUEEN |
| 1060 | AMOUR BLACK |
| 1061 | DUCE AURA |
| 1062 | ALMA CHIC |
| 1063 | NUBE CHIC |
| 1064 | clean soft |
| 1065 | MERLOT MUSE |
| 1066 | ALMENDRA BAG |
| 1067 | LATE CONTRAST |
| 1068 | NOCHE IMPERIAL |
| 1070 | MIDNIGHT BOSS |
| 1072 | VESTIDO JUSTINA |
| 1073 | SET ROXY |
| 1074 | VESTIDO SABRINA |
| 1076 | POLO OVERLOOK |
| 1077 | TOP BELLOTA |
| 1078 | CHAQUETA PELUCHE/CUERINA |
| 1079 | BLUSA CLOCK |
| 1080 | TOP PENELOPE |
| 1084 | TOP DEBORA |
| 1085 | CARTERA DE 110 |
| 1086 | POLO RUGBY HILO |
| 1087 | TOP CALU |
| 1088 | TANK TOP ENCAJE |
| 1089 | CHALECO CAMISERO |
| 1090 | FALDA SHORT BICHOTA |
| 1091 | POLO RIB ALY |
| 1092 | CAMISA OVERSIZE RAYADO |
| 1093 | TOP NAOMI |
| 1094 | vestido veroll |
| 1095 | top erika |
| 1096 | POLO OJAL / M LARGA |
| 1097 | TOP ROSE / M CORTA |
| 1098 | TOP NILSA |
| 1099 | TOP ORI |
| 1100 | TOP MAYLI |
| 1101 | TOP BELLA /MLARGA |
| 1103 | CHAQUETA BERLIN |
| 1105 | CARDIGAN EVY |
| 1106 | TOP COPA ARTEMISA |
| 1107 | CASACA FELPA |
| 1108 | PANTAON ZENIT |
| 1109 | BAGGY SARA |
| 1110 | FLARE SARA |
| 1111 | OFF SHOULDER LINES HILO |
| 1112 | TOP SUPLEX CORAL |
| 1113 | FLARE SEMI CADERA |
| 1115 | CARDIGAN BASIC |
| 1143 | MINI VESTIDO ZENDAYA |
| 1144 | VESTIDO JOSEFA |
| 1145 | VESTIDO YOUL |
| 1146 | SIRENA DRESS CORRUGADO |
| 1147 | vestido tortuga aro |
| 1148 | VESTIDO LUA SIRENA |
| 1149 | Bolso Aura Moka |
| 1150 | Canela Chic |
| 1151 | Duna Elegance |
| 1152 | Miel Toscana |
| 1153 | Ámbar Elegance |
| 1154 | Aura Chocolate: |
| 1155 | Arena & Miel |
| 1156 | Merlot Velve |
| 1157 | Lía Desert |
| 1158 | Selene Brown: |
| 1159 | Viena Dual |
| 1160 | Petra Bag |
| 1161 | JERSEY RAYAS |
| 1163 | FALDA LOW RAYA |
| 1164 | CASACA TOUN |
| 1165 | TOP OLIVIA |
| 1166 | pantalon onelia |
| 1167 | FALDA SHORT DENIM CADERA |
| 1168 | CASACA BEAR |
| 1169 | CASACA DUP |
| 1170 | VESTIDO DALIBEE |
| 1172 | TOP DAMARYS |
| 1173 | PANTALON MONET |
| 1175 | SWEATER KALU |
| 1176 | PANTALON KALU |
| 1177 | CASACA SUEDE |
| 1178 | TOP REVEL |
| 1179 | MANGUITA |
| 1180 | abrigo piel |
| 1182 | blusa satin |
| 1183 | top aylin encaje |
| 1184 | vestido clock |
| 1185 | vestido isis |
| 1186 | cardigan gold |
| 1187 | CORSET RAYAS |
| 1188 | VESTIDO VIVI |
| 1189 | VESTIDO MILU |
| 1190 | VESTIDO ARIZ |
| 1191 | VESTIDO CASSIE |
| 1192 | VESTIDO MERLY |
| 1194 | TOP ADDIE MANGA LARGA |
| 1195 | BLUSA MANGA CORTA |
| 1196 | PANTALÓN ALGODÓN |
| 1197 | FLARE CADERA ELIANA |
| 1198 | FLARE ULTRA CADERA EGLY |
| 1199 | FLARE JIMENA BOLSILLOS |
| 1201 | JERSEY CHIC |
| 1202 | CAMISERO TEJIDO |
| 1203 | VESTIDO BOTANICO |
| 1204 | VESTIDO LUA SIRENA |
| 1205 | VESTIDO LAU BOBO |
| 1206 | VESTIDO LOVE |
| 1207 | VESTIDO SIENNA |
| 1208 | TOP AURORA |
| 1209 | TOP ENCAJE BRIANA |
| 1210 | TOP POLLY |
| 1211 | CHAQUETA CUERO URBAN |
| 1214 | top capri |
| 1217 | top aura manga larga |
| 1218 | SWEATER JULIETTE |
| 1221 | PONCHO |
| 1223 | BILLETERA DE HOMBRE |
| 1224 | BILETERA DE MUJER |
| 1225 | TOP JULL |
| 1226 | VESTIDO TUNDRA |
| 1227 | TOP TENTEN |
| 1228 | TOP SIFRAH |
| 1229 | TOP DUBAI |
| 1230 | VESTIDO RIOT |
| 1231 | VESTIDO CORTO AKIRA |
| 1232 | VESTIDO MELANIA |
| 1233 | FALDA SHORT PEACH |
| 1234 | PALAZZO CHRITIAN |
| 1235 | CHAQUETA CHRISTIAN |
| 1236 | TOP FROX |
| 1237 | TOP KESHA |
| 1238 | TOP NAVY |
| 1239 | HOODIE COTTON |
| 1240 | BEATLES JACKET |
| 1242 | VESTIDO JULIETTE |
| 1243 | VESTIDO PARIS |
| 1244 | VESTIDO ARIA |
| 1245 | VESTIDO NAELI |
| 1246 | TOP AMARA |
| 1247 | TOP ELITE |
| 1248 | TOP MAO |
| 1249 | TOP HALTER |
| 1250 | VESTIDO TILSA |
| 1251 | TOP ESSENCIAL |
| 1252 | FALDA ALYA |
| 1253 | FALDA MONACO |
| 1254 | PANTALON HILO RUSS |
| 1255 | CHAQUETA ZENIT |
| 1257 | CHAQUETA DENIM BLUE |
| 1258 | SWEATER MUSE |
| 1259 | FALDA ECO CUERO |
| 1260 | TOP LUNETH |
| 1261 | TOP BISS |
| 1262 | TOP LAZITO |
| 1263 | TOP BRENDA ESPALDA |
| 1264 | SWEATER CLOUD |
| 1265 | TOP BORDO PLISADO |
| 1266 | STRAIGHT JEANS BLUE |
| 1267 | WIDE LEG CADERA BLANCO |
| 1268 | CONJUNTO AITANA |
| 1269 | VESTIDO IRENE |
| 1270 | MINI VESTIDO ELSY |
| 1271 | TOP ASIA MANGA LARGA |
| 1272 | TOP MERLE |
| 1273 | TOP ENCAJE MIA |
| 1274 | TOP LAYLA |
| 1275 | CHAQUETA TREND CROP |
| 1276 | TOP TINNY |
| 1277 | TOP CLARA ENCAJE |
| 1278 | TOP CHLOE |
| 1279 | TOP SUA |
| 1280 | TOP MIMY |
| 1281 | BLUSA ABY |
| 1282 | VESTIDO LOVE |
| 1283 | BLUSA ABY |
| 1284 | VESTIDO ALDEMAR |
| 1285 | TOP KIA |
| 1286 | MINI VESTIDO BELLA |
| 1287 | VESTIDO ARI BOBO |
| 1288 | MINI VESTIDO ARIEL |
| 1289 | TOP ABRIL |
| 1290 | Cartera de 59 |
| 1291 | Gorra vintage |
| 1292 | Enterizo gym Cohem |
| 1293 | ENTERIZO STELLA |
| 1294 | SHORT PRETINA |
| 1295 | TOP PINK |
| 1296 | TOP RUGY |
| 1297 | SHORT BOLSILLOS |
| 1298 | FLARE BOLSILLOS |
| 1299 | ENTERIZO STELLA |
| 1300 | VESTIDO TYFA |
| 1301 | TOP AMARA |
| 1302 | CROP WONDERLUST |
| 1303 | VESTIDO ADA |
| 1304 | VESTIDO SABRINA |
| 1305 | VESTIDO TANIA |
| 1306 | VESTIDO SULLY |
| 1307 | VESTIDO LOLA |
| 1308 | VESTIDO ADELL |
| 1309 | PANTALON SASTRE MAJU |
| 1310 | TOP HANNA MANGA LARGA |
| 1311 | TOP CAMI |
| 1312 | TOP MILA |
| 1313 | TOP ANNY |
| 1314 | TOP AMELIA |
| 1315 | TOP ROUS |
| 1316 | FALDA SHORT ORIGAMI |
| 1317 | VESTIDO DALIA |
| 1318 | VESTIDO AMBAR |
| 1319 | VESTIDO ROMA |
| 1321 | BLUSA MARGARET |
| 1322 | TOP DULCE |
| 1323 | FALDA ONDA |
| 1325 | CARTERA 79 |
| 1326 | VESTIDO IRENE |
| 1327 | PANTAON WONDERLUST |
| 1328 | PALAZZO CHRITIAN |
| 1329 | CONJUNTO ARLET |
| 1330 | CONJUNTO NARELLA |
| 1331 | TOP AVELINA |
| 1332 | TOP NEREA |
| 1333 | TOP EVORA |
| 1334 | TOP ELOWEN |
| 1335 | TOP ZINNIA |
| 1336 | TOP CALÍOPE |
| 1338 | TOP BRIELLEBRI59881 |
| 1339 | CONJUNTO MALENA |
| 1340 | VESTIDO ELARA |
| 1341 | TOP KENDRA |
| 1342 | TOP YVAINE |
| 1343 | CARDIGAN DOTS |
| 1344 | TOP XANTHE |
| 1345 | TOP NARELLA |
| 1348 | TOP SERAPHINA |
| 1349 | TOP ILIANA |
| 1353 | FALDA CADERA FRENETIC |
| 1356 | TOP MILUSKA |
| 1357 | TOP ELARA |
| 1358 | TOP LIORA |
| 1361 | TOP MELIORA |
| 1364 | TOP CELESTIA |
| 1365 | TOP ORLA |
| 1366 | CARDIGAN NEREA |

Productos con precio distinto al de la extracción previa: 13.

| ID | Nombre | Antes S/ | Ahora S/ |
|---|---|---|---|
| 92 | Vestido Listones | 75.00 | 55.00 |
| 293 | Top piel y2k | 45.00 | 29.00 |
| 303 | Blusa Lady Manga Larga | 59.00 | 49.00 |
| 341 | Vestido Ale | 59.00 | 49.00 |
| 367 | Bikini Soleil | 89.00 | 69.00 |
| 368 | Bikini Halo | 89.00 | 69.00 |
| 369 | Bikini Floral Bliss | 89.00 | 69.00 |
| 370 | Bikini Wild Print | 89.00 | 69.00 |
| 371 | Bikini Coralina | 89.00 | 69.00 |
| 373 | Bikini Lua | 89.00 | 69.00 |
| 374 | Bikini Venus | 89.00 | 69.00 |
| 375 | Bikini Nudé | 89.00 | 69.00 |
| 386 | Top luisa | 29.00 | 15.00 |

Sin descripción: 285 antes → 87 ahora.

## 9. Campos que NO existen en la web — hay que pedirlos a los dueños

| Campo | Estado | Por qué |
|---|---|---|
| Stock numérico | `null` en todos | No hay cantidad pública. El `max="5"` del input de cantidad es un límite del formulario, no stock. **No hace falta pedirlo: esta tienda no lleva stock real** — ver nota abajo. |
| Agotado / disponibilidad real | `null` en todos | `product:availability` dice `in stock` en el 100% de las fichas, también en productos desactivados. Dato público inútil: ignorado. **Sí existe en el panel** (botón `Agotar Stock` y estado activo/inactivo): hay que pedirlo. |
| SKU real | `null` | Solo existe `product:retailer_item_id` (p. ej. `1102SUP53656`), que es un identificador de retailer, no necesariamente el SKU interno. Se guarda aparte, sin presumir equivalencia. |
| Descripciones faltantes | 87 productos | La ficha trae `div.tit_desc` vacío. Hay que redactarlas o pedirlas. |
| Peso / medidas / material / guía de tallas | no existe | Ningún campo público. |
| Costo, margen, proveedor | no existe | Datos internos, nunca públicos. |
| Orden de catálogo / destacados | parcial | Se puede inferir del orden de las tarjetas en cada categoría, no hay campo explícito. |

### Nota: el stock del panel es nominal, no inventario

El panel sí tiene columna `Stock`, desglosada por color y talla. Pero en todas las filas inspeccionadas el valor es **1**: `PONCHO` (4 colores), `SWEATER JULIETTE` (6), `CHAQUETA CUERO URBAN` (3) y `Flare Pants Chompero` (5 colores × 2 tallas) — todo a 1.

La conclusión no es *pedir el stock*, es que **la tienda no lleva control de inventario**: el 1 está puesto para que el formulario de compra acepte el pedido. Si el catálogo nuevo necesita stock, hay que montarlo desde cero con los dueños, no migrarlo.

### Hallazgo de seguridad: los productos desactivados siguen siendo públicos

Un producto desactivado en `ll-admin` desaparece de los listados, pero su ficha sigue respondiendo en `producto.php?id=` con nombre, precio, colores, tallas e imágenes. Cualquiera con el enlace ve un producto dado de baja, y así se encontraron los huérfanos de la sección 3. Conviene avisar a los dueños: en el catálogo nuevo, desactivar debería devolver 404.

## 10. Archivos generados

- ✓ `productos_completo.json` — catálogo completo, un objeto por producto
- ✓ `productos_completo.csv` — el mismo catálogo, una fila por producto
- ✓ `variantes_completo.csv` — una fila por color × talla, para cargar el catálogo nuevo
- ✓ `ids_encontrados.json` — todos los IDs válidos con su origen
- ✓ `ids_invalidos.json` — IDs probados que dieron 404 o ficha vacía
- — `imagenes_map.json` — URL original → archivos locales → producto y color
- — `imagenes_resumen.json` — totales de imágenes y pesos
- ✓ `progress.json` — estado de reanudación
- ✓ `errores.json / errores_productos.json` — fallos de red y de extracción
- ✓ `html/` — cada respuesta HTML cruda, tal como llegó
- ✓ `robots.txt` — robots.txt del sitio al momento de la corrida
- ✓ `run_meta.json` — metadatos de la corrida (peticiones, tiempos, user-agent)

