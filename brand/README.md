# Marca Euchel — extraída de euchelperu.com

Activos y hojas de estilo del sitio actual, tomados de la fuente real para
que el catálogo nuevo conserve la identidad. Migración autorizada por los
dueños de la tienda.

| Archivo | Origen |
|---|---|
| `logo.svg` | `images/svg/logo.svg` (viewBox 910×168, relleno #262626) |
| `favicon.png` | `images/favicon.png` |
| `styles.min.css` | hoja principal del sitio |
| `style.min.css` | hoja de la ficha de producto |

## Sistema visual (lo que dicen las hojas)

- **Tipografía:** Montserrat (Google Fonts, 100–900 + itálica). Base 14 px.
- **Texto:** #0a0a0a; títulos de ficha #1a1a1a; secundario #333 / #4d4d4d.
- **Acento:** #d3255c (frambuesa). Usos en el sitio: precio tachado, sello
  "oferta", sello "agotado", botones primarios, errores.
- **Neutros:** bordes #ccc / #e6e6e6, fondos suaves #f2f2f2, blanco.
- **Radio:** .5rem (8 px) dominante; .4rem y .6rem puntuales.
- **Mayúsculas** con tracking en nombres, menú y botones.
- **Hover de botón:** pasa a #333 / negro.
- **Único movimiento:** zoom 1.03 de la foto de tarjeta, .5s ease.
- Redes: facebook.com/Euchel.pe · instagram.com/euchel.pe · tiktok.com/@euchel.pe
- Barra de anuncio negra con texto blanco en la cabecera; menú centrado bajo el logo.

## Movimiento propuesto para el catálogo nuevo (no existe en el sitio)

Duraciones 150 / 250 / 600 ms, curva `cubic-bezier(.2,.7,.2,1)`, aparición
escalonada de tarjetas (80 ms entre cada una), zoom de foto 1.04, elevación
de tarjeta en escritorio, subrayado que crece en el menú, botón pulsado a
escala .98. Todo respeta `prefers-reduced-motion`.

El diseño está en el canvas de Claude Design "Catálogo Euchel".
