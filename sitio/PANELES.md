# Paneles del equipo

Dos aplicaciones sobre el mismo catálogo, en el mismo dominio.

| Panel | Dirección | Quién entra | Qué puede hacer |
|---|---|---|---|
| Equipo | `/trabajador/` | rol `trabajadora` y rol `admin` | agotar, ocultar, agotar un color o una talla |
| Administración | `/admin/` | solo rol `admin` | todo lo anterior, más precios, archivo, cuentas y bitácora |

Las dos se instalan como aplicación desde el navegador, cada una con su
propio icono: el del equipo es negro, el de administración es rosa de marca.
En Android, Chrome ofrece "Instalar aplicación". En iPhone, Safari →
Compartir → "Añadir a pantalla de inicio" (Safari no ofrece el aviso
automático, hay que decírselo al equipo).

Quien entre a `/admin/` con cuenta de equipo acaba en su propio panel; nadie
ve una pantalla de error por equivocarse de dirección.

## Cuentas

Las crea una administradora desde el panel, en la pestaña **Equipo**: nombre,
correo, rol y una clave temporal. La clave se le pasa por un medio privado y
se le dice que la cambie.

El correo es solo el nombre de usuario. No se verifica y no hay
recuperación por correo, así que `maria@euchel.pe` funciona aunque ese buzón
no exista. Lo que sí hace falta es que cada persona tenga el suyo: la
bitácora dice quién cambió qué, y con una cuenta compartida eso no sirve de
nada.

Cada quien cambia su clave desde el botón **Clave** del encabezado. Si
alguien la olvida, una administradora le pone una temporal desde la pestaña
Equipo, botón **Clave nueva** de su fila.

Cuando alguien deja el equipo, se **suspende** su cuenta. No se borra: la
bitácora tiene que seguir diciendo quién hizo cada cambio.

La primera cuenta de administración existe ya. Las demás salen de ahí.

### Pendiente en la consola de Neon

El registro público está **abierto**: cualquiera con la dirección del panel
puede crear una cuenta. No puede hacer nada (entra con rol `user` y el panel
le responde que pida acceso), pero conviene cerrarlo:

> Neon → proyecto `euchel-catalogo` → Auth → Email/Password → apagar
> "Allow sign up".

Crear cuentas desde el panel sigue funcionando con el registro cerrado: usa
la ruta de administración, no la de registro.

## Cómo se sostiene la sesión

```
navegador ──POST /auth/sign-in/email──► Netlify ──► Neon Auth
          ◄──── cookie de sesión (7 días) ────────────┘
          ──GET /auth/token──► ... ◄── JWT de 15 minutos
          ──Bearer JWT──► /api/panel/* ──► verifica firma, lee rol en la base
```

Tres decisiones que conviene no deshacer sin releer esto:

**El auth pasa por `/auth/*` de este dominio.** Neon Auth vive en un dominio
propio y entrega la cookie con `SameSite=None; Partitioned`. Desde el sitio
esa cookie es de tercero, y Safari las bloquea: en iPhone la trabajadora
entraría y al primer refresco estaría fuera. Con el proxy la cookie la
escribe `euchel-catalogo` y es de primera parte. La regla está en
`dist/_redirects`, que genera `sitio/generar.py`.

**El rol se lee de la base, no del token.** El JWT de Neon no admite claims
propios y su campo `role` dice `authenticated` para todo el mundo. El rol
real está en `neon_auth."user".role`.

**El JWT no se guarda en disco.** Vive en memoria y se renueva solo. La
cookie es `HttpOnly`, así que tampoco la alcanza un script.

## La base

Las funciones entran con el rol `panel`, no con el dueño de la base. Creado
por SQL a propósito: los roles que crea la API de Neon quedan dentro de
`neon_superuser` y pueden borrar y hacer DDL. Comprobado que `panel` **no**
puede borrar productos, ni alterar tablas, ni leer `neon_auth.account`
(donde están los hashes de las claves), ni tocar los roles de los usuarios.

Lo que sí puede: leer el catálogo, actualizar producto, color y talla,
insertar en `negocio.intencion` y en `negocio.bitacora`. La bitácora es solo
de añadir: ni el panel ni las funciones pueden borrar una línea.

## Variables de entorno en Netlify

| Nombre | Para qué |
|---|---|
| `DATABASE_URL` | conexión del rol `panel`; también la usa la construcción |
| `NEON_AUTH_BASE_URL` | de dónde baja el JWKS para verificar la firma |
| `NETLIFY_BUILD_HOOK` | lo que dispara el botón Publicar (ver más abajo) |

Ojo: la API de Netlify acepta la escritura y la descarta en silencio si la
variable se marca secreta o se le limita el ámbito. Hay que ponerlas sin
marcar secreto y con ámbito completo, y **comprobar que quedaron** listando
las variables después. Que responda "upserted" no significa que se guardó.

## Subir productos

Cualquiera del equipo puede crear un producto, subirle fotos y ponerle
colores y tallas. Cambiar el precio, archivar y eliminar es de admin.

El producto **nace oculto**. Se le ponen fotos, colores y tallas, y cuando
está listo se hace visible y se publica.

Las fotos se encogen en el navegador antes de subirse (1600 px de lado
mayor). Una función de Netlify no acepta más de 6 MB de cuerpo y una foto de
celular pasa de eso; y el catálogo nunca las muestra a más de 1400 px. Van a
Netlify Blobs con el sha-256 del archivo como nombre, así que subir dos veces
la misma no ocupa el doble, y las sirve `/img/subidas/<clave>` a través del
CDN de imágenes, que las redimensiona y las pasa a WebP al vuelo.

Los productos creados en el panel llevan **Ref. desde 100001**. La tienda va
por 1367 y sigue subiendo, así que no chocan nunca y se distinguen de un
vistazo en el pedido de WhatsApp.

**Eliminar** solo borra los productos creados en el panel, con sus fotos y
sin vuelta atrás. Los que vinieron de la tienda se archivan: salen del
catálogo y del panel y se pueden recuperar. Lo impide también un disparador
en la base, no solo el código, porque borrarlos se llevaría sus colores,
tallas y fotos y dejaría sin referencia los pedidos que los mencionan.

## Publicar

Un producto nuevo, una foto, un nombre o un precio necesitan reconstruir el
sitio: el catálogo son páginas ya generadas. El botón **Publicar catálogo**
del panel de admin lo dispara.

Para que ese botón funcione solo hacen falta dos cosas, una vez:

1. **Conectar el repositorio** en Netlify (Project configuration → Build &
   deploy → Link repository). El comando de construcción y la versión de
   Python ya están en `netlify.toml`, y las imágenes de la extracción están
   en el repo, así que no hace falta nada más.
2. **Crear un gancho de construcción** (Build hooks → Add build hook) y
   guardar su URL en la variable de entorno `NETLIFY_BUILD_HOOK`.

Sin eso, el botón avisa que falta configurarlo y el sitio se publica a mano
con `sitio/empaquetar.sh` (ver abajo).

## Desplegar a mano

```sh
sh sitio/empaquetar.sh            # genera el sitio y copia las funciones
# luego, desde /tmp/euchel-paquete, el comando que da el MCP de Netlify
```

No se sube el repo entero: `scraper/data/images/originales` (598 MB) y
`scraper/data/html` (67 MB) son intermedios regenerables y con ellos el zip
pasa de 700 MB y el despliegue falla con 500. El paquete son 164 MB.

Qué cambia sin volver a desplegar y qué no:

| Cambio | Hace falta desplegar |
|---|---|
| agotar, ocultar, precios, archivar | no: sale por `/api/estado` en menos de un minuto |
| cuentas y roles | no |
| producto nuevo, foto nueva, nombre, precio | sí: el catálogo son páginas ya generadas |
| diseño, textos, código | sí |

Lo que hace falta reconstruir sale del botón **Publicar catálogo**.

## Probar los paneles en un navegador

Chromium en el contenedor no confía en la CA del proxy de salida, así que ir
directo a la URL `https` da `ERR_CERT_AUTHORITY_INVALID`. La forma que
funciona es servir `dist` en `http` local y reenviar `/auth/*` y `/api/*` al
sitio real desde Node, que sí confía. Hay un arnés así en el historial de
esta sesión; si hace falta otra vez, lo único con truco es que al bajar la
cookie por `http` hay que quitarle `Secure` **y el prefijo `__Secure-`** del
nombre (Chromium rechaza ese prefijo sin https) y devolvérselo al subir.
