# HEX

Landing de servicios digitales. HTML, CSS y JavaScript sin dependencias ni paso de build:
se publica subiendo la carpeta tal cual.

```
index.html            Toda la página. El sprite de iconos va incrustado al inicio del body.
assets/css/styles.css Tokens de diseño y estilos.
assets/js/main.js     Menú, reveals, acordeón y formulario.
assets/fonts/         Tipografías auto-hospedadas (woff2 variable).
```

## Antes de publicar

1. **Número de WhatsApp.** Ahora mismo es `https://wa.me/000000000`, que es un marcador
   inválido a propósito. Está en dos sitios de `index.html`, ambos marcados con `data-wa`:
   la sección de contacto y el pie. Usa formato internacional sin signos ni espacios
   (`34600112233`, `573001234567`). Actualiza también `telephone` en el bloque JSON-LD.
   El formulario lee ese mismo enlace, así que no hay que tocarlo en ningún sitio más.
2. **Sección "Trabajo reciente".** Los tres proyectos son huecos vacíos. En cada uno hay que
   sustituir el `<span class="slot">` por una imagen real y rellenar nombre, tipo y año.
   Si todavía no hay proyectos publicables, borra la sección `#trabajo` entera y sus enlaces
   en la navegación y en el menú móvil.
3. **Imagen para compartir en redes.** Falta `assets/og.png` (1200x630) y sus metaetiquetas
   `og:image` y `twitter:image`, marcadas con un TODO en `index.html`.
4. **Dominio.** Cambia `https://hex.studio/` en `<link rel="canonical">` y en el bloque JSON-LD.
5. **Plazos y compromisos.** Las respuestas del FAQ mencionan plazos concretos
   (una o dos semanas para una landing, tres a cinco para una web corporativa) y un periodo de
   soporte incluido. Ajústalos a lo que realmente ofreces antes de publicar.
6. **Tecnologías.** La marquesina lista React, Next.js, Supabase, n8n y demás. Quita las que
   no uses: es una promesa implícita al cliente.

## Formulario

Sin configurar, el formulario abre WhatsApp con el mensaje ya redactado (nombre, servicio,
mensaje y correo de contacto), así que funciona desde el primer día sin backend.

Para recibir los envíos sin que el visitante salga de la web, pon tu endpoint en
`FORM_ENDPOINT`, arriba del todo en `assets/js/main.js`. Sirve cualquier servicio que acepte
un POST con `FormData` (Formspree, Netlify Forms, Web3Forms o una API propia).

## Decisiones de diseño

- **Tema bloqueado en oscuro.** Es una decisión de marca, no un descuido. Todas las secciones
  comparten el mismo tema: ninguna se invierte a claro.
- **Un solo color de acento** (`--accent`, cian) en toda la página. `--danger` solo se usa
  para errores de formulario, no es color de marca.
- **Radios:** 6px en superficies e interactivos, redondeo completo solo en las pills de metadato.
- **Movimiento continuo:** el fondo tiene manchas de luz que se desplazan siempre, tanto en
  toda la página (`.bg-fx`) como en el hero (`.aurora`). Solo se anima `transform`, que el
  navegador resuelve en la GPU sin recalcular el layout.
- **Tipografías:** Bricolage Grotesque para titulares, Schibsted Grotesk para texto,
  JetBrains Mono para etiquetas y códigos. Auto-hospedadas, sin peticiones a Google Fonts.
- **Contrastes** verificados contra WCAG AA sobre el fondo `#08090c`: texto secundario 9.6:1,
  texto terciario 5.1:1, acento 11.0:1, y el texto oscuro sobre el botón cian 9.2:1. El texto
  del hero se midió además sobre el punto más brillante de la aurora en movimiento (5.6:1),
  no solo sobre el fondo plano.
- **Movimiento:** todo respeta `prefers-reduced-motion`. No hay listeners de scroll por frame,
  se usa IntersectionObserver.

## Vídeo de fondo del hero

El hueco ya está montado en `index.html`, dentro de `.hero__bg` y comentado. Para activarlo:

1. Deja el vídeo en `assets/` (recomendado: 1920x1080, bucle de menos de 8 segundos, sin audio,
   por debajo de 3 MB, y en `webm` más `mp4` para cubrir todos los navegadores).
2. Añade un `assets/hero-poster.jpg` para que no aparezca un hueco negro mientras carga.
3. Descomenta el bloque `<video>`.
4. Añade la clase `hero--video` a la sección: `<section class="hero hero--video" id="inicio">`.
   Eso oculta el mosaico de color y refuerza el velo oscuro para que el titular siga legible
   por encima del vídeo.

El vídeo va sin `autoplay` con sonido, con `muted` y `playsinline`, que es lo único que los
navegadores móviles permiten reproducir solo.

## Publicar

Es un sitio estático. Sirve cualquier hosting:

```bash
# Vista previa local
python3 -m http.server 8000

# Netlify
npx netlify deploy --prod --dir .

# Vercel
npx vercel --prod
```
