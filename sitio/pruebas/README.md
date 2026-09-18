# Pruebas de integración

Corren contra producción con cuentas de prueba. Verifican que el panel del
equipo, el de administración y el catálogo público hagan lo que deben, y
que cada cambio guardado en el panel se vea en el catálogo en la siguiente
petición, sin desplegar.

| Archivo | Qué prueba | Cómo |
|---|---|---|
| `permisos.sh` | 13 rutas × 4 roles (sin sesión, sin acceso, equipo, admin) | curl |
| `propagacion.mjs` | 34 pasos: crear, fotos, colores, tallas, agotar, precio, nombre, categoría, ocultar, archivar, borrar, bitácora | API + HTML público |
| `flujos.mjs` | 30 pasos en navegador: entrar, filtros, paginar, buscar, hoja, clave, sesión, tablero, equipo, bitácora, ficha pública, WhatsApp | Playwright |
| `hoja.mts` | 8 casos: la hoja de estilos dentro del HTML (se lee una vez, respaldo si falla, nada de `</style>` suelto) | npx tsx |
| `render.mts` | arma páginas con el código de la función para compararlas | node --experimental-strip-types |
| `proxy.mjs` | arnés local: sirve los paneles en http y reenvía todo lo demás a producción | node |

## Preparar

1. Crear las cuentas de prueba desde el panel de admin, pestaña Equipo:
   `qa.equipo@euchel.pe` (rol Equipo) y `qa.user@euchel.pe` (rol "user",
   se crea por la API de admin con `"role":"user"`; el registro público está
   cerrado a propósito).
2. Un archivo de entorno, fuera del repo:

   ```
   ADMIN_EMAIL=…
   ADMIN_CLAVE=…
   CLAVE_EQUIPO=…
   CLAVE_USER=…
   ```

3. Una foto de prueba en `/tmp/foto1.jpg` (o `FOTO_PRUEBA=…`).
4. Playwright: `npm i --no-save playwright` en una carpeta aparte; Chromium
   del contenedor en `/opt/pw-browsers/chromium`.

## Correr

```sh
npx tsx sitio/pruebas/hoja.mts   # sin cuentas ni red

export $(cat qa.env | xargs)
sh permisos.sh
node propagacion.mjs
node proxy.mjs &          # necesita /tmp/euchel-paquete/dist (sitio/empaquetar.sh)
node flujos.mjs
```

Uno detrás de otro, no a la vez: `flujos.mjs` cuenta productos (962, 210
ocultos) y las otras crean productos de prueba mientras corren.

## Por qué el arnés

Chromium en el contenedor no confía en la CA del proxy de salida, así que
ir directo a la URL https da `ERR_CERT_AUTHORITY_INVALID`. Node sí confía.
El arnés sirve los paneles en http local y reenvía `/auth/*`, `/api/*` y
las páginas del catálogo a producción. Al bajar la cookie de sesión por
http hay que quitarle `Secure` **y el prefijo `__Secure-`** del nombre
(Chromium rechaza ese prefijo sin https) y devolvérselo al subir.

El proxy de salida corta una de cada ~30 conexiones: `permisos.sh` y
`propagacion.mjs` reintentan solo cuando la respuesta llega vacía, nunca
cuando la API respondió de verdad.

Todas terminan borrando lo que crearon.
