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

1. **Correo de contacto.** Ahora mismo es `hola@hex.studio`, que es un marcador.
   Aparece en tres sitios: la sección de contacto, el pie y `CONTACT_EMAIL` en `assets/js/main.js`.
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

Sin configurar, el formulario abre el cliente de correo del visitante con el mensaje ya
redactado, así que funciona desde el primer día sin backend.

Para recibir los envíos sin que el visitante salga de la web, pon tu endpoint en
`FORM_ENDPOINT`, arriba del todo en `assets/js/main.js`. Sirve cualquier servicio que acepte
un POST con `FormData` (Formspree, Netlify Forms, Web3Forms o una API propia).

## Decisiones de diseño

- **Tema bloqueado en oscuro.** Es una decisión de marca, no un descuido. Todas las secciones
  comparten el mismo tema: ninguna se invierte a claro.
- **Un solo color de acento** (`--accent`, naranja) en toda la página. `--danger` solo se usa
  para errores de formulario, no es color de marca.
- **Radios:** 6px en superficies e interactivos, redondeo completo solo en las pills de metadato.
- **Tipografías:** Bricolage Grotesque para titulares, Schibsted Grotesk para texto,
  JetBrains Mono para etiquetas y códigos. Auto-hospedadas, sin peticiones a Google Fonts.
- **Contrastes** verificados contra WCAG AA sobre el fondo `#0b0b0c`: texto secundario 7.5:1,
  texto terciario 4.8:1, acento 6.2:1, y el texto oscuro sobre el botón naranja 6.2:1.
- **Movimiento:** todo respeta `prefers-reduced-motion`. No hay listeners de scroll por frame,
  se usa IntersectionObserver.

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
