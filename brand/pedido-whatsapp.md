# El pedido por WhatsApp

Cómo se arma el mensaje y qué tiene que generar el sitio para que quien
atiende identifique el producto de inmediato.

## El mensaje

`wa.me` solo acepta texto: **no se puede adjuntar una imagen desde un
enlace.** La foto llega porque el mensaje incluye la URL de la ficha y
WhatsApp genera una tarjeta de vista previa a partir de sus etiquetas
Open Graph.

Botón "Continuar compra" →
`https://wa.me/51986630221?text=<mensaje url-encoded>`

Mensaje (los `\n` se codifican; WhatsApp los respeta):

```
Hola Euchel, quiero continuar mi compra:

Pantalón Jean Wide Leg
Color: Tono 2  ·  Talla: 30
S/ 95  ·  Ref. 25

https://euchelperu.com/p/25-pantalon-jean-wide-leg?c=68
```

Cada línea tiene una razón:

| Parte | Para qué |
|---|---|
| Color y talla | Ya elegidos por el cliente: no hay que preguntarlos |
| `Ref. <id>` | Es `id_original`, **el mismo ID del panel**: `ll-admin/productos.php?edit=<id>` abre esa ficha. Verificado con el ID 1364 = TOP CELESTIA |
| URL al final | WhatsApp la convierte en tarjeta con foto, nombre y precio |
| `?c=<id_color>` | Abre la ficha ya en el color pedido (`id_color` del JSON) |

La URL va **al final** a propósito: la tarjeta se renderiza arriba de la
burbuja y el texto queda legible debajo.

## Lo que el sitio tiene que generar

Cada ficha necesita estas etiquetas en el `<head>`, o no hay tarjeta:

```html
<meta property="og:type"        content="product">
<meta property="og:title"       content="Pantalón Jean Wide Leg">
<meta property="og:description" content="S/ 95 · Pantalones · Euchel Perú">
<meta property="og:image"       content="https://<dominio>/img/og/25.jpg">
<meta property="og:url"         content="https://<dominio>/p/25-pantalon-jean-wide-leg">
<meta property="og:site_name"   content="Euchel Perú">
```

Reglas de la imagen de vista previa:

- **JPEG, no WebP.** El soporte de WebP en las vistas previas de WhatsApp
  es irregular. Los JPG originales están en `scraper/data/images/originales/`
  (no versionados; `imagenes_map.json` mapea cada URL a su archivo).
- URL **absoluta**, sobre HTTPS y accesible sin login.
- Por debajo de ~300 KB, si no WhatsApp puede omitir la miniatura.
- Una por producto, la primera de su galería.

## Límites que hay que aceptar

- **La tarjeta la arma WhatsApp, no nosotros.** Necesita que el dominio
  esté publicado. En local o antes de publicar, no aparece.
- **La foto es la del producto, no la del color elegido.** Las etiquetas OG
  son por página; el color va en el texto y en `?c=`.
- Si WhatsApp no logra leer la URL, el mensaje llega igual, solo sin foto.
  Por eso el texto se sostiene solo.

## Pendiente

El dominio. En el diseño es un ajuste editable con `euchelperu.com` por
defecto, que es el dominio actual de la tienda — hay que confirmar si el
catálogo nuevo vive ahí o en otro.
