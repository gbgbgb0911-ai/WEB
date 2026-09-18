# Reporte de auditoría — extracción EUCHEL

Generado: 2026-09-18 06:55 UTC  
Fuente: https://euchelperu.com — extracción autorizada por los dueños  
Corrida: 4 peticiones HTTP, 1 concurrente, pausa 0.5 s, 4.9 s totales

## 1. IDs

| Métrica | Valor |
|---|---|
| IDs probados en el barrido | 1500 |
| IDs válidos (producto con `h1.nmbpro`) | 962 |
| IDs inválidos (404 o ficha vacía) | 538 |
| Productos extraídos con éxito | 962 |
| Productos que fallaron la extracción | 0 |
| Solo en categorías | 0 |
| Solo por barrido (huérfanos) | 210 |
| En ambas fuentes | 752 |

Rango de IDs válidos: 9 – 1367.

## 2. Productos por categoría

| Categoría | subid | Productos |
|---|---|---|
| Tops | 3 | 235 |
| Vestidos | 8 | 196 |
| Carteras | 12 | 107 |
| BIKINIS | 21 | 67 |
| Pantalones | 6 | 65 |
| Faldas | 7 | 37 |
| Set | 10 | 35 |
| Accesorios | 19 | 28 |
| Perfumes | 17 | 26 |
| Chaquetas | 9 | 25 |
| Cuidado personal | 15 | 22 |
| Sweaters | 4 | 21 |
| Abrigos | 2 | 19 |
| Blusas | 18 | 17 |
| Shorts | 20 | 16 |
| Complementos | 11 | 11 |
| Billeteras | 13 | 9 |
| Correas | 14 | 9 |
| Calzado | 22 | 9 |
| Enterizos | 16 | 5 |
| Poleras | 5 | 3 |
| **Total** | | **962** |

## 3. Productos huérfanos (solo hallados por barrido)

210 productos existen en `producto.php?id=` pero no se listan en ninguna categoría.

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
| 772 | Corset Victoria | Tops | 65.0 |
| 783 | Vestido Hellen blonda | Vestidos | 95.0 |
| 784 | Vestido Xiomara blonda | Vestidos | 89.0 |
| 787 | Cherry Bomb | Carteras | 75.0 |
| 794 | Vestido Carolina | Vestidos | 89.0 |
| 795 | Luna Velvet | Carteras | 75.0 |
| 798 | Vestido Ross rib | Vestidos | 55.0 |
| 802 | Mini vestido Olenka | Vestidos | 59.0 |
| 808 | Set Mireya brillos | Set | 110.0 |
| 814 | Falda short bolsillo BL | Faldas | 95.0 |
| 823 | Corset greicy cadena | Tops | 50.0 |
| 841 | MINI VESTIDO KYLIE HILO BLONDA | Vestidos | 55.0 |
| 851 | CLIP ORQUIDEA | Accesorios | 5.0 |
| 852 | GANCHO MARMOL | Accesorios | 5.0 |
| 854 | Eclipse Bag | Carteras | 89.0 |
| 863 | TOP SOLANGE LENTEJUELA | Tops | 59.0 |
| 883 | BIKINI | BIKINIS | 110.0 |
| 932 | vestido aura lunar | Vestidos | — |
| 944 | vestido florentina | Vestidos | 59.0 |
| 953 | Marfil Noir | Carteras | 69.0 |
| 990 | Cartera Gaia Tote | Carteras | 89.0 |
| 991 | Cartera Duna Bag | Carteras | 69.0 |
| 996 | top china | Tops | 95.0 |
| 1116 | TOP JACKY | Tops | 49.0 |
| 1118 | CASACA DUP | Chaquetas | — |
| 1120 | CARDIGAN CAMISERO ISABELLE | Abrigos | — |
| 1122 | TOP ASIMÉTRICO MAGNOLIA | Tops | — |
| 1123 | SWEATER TORTUGA HILO | Abrigos | — |
| 1125 | CASACA BEAR | Abrigos | — |
| 1127 | STRAIGHT JEANS BLUE | Pantalones | — |
| 1128 | PANTAON BONAGE | Pantalones | — |
| 1129 | FALDA SHORT DENIM CADERA | Faldas | — |
| 1130 | TOP ARI ASIMÉTRICO | Tops | — |
| 1132 | TOP GLORIA | Tops | — |
| 1133 | TOP OFF SHOULDER MABEL | Tops | — |
| 1139 | TOP OLIVIA | Tops | — |

## 4. Huecos de datos

| Hueco | Productos | % |
|---|---|---|
| Sin descripción | 313 | 32.5% |
| Sin ninguna imagen | 15 | 1.6% |
| Sin selector de color (tratados como color único) | 11 | 1.1% |
| Sin ninguna talla | 14 | 1.5% |
| Sin precio | 14 | 1.5% |
| Con precio de oferta | 13 | 1.4% |

IDs sin imagen: 621, 636, 735, 1116, 1118, 1120, 1122, 1125, 1127, 1128, 1129, 1130, 1132, 1133, 1139

IDs sin descripción (313): 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 384, 385, 388, 410, 468, 469, 470, 472, 484, 485, 486, 489, 493, 496, 497, 499, 500, 502, 505, 506, 508, 510, 634, 635, 636, 637, 652, 665, 666, 667, 669, 678, 679, 680, 681, 682, 683, 684, 685, 686, 687, 688, 689, 690, 691, 692, 693, 711, 712, 713, 714, 717, 718, 720 …

## 5. Precios

| Métrica | S/ |
|---|---|
| Mínimo | 3.00 |
| Máximo | 169.00 |
| Promedio | 64.58 |
| Mediana | 59.00 |

Productos donde el precio AJAX de algún color difiere del precio base: 54.
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

Colores únicos (por nombre, sin normalizar mayúsculas): **337**  
Tallas únicas: **46**

### Tallas encontradas (valor — nº de variantes)

`Standar` (1306), `Standard` (551), `S` (160), `M` (141), `único` (61), `L` (50), `XS` (47), `32` (46), `S-M` (43), `34` (42), `28` (40), `30` (39), `26` (37), `standar` (37), `37` (15), `36` (12), `39` (11), `35` (10), `38` (10), `Medium` (7), `Regulable` (7), `SMALL` (5), `MEDIUM` (5), `STANDAR` (5), `28-30-32` (4), `24` (3), `Cleo Charm` (3), `S-M-L` (3), `B` (2), `C` (2), `D` (2), `Mila Leopard` (2), `Kairo Taupe` (2), `Tosu Grace` (2), `The Tote Bag` (2), `Clasp bag` (2), `36-37` (2), `A` (1), `XL` (1), `M-L` (1), `s` (1), `CAR48873` (1), `35-37` (1), `36-37-39` (1), `standart` (1), `-` (1)

### Colores encontrados (valor — nº de productos)

`Negro` (370), `Blanco` (276), `Marrón` (226), `Beige` (157), `Vino` (144), `Único` (101), `Amarillo` (80), `Azul` (77), `Rojo` (71), `Celeste` (64), `Rosado` (43), `Verde` (36), `negro` (25), `Plomo` (23), `blanco` (22), `Gris` (21), `Plateado` (17), `Acero` (16), `Dorado` (16), `Crema` (14), `Rosado pastel` (14), `celeste` (14), `amarillo` (14), `Perla` (11), `rojo` (11), `vino` (11), `Azul acero` (11), `marrón` (11), `Rosa` (10), `Camel` (10), `Verde Pistacho` (9), `Color 1` (9), `Color 2` (9), `Marron` (9), `UNICO COLOR` (9), `Beige oscuro` (8), `Ladrillo` (8), `Color 3` (8), `Verde olivo` (8), `verde` (8), `azul` (8), `Beige claro` (7), `verde olivo` (7), `rosado` (7), `beige` (7), `tono 1` (6), `tono 2` (6), `Hueso` (6), `crema` (6), `NEGRO` (6), `Amarillo pastel` (6), `Azul marino` (5), `Animal Print` (5), `Celeste pastel` (5), `Guinda` (5), `tono 3` (4), `Anaranjado` (4), `Palo Rosa` (4), `Jade` (4), `Chocolate` (4)

… y 277 más. Lista completa de colores y tallas en `valores_unicos.json`.

Variantes del mismo color escritas de distinta forma (hay que normalizar al migrar):

- `acero` → 'ACERO', 'Acero'
- `amarillo` → 'AMARILLO', 'Amarillo', 'amarillo'
- `animal print` → 'Animal Print', 'Animal print', 'animal print'
- `azul` → 'AZUL', 'Azul', 'azul'
- `azul acero` → 'Azul Acero', 'Azul acero'
- `azul marino` → 'AZUL MARINO', 'Azul Marino', 'Azul marino', 'azul marino'
- `azul noche` → 'Azul Noche', 'Azul noche'
- `beige` → 'Beige', 'beige'
- `blanco` → 'BLANCO', 'Blanco', 'blanco'
- `blanco c/ celeste` → 'Blanco c/ Celeste', 'blanco c/ celeste'
- `cafe` → 'CAFE', 'Cafe', 'cafe'
- `café` → 'Café', 'café'
- `camel` → 'CAMEL', 'Camel'
- `celeste` → 'CELESTE', 'Celeste', 'celeste'
- `celeste pastel` → 'Celeste pastel', 'celeste pastel'
- `crema` → 'CREMA', 'Crema', 'crema'
- `dorado` → 'Dorado', 'dorado'
- `gris` → 'GRIS', 'Gris', 'gris'
- `marron` → 'MARRON', 'Marron', 'marron'
- `marrón` → 'Marrón', 'marrón'
- `morado` → 'MORADO', 'Morado'
- `mostaza` → 'Mostaza', 'mostaza'
- `naranja` → 'Naranja', 'naranja'
- `negro` → 'NEGRO', 'Negro', 'negro'
- `palo rosa` → 'Palo Rosa', 'palo rosa'
- `perla` → 'PERLA', 'Perla'
- `plateado` → 'Plateado', 'plateado'
- `plomo` → 'Plomo', 'plomo'
- `rojo` → 'ROJO', 'Rojo', 'rojo'
- `rojo terracota` → 'Rojo Terracota', 'Rojo terracota'
- `rosa` → 'Rosa', 'rosa'
- `rosa palo` → 'Rosa palo', 'rosa palo'
- `rosa pastel` → 'Rosa pastel', 'rosa pastel'
- `rosado` → 'ROSADO', 'Rosado', 'rosado'
- `tono 1` → 'Tono 1', 'tono 1'
- `tono 2` → 'Tono 2', 'tono 2'
- `tono 3` → 'Tono 3', 'tono 3'
- `verde` → 'VERDE', 'Verde', 'verde'
- `verde agua` → 'Verde agua', 'verde agua'
- `verde botella` → 'Verde Botella', 'verde botella'
- `verde olivo` → 'Verde Olivo', 'Verde olivo', 'verde olivo'
- `verde oscuro` → 'Verde Oscuro', 'verde oscuro'
- `verde pastel` → 'Verde Pastel', 'Verde pastel'
- `vino` → 'VINO', 'Vino', 'vino'

## 7. Imágenes

| Métrica | Valor |
|---|---|
| URLs únicas | 2197 |
| Descargadas y convertidas | 2197 |
| Fallidas | 0 |
| Peso original | 593.2 MB |
| Peso WebP (thumb 500 + full 1400, q82) | 174.0 MB |
| Ahorro | 70.7% |


Las tres variantes del sitio (`data-tiny`, `data-small`, `data-large`) apuntan al mismo archivo: solo existe una resolución por imagen.

## 8. Diferencia contra la extracción previa (752 productos)

| Métrica | Valor |
|---|---|
| Productos en la extracción previa | 752 |
| Productos en esta extracción | 962 |
| IDs nuevos | 210 |
| IDs que ya no aparecen | 0 |

IDs nuevos: 9, 16, 22, 24, 40, 41, 42, 43, 46, 47, 48, 52, 53, 55, 56, 57, 58, 59, 69, 73, 74, 75, 76, 78, 79, 84, 89, 95, 101, 106, 107, 109, 116, 118, 128, 132, 134, 141, 149, 151, 152, 155, 156, 157, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 180, 192, 204, 206, 216, 217, 219, 222, 223, 224, 255, 261, 262, 263, 265, 267, 268, 269, 270, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 284, 286, 287, 298, 299, 320, 321, 326, 329, 331, 332, 337, 338, 339, 343, 345, 346, 347, 348, 349, 350, 352, 353, 354, 356, 372, 378, 382, 384, 385, 388, 398, 400, 401, 404, 408, 410, 415, 421, 422, 425, 428, 438, 439, 441, 442, 443, 449, 450, 456, 486, 499, 505, 506, 508, 512, 515, 517, 522, 533, 540, 542, 559, 570, 586, 588, 597, 604, 612, 621, 635, 636, 638, 641, 642, 644, 646, 647, 649, 651, 652, 653, 654, 656, 677, 696, 705, 710, 714, 744, 745, 772, 783, 784, 787, 794, 795, 798, 802, 808, 814, 823, 841, 851, 852, 854, 863, 883, 932, 944, 953, 990, 991, 996, 1116, 1118, 1120, 1122, 1123, 1125, 1127, 1128, 1129, 1130, 1132, 1133, 1139

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

Sin descripción: 285 antes → 313 ahora.

## 9. Campos que NO existen en la web — hay que pedirlos a los dueños

| Campo | Estado | Por qué |
|---|---|---|
| Stock numérico | `null` en todos | No hay cantidad pública. El `max="5"` del input de cantidad es un límite del formulario, no stock. **No hace falta pedirlo: esta tienda no lleva stock real** — ver nota abajo. |
| Agotado / disponibilidad real | `null` en todos | `product:availability` dice `in stock` en el 100% de las fichas, también en productos desactivados. Dato público inútil: ignorado. **Sí existe en el panel** (botón `Agotar Stock` y estado activo/inactivo): hay que pedirlo. |
| SKU real | `null` | Solo existe `product:retailer_item_id` (p. ej. `1102SUP53656`), que es un identificador de retailer, no necesariamente el SKU interno. Se guarda aparte, sin presumir equivalencia. |
| Descripciones faltantes | 313 productos | La ficha trae `div.tit_desc` vacío. Hay que redactarlas o pedirlas. |
| Peso / medidas / material / guía de tallas | no existe | Ningún campo público. |
| Costo, margen, proveedor | no existe | Datos internos, nunca públicos. |
| Orden de catálogo / destacados | parcial | Se puede inferir del orden de las tarjetas en cada categoría, no hay campo explícito. |

### Nota: el stock del panel es nominal, no inventario

El panel sí tiene columna `Stock`, desglosada por color y talla. Pero en todas las filas inspeccionadas el valor es **1**: `PONCHO` (4 colores), `SWEATER JULIETTE` (6), `CHAQUETA CUERO URBAN` (3) y `Flare Pants Chompero` (5 colores × 2 tallas) — todo a 1.

La conclusión no es *pedir el stock*, es que **la tienda no lleva control de inventario**: el 1 está puesto para que el formulario de compra acepte el pedido. Si el catálogo nuevo necesita stock, hay que montarlo desde cero con los dueños, no migrarlo.

### Hallazgo de seguridad: los productos desactivados siguen siendo públicos

Un producto desactivado en `ll-admin` desaparece de los listados, pero su ficha sigue respondiendo en `producto.php?id=` con nombre, precio, colores, tallas e imágenes. Cualquiera con el enlace ve un producto dado de baja, y así se encontraron los huérfanos de la sección 3. Conviene avisar a los dueños: en el catálogo nuevo, desactivar debería devolver 404.

## 10. Imágenes

| Métrica | Valor |
|---|---|
| URLs únicas | 2197 |
| Convertidas a WebP | 2197 |
| Fallidas | 0 |
| Peso originales | 593.2 MB |
| Peso WebP (thumb 500px + full 1400px) | 174.0 MB |
| Ahorro | 70.7% |
| Calidad WebP | 82 |

## 11. Archivos generados

- ✓ `productos_completo.json` — catálogo completo, un objeto por producto
- ✓ `productos_completo.csv` — el mismo catálogo, una fila por producto
- ✓ `variantes_completo.csv` — una fila por color × talla, para cargar el catálogo nuevo
- ✓ `ids_encontrados.json` — todos los IDs válidos con su origen
- ✓ `ids_invalidos.json` — IDs probados que dieron 404 o ficha vacía
- ✓ `imagenes_map.json` — URL original → archivos locales → producto y color
- ✓ `imagenes_resumen.json` — totales de imágenes y pesos
- ✓ `progress.json` — estado de reanudación
- ✓ `errores.json / errores_productos.json` — fallos de red y de extracción
- ✓ `html/` — cada respuesta HTML cruda, tal como llegó
- ✓ `robots.txt` — robots.txt del sitio al momento de la corrida
- ✓ `run_meta.json` — metadatos de la corrida (peticiones, tiempos, user-agent)

