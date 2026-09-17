# Extracción EUCHEL — Fase 1

Extracción completa del catálogo público de `https://euchelperu.com` para migrarlo
a un catálogo nuevo. Encargo autorizado por los dueños de la tienda.
Especificación literal en [`referencia/especificacion.md`](referencia/especificacion.md).

## Estado

El código está escrito y probado offline contra respuestas reales del sitio
(`fixtures/`, `test_parsers.py`: 25/25 checks en verde).

**La corrida contra el sitio NO se ejecutó.** La sesión donde se escribió esto
tiene bloqueado `euchelperu.com` por política de red
(`CONNECT euchelperu.com:443 → HTTP 403`). Hay que correrlo desde una máquina con
salida a internet.

## Requisitos

- Python 3.9+ — solo librería estándar, no hay que instalar nada.
- Node 18+ y `npm install` (solo para la tarea 3, que usa `sharp`).

## Orden de ejecución

```bash
cd scraper

# 1. Smoke test obligatorio: 5 IDs conocidos. Revisar el JSON antes de seguir.
python3 euchel_scrape.py --prueba
#    -> imprime el JSON y lo deja en data/muestra_prueba.json

# 2. Corrida completa (tareas 1 y 2)
python3 euchel_scrape.py
#    -> data/productos_completo.json, .csv, variantes_completo.csv,
#       ids_encontrados.json, ids_invalidos.json, html/, progress.json

# 3. Imágenes (tarea 3)
npm install
node imagenes.mjs
#    -> data/images/originales/, data/images/webp/, imagenes_map.json

# 4. Reporte de auditoría (tarea 4)
python3 reporte.py
#    -> data/reporte.md
```

Se puede cortar cualquier paso con Ctrl-C y relanzar el mismo comando: todo es
reanudable desde disco.

### Otras opciones

```bash
python3 euchel_scrape.py --ids 25,1102,1367   # solo esos IDs
python3 euchel_scrape.py --sin-barrido        # omite el barrido 1..1500
python3 euchel_scrape.py --tope-barrido 2000  # cambia el tope inicial
python3 euchel_scrape.py --data /otra/ruta    # cambia el directorio de salida
node imagenes.mjs --pausa 800                 # más lento con las imágenes
node imagenes.mjs --solo-convertir            # no descarga, solo convierte a WebP
python3 test_parsers.py                       # tests offline, sin red
```

## Cuánto tarda

Una petición a la vez con 500 ms de pausa después de cada respuesta, según lo
pedido. Estimación:

| Fase | Peticiones | Tiempo aprox. |
|---|---|---|
| Listados (21 categorías + nuevo + ofertas) | 23 | < 1 min |
| Barrido 1..1500 | 1500 (menos los ya cacheados) | ~20 min |
| Fichas + 3 endpoints AJAX por color | ~750 fichas + ~3×nº de colores | 2–4 h |
| Imágenes (~1800 archivos) | ~1800 | ~40 min |

Total: **una tarde**. Es intencional. La corrida anterior usó 32–48 workers
contra el servidor de producción del cliente; esto no se repite.

## Reglas que el código respeta

- 1 petición concurrente, pausa de 500 ms **después** de cada respuesta.
- Timeout 45 s, 3 reintentos con backoff 2 s / 4 s / 8 s.
- Ante **429, 403 o 5xx: se detiene y avisa** (`exit 2`). No insiste.
  El progreso queda en disco.
- Reanudable: HTML crudo en `data/html/`, un JSON por producto en
  `data/productos/`, estado en `data/progress.json`.
- Solo GET. Cero POST. `busqueda.php` nunca se toca.
- URLs con `sesion`, `compra`, `busqueda`, `libroreclamaciones` o `ll-admin`
  lanzan excepción si algo intenta pedirlas.
- User-Agent identificable: `EuchelCatalogMigration/1.0 (...)`.
- `robots.txt` se guarda en cada corrida como registro.

## Qué no existe en la web y se deja en `null`

No se inventa ningún dato:

- **stock numérico** — el `max="5"` del input de cantidad es un límite del
  formulario, no inventario.
- **agotado** — `product:availability` dice `in stock` en todas las fichas; es
  un dato inútil y se ignora a propósito.
- **SKU real** — solo existe `product:retailer_item_id` (p. ej. `1102SUP53656`),
  que se guarda en su propio campo sin presumir que sea el SKU interno.

El reporte lista esto explícitamente como lo que hay que pedirle a los dueños.

## Ambigüedad de precios (decidir con el cliente)

En las tarjetas de listado, `div.normal` es el precio vigente y `div.oferta` el
precio anterior tachado. La especificación pide mapear `precio` = `.normal` y
`precio_oferta` = `.oferta`, y así está implementado — pero eso significa que
`precio_oferta` contiene el precio **antes** del descuento, no el rebajado. Los
dos valores crudos se guardan además en `precio_listado_normal` y
`precio_listado_oferta` para poder rehacer el mapeo sin volver a scrapear.
El reporte lo marca.

## Archivos

| Archivo | Qué es |
|---|---|
| `euchel_scrape.py` | Tareas 1 y 2: descubrimiento de IDs y extracción por producto |
| `imagenes.mjs` | Tarea 3: descarga + WebP q82 en 500 px y 1400 px |
| `reporte.py` | Tarea 4: `data/reporte.md` |
| `minidom.py` | Árbol HTML mínimo sobre `html.parser`, sin dependencias |
| `test_parsers.py` | Tests offline de todos los parsers |
| `fixtures/` | Respuestas reales del sitio usadas por los tests |
| `referencia/` | Extracción previa de 752 productos y la especificación |

`data/` no se versiona: son cientos de MB de HTML e imágenes.

## Estructura de salida por producto

```json
{
  "id_original": 1102,
  "url_original": "https://euchelperu.com/producto.php?id=1102",
  "nombre": "SUPLEX FLARE PANTS",
  "descripcion": "",
  "categoria": "Pantalones",
  "categoria_subid": 6,
  "precio_base": 55.0,
  "precio_oferta": null,
  "moneda": "PEN",
  "retailer_item_id": "1102SUP53656",
  "item_group_id": "1102",
  "marca": "Basic 21 Perú",
  "origen": "ambos",
  "colores": [
    {
      "id_color": 3344,
      "nombre": "Marrón",
      "precio": 55.0,
      "id_color_confirmado": 3344,
      "tallas": [{ "id_talla": 3708, "nombre": "Standar" }],
      "imagenes": ["https://euchelperu.com/images/productos/1776986136...jpg"]
    }
  ],
  "imagenes_ficha": ["..."],
  "nombre_listado": "SUPLEX FLARE PANTS",
  "precio_listado_normal": 55.0,
  "precio_listado_oferta": null,
  "stock": null,
  "agotado": null,
  "scraped_at": "2026-09-17T00:00:00Z"
}
```

Productos sin `select#clickfoto` se guardan con un color único
`{"id_color": null, "nombre": "Único"}`, precio del meta e imágenes de la ficha.
