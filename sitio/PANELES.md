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

## Orden del catálogo

Dos palancas, y se combinan:

1. **Destacar** (admin, en cada producto). Lo destacado sale primero, en la
   portada y en su categoría. Es la palanca de la semana: subir lo que se
   quiere mover ahora.
2. **Orden del catálogo** (admin, encima de la lista de productos). Decide el
   resto: lo más nuevo primero (por defecto), lo más pedido, o por precio.

Por defecto el catálogo va por novedad, así que lo que el equipo sube hoy
sale arriba sin que nadie toque nada. Los productos de la extracción
comparten la fecha de la carga inicial y entre ellos manda el id de la
tienda; los que nacen en el panel llevan su fecha real y salen delante.

El criterio vive en `catalogo.ajuste`, una tabla clave-valor. No entra
pegado al texto de la consulta: va como parámetro en un CASE, así que desde
el panel no se puede colar SQL.

## Los tres botones de la ficha

| Botón | Mensaje que abre |
|---|---|
| Continuar compra | 🛍️ quiero continuar mi compra |
| ¿Qué colores hay? | 🎨 ¿en qué colores tienen esta prenda? |
| ¿Tienen mi talla? | 📏 ¿tienen mi talla? (con la talla elegida) |
| ¿Qué tallas hay? | 📏 ¿qué tallas hay? (cuando el producto no tiene tallas) |
| ¿Cuándo vuelve? | ⏳ cuando está agotado, en lugar de los dos de arriba |

El emoji va al principio: en la lista de WhatsApp se ve qué quiere cada
quien sin abrir el chat.

Cada toque se guarda en `negocio.intencion.boton`, y el tablero lo enseña en
"Qué botón tocan", con su reparto en porcentaje. Los clics de antes de que
hubiera tres botones no llevan ninguno: eran todos el de comprar, y así se
cuentan.

## Tallas: cómo quedaron (19 de septiembre de 2026)

Lo pidieron los dueños. Solo hay dos formas de talla en el catálogo:

| Qué | Tallas |
|---|---|
| Pantalones jean, faldas y shorts | 26, 28, 30, 32, 34 |
| Calzado | las suyas, de la 35 a la 39 |
| Todo lo demás | `Estándar`, una sola |

Un producto cuenta como jean si lo dice el nombre o si ya vendía por número
antes del cambio. Son 79 productos con número y 883 con `Estándar`.

`Estándar` no se pinta en la ficha: si no hay nada que elegir, no se
pregunta (ver `tallasVisibles` en `_lib/plantillas.mts`). Así que las fichas
de todo lo que no sea jean, falda o short salen sin selector de talla.

Antes de esto el campo tenía de todo: `Standar`, `Standard`, `standart`,
`único`, `S-M`, `28-30-32`, `-`, hasta un código de producto. Nada de eso
queda.

Lo que había está copiado entero en `catalogo.talla_respaldo_20260919`, y
en `catalogo.plan_tallas_20260919` queda qué se decidió para cada producto.
Para devolver un producto a sus tallas de antes:

```sql
delete from catalogo.talla t using catalogo.color co
 where t.color_id = co.id and co.producto_id = <id>;
insert into catalogo.talla (color_id, nombre, agotado, orden)
select r.color_id, r.nombre, r.agotado, r.orden
  from catalogo.talla_respaldo_20260919 r
  join catalogo.color co on co.id = r.color_id
 where co.producto_id = <id>;
```

Después hay que tirar la caché del catálogo: cualquier guardado en el panel
la purga, o un despliegue.

El calzado es la excepción: un zapato sin talla no se vende. Se le
devolvieron las suyas desde el respaldo, y de paso se separaron las
etiquetas que llevaban varias juntas (`36-37-39` pasó a ser 36, 37 y 39).
Nueve productos, cada uno con las que de verdad tenía.

En el listado, la tarjeta resume las tallas. Pone un rango (`Tallas 26–34`)
solo si están todas las del medio con el mismo salto; si falta alguna las
enumera (`Tallas 36, 37, 39`). Una sandalia sin la 38 no puede anunciarse
como 36–39.

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

No hay que publicar. Todo lo que el equipo guarda en el panel sale en el
catálogo al instante: un producto nuevo aparece cuando lo ponen visible, una
foto en cuanto la suben, un precio en cuanto lo cambian.

Cómo funciona: las páginas del catálogo no son archivos, las arma al momento
`netlify/functions/catalogo.mts` leyendo la base. El borde de Netlify
guarda cada página armada y la sirve sin llamar a la función, así una
visita normal es igual de rápida que cuando el sitio era estático. Cuando el
panel guarda cualquier cambio, la API purga la etiqueta de caché `catalogo`
y las páginas se vuelven a armar la próxima vez que alguien las pida.

Eso quita de en medio la reconstrucción, el gancho de construcción, el
repositorio conectado a Netlify y a la persona que desplegaba. El sitio se
despliega solo cuando cambia el código, con `sitio/empaquetar.sh`.

El repositorio **no debe quedar conectado** a Netlify. Si se conecta y la
rama de producción es `main`, la construcción publica la raíz del repo y el
sitio responde "Page not found": pasó una vez. Si aparece conectado, se
desconecta en Project configuration → Developer settings → Continuous
deployment → Repository → Manage repository → Unlink.

Una cosa que sí puede notarse: la base duerme tras unos minutos sin uso en
el plan gratis de Neon, y la primera página que la despierta tarda cerca de
un segundo más. Solo esa; las siguientes salen del borde.

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
| productos, fotos, precios, colores, tallas, agotar, ocultar | no: sale al instante |
| cuentas y roles | no |
| diseño, textos, código | sí |

## Probar

Las pruebas de integración están en `sitio/pruebas/` con su propio README:
permisos por rol, propagación de cada cambio del panel al catálogo público,
y los flujos de interfaz en navegador. Corren contra producción con cuentas
de prueba y borran lo que crean. La última corrida completa pasó entera:
13 rutas × 4 roles, 34 pasos de propagación, 30 pasos de interfaz.
