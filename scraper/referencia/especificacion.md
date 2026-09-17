# PROMPT — Extracción completa EUCHEL (Fase 1)

## Objetivo

Extraer **el 100%** del catálogo público de `https://euchelperu.com` para migrarlo
a un catálogo nuevo. Cliente autorizado: los dueños de la tienda encargaron el
trabajo.

Ya existe una extracción parcial previa que dejó 752 productos con datos
incompletos. Esta corrida debe ser **completa y desde cero**, sin depender de
esos archivos salvo como referencia cruzada.

---

## Lo que YA se sabe del sitio (verificado)

Sitio PHP a medida. Sin API. Sin paginación: cada categoría lista todos sus
productos en una sola página.

### Estructura

| Recurso | URL |
|---|---|
| Categorías | `menu.php?subid=N` — N de 2 a 22 |
| Novedades | `nuevo.php` |
| Ofertas | `ofertas.php` |
| Ficha producto | `producto.php?id={idProd}` |
| Búsqueda | `busqueda.php` (POST, campo `search`) |

Categorías: 2 Abrigos, 3 Tops, 4 Sweaters, 5 Poleras, 6 Pantalones, 7 Faldas,
8 Vestidos, 9 Chaquetas, 10 Set, 11 Complementos, 12 Carteras, 13 Billeteras,
14 Correas, 15 Cuidado personal, 16 Enterizos, 17 Perfumes, 18 Blusas,
19 Accesorios, 20 Shorts, 21 Bikinis, 22 Calzado.

### Endpoints AJAX de variantes (clave)

La ficha carga color → talla/precio/fotos por separado:

```
genera_talla.php?id={idColor}
genera_precio.php?id={idColor}&idprod={idProd}
listar_foto2.php?id={idColor}&idprod={idProd}
```

`idColor` sale de `<select id="clickfoto" name="txt_color">` →
`<option value="3344">Marrón</option>`.

### Selectores confirmados

**Ficha de producto (`producto.php?id=`)**
- Nombre: `h1.nmbpro`
- Categoría: breadcrumb `div.retorno ul li a[href*="menu.php?subid="]` (texto + subid)
- Descripción: contenido tras `div.tit_desc`, dentro de `div.informacion`
- Colores: `select#clickfoto option` → `value` = idColor, texto = nombre color
- Galería inicial: `div.image-data img[src]` y `div.data[data-large]`
- Meta útiles: `product:price:amount`, `product:price:currency`,
  `product:retailer_item_id`, `product:item_group_id`, `product:brand`,
  `product:availability`

**Listado de categoría (`menu.php?subid=`)**
- Tarjeta: `div.producto`
- Link: `div.nombre a[href^="producto.php?id="]`
- Imagen: `div.imagen img[src]`
- Precio vigente: `div.precio div.normal`
- Precio anterior: `div.precio div.oferta` (solo si existe)
  → mapear: `precio` = valor de `.normal`, `precio_oferta` = valor de `.oferta`
  cuando aparecen ambos

**`genera_talla.php`**
- Tallas: `span[name="spancolor"]` → `id` = idTalla, texto = nombre de talla

**`genera_precio.php`**
- Precio del color: texto dentro de `div.precio` (formato `S/. 55.00`)
- `input[name="id_codigo"]` confirma el idColor

**`listar_foto2.php`**
- Imágenes de ese color: `div.image-data img[src]` y `div.data[data-large]`

### Datos que NO existen públicamente

No inventar. Dejar `null` y documentar:
- Stock numérico. El `max="5"` del input cantidad **no es stock**.
- SKU real. Solo hay `retailer_item_id` (ej. `1102SUP53656`).
- `product:availability` siempre dice `in stock` → dato inútil, ignorarlo para
  determinar agotados.

---

## TAREA 1 — Descubrimiento total de IDs

La extracción previa encontró 752 productos vía categorías (IDs 25 a 1367).
Eso **no garantiza** que sean todos: puede haber productos sin categoría,
ocultos del menú o fuera del rango.

Hacer las tres cosas:

1. **Recorrer las 21 categorías** + `nuevo.php` + `ofertas.php` y recoger todos
   los `producto.php?id=`.
2. **Barrido completo de IDs de 1 a 1500.** Petición a cada `producto.php?id=N`.
   - Producto válido = la página devuelve 200 **y** `h1.nmbpro` no está vacío.
   - Registrar los que dan 404 o llegan vacíos en `/data/ids_invalidos.json`.
   - Si se encuentran productos válidos cerca del ID 1500, **extender el barrido**
     de 100 en 100 hasta tener 50 IDs inválidos consecutivos.
3. **Unificar** ambas fuentes. Marcar cada producto con `origen`:
   `categoria`, `barrido` o `ambos`. Los de solo `barrido` son productos
   huérfanos: reportarlos aparte, probablemente están ocultos a propósito.

Guardar `/data/ids_encontrados.json` con el total y detalle.

---

## TAREA 2 — Extracción por producto

Para **cada ID válido**:

1. Descargar `producto.php?id={id}` y parsear los campos base.
2. Leer todos los `option` del select de colores.
3. Para **cada color**, llamar a los tres endpoints:
   - `genera_talla.php?id={idColor}` → lista de tallas (id + nombre)
   - `genera_precio.php?id={idColor}&idprod={id}` → precio de ese color
   - `listar_foto2.php?id={idColor}&idprod={id}` → imágenes de ese color
4. Si el producto no tiene select de colores, tratarlo como color único y usar
   el precio del meta `product:price:amount` y las imágenes de la ficha.

### Estructura de salida

```json
{
  "id_original": 1102,
  "url_original": "https://euchelperu.com/producto.php?id=1102",
  "nombre": "SUPLEX FLARE PANTS",
  "descripcion": "",
  "categoria": "Pantalones",
  "categoria_subid": 6,
  "precio_base": 55.00,
  "precio_oferta": null,
  "retailer_item_id": "1102SUP53656",
  "marca": "Basic 21 Perú",
  "origen": "ambos",
  "colores": [
    {
      "id_color": 3344,
      "nombre": "Marrón",
      "precio": 55.00,
      "tallas": [{ "id_talla": 3708, "nombre": "Standar" }],
      "imagenes": [
        "https://euchelperu.com/images/productos/177698613645708641868302.jpg"
      ]
    }
  ],
  "imagenes_ficha": ["..."],
  "stock": null,
  "agotado": null,
  "scraped_at": "2026-09-17T00:00:00Z"
}
```

Salida: `/data/productos_completo.json` y `/data/productos_completo.csv`.

### Reglas del scraper

- **1 request concurrente. Pausa de 500 ms después de cada respuesta.**
  Es el servidor de producción de un cliente real. La corrida anterior usó
  32–48 workers; eso no se repite.
- **Reanudable.** Progreso en `/data/progress.json`. Si se corta, continúa.
- Cachear en disco cada HTML crudo en `/data/html/` para no re-pedir al
  re-procesar.
- 3 reintentos con backoff exponencial. Fallos a `/data/errores.json`.
- Log por consola: `[347/752] id=1102 ok — 3 colores, 3 imgs`.
- Timeout 45 s por request.
- User-Agent identificable.
- Volcar `robots.txt` a `/data/robots.txt` como registro.

---

## TAREA 3 — Imágenes

1. Deduplicar la lista global de URLs de imagen.
2. Descargar todas a `/data/images/originales/`.
3. Convertir con `sharp` a WebP calidad 82, en dos tamaños:
   - `thumb`: 500 px de ancho
   - `full`: 1400 px de ancho
   Nunca escalar por encima del tamaño original.
4. Guardar como `/data/images/webp/{hash}-{tamaño}.webp`.
5. Mapear en `/data/imagenes_map.json`: URL original → rutas locales →
   producto e id_color al que pertenece.
6. Reanudable: saltar lo ya descargado y convertido.
7. Reportar: total de imágenes, fallidas, peso antes y después.

Nota: las tres variantes del sitio (`data-tiny`, `data-small`, `data-large`)
apuntan al mismo archivo. Solo hay una resolución. No buscar versiones
alternativas.

---

## TAREA 4 — Reporte de auditoría

Generar `/data/reporte.md` con:

- Total de IDs probados, válidos, inválidos
- Productos por categoría
- Productos huérfanos (solo encontrados por barrido)
- Productos sin descripción
- Productos sin imágenes
- Productos sin colores o sin tallas
- Productos con precio de oferta
- Distribución de precios (mín, máx, promedio)
- Total de colores y tallas únicas encontradas (lista de valores)
- Total de imágenes, peso antes/después de WebP
- Diferencia contra la extracción previa de 752: qué IDs son nuevos, cuáles
  ya no aparecen
- Lista explícita de campos que no existen en la web y habrá que pedir a los
  dueños (stock, agotados, SKU real, descripciones faltantes)

---

## Orden de ejecución

1. Escribir el script.
2. **Probar con 5 IDs conocidos**: 25, 28, 1102, 113, 1367. Mostrarme el JSON
   resultante y esperar mi visto bueno.
3. Solo entonces correr el barrido completo.
4. Luego imágenes.
5. Luego reporte.

---

## Reglas duras

- No inventar ningún dato. Si un campo no existe, `null` y anotarlo en el reporte.
- No tocar `sesion.php`, `compra.php`, `busqueda.php`, `libroreclamaciones.php`,
  `/ll-admin` ni ninguna ruta de cuenta, carrito o administración.
- No enviar formularios POST.
- Todo debe quedar en disco local, no solo en memoria.
- Si el sitio empieza a responder 429, 403 o 5xx: **detenerse**, avisarme, no
  insistir.
