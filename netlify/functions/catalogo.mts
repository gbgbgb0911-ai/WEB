import type { Config, Context } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";
import { categorias, productos, producto } from "./_lib/catalogo.mts";
import { paginaListado, paginaFicha, pagina404, indiceBusqueda, sitemap, TIENDA, css, fijarVersion, fijarHoja, fijarGuion }
  from "./_lib/plantillas.mts";
import { hoja, guion } from "./_lib/activos.mts";
import { cabecerasCache, cabecerasNoEncontrada, purgarSiHayDespliegueNuevo } from "./_lib/cache.mts";

/* El catálogo público, armado al momento desde la base.
 *
 *   /              portada
 *   /c/:slug/      categoría
 *   /p/:slug/      ficha (acepta también /p/1364, la Ref. del pedido)
 *   /buscar.json   índice del buscador
 *   /sitemap.xml
 *   /404           lo que Netlify sirve cuando no hay nada más (ver _redirects)
 *
 * Cada respuesta va con la etiqueta de caché `catalogo`. El borde la sirve
 * sin llamar aquí hasta que el panel guarde un cambio y la purgue. Así lo
 * que sube el equipo aparece al instante, y una visita normal sigue siendo
 * un archivo servido desde el borde.
 *
 * Antes esto eran 778 archivos HTML generados por sitio/generar.py. Cada
 * producto nuevo obligaba a reconstruir y desplegar. Ya no.
 */

export default async (req: Request, ctx: Context) => {
  fijarVersion(ctx.deploy?.id);
  const url = new URL(req.url);
  const base = url.origin;
  const ruta = url.pathname;

  const conexion = Netlify.env.get("DATABASE_URL");
  if (!conexion) return sinBase();
  const sql = neon(conexion);

  // La hoja de estilos y el guion se meten dentro del HTML. Se leen una vez
  // por instancia; si no se puede, la plantilla los enlaza como antes.
  const [css1, js1] = await Promise.all([
    hoja(base),
    guion(base),
    // Un despliegue nuevo cambia el CSS y el guion, que viajan dentro de las
    // páginas guardadas: hay que tirarlas.
    purgarSiHayDespliegueNuevo(ctx.deploy?.id),
  ]);
  fijarHoja(css1);
  fijarGuion(js1);

  try {
    // Una sola URL por página: sin barra final se manda a la que la lleva.
    // Así WhatsApp, el buscador y el sitemap apuntan siempre al mismo sitio.
    const m = ruta.match(/^\/(c|p)\/([^/]+)$/);
    if (m) return Response.redirect(`${base}${ruta}/${url.search}`, 301);

    if (ruta === "/") {
      const [cats, ps] = await Promise.all([categorias(sql), productos(sql)]);
      return html(paginaListado(base, `Catálogo · ${TIENDA}`, "Colección", ps, cats, "/",
        `Catálogo completo de ${TIENDA}: ${ps.length} productos. Elige color y talla y continúa tu compra por WhatsApp.`));
    }

    const cat = ruta.match(/^\/c\/([^/]+)\/$/);
    if (cat) {
      const cats = await categorias(sql);
      const actual = cats.find((c) => c.slug === decodeURIComponent(cat[1]));
      if (!actual) return noEncontrada(base, cats);
      const ps = await productos(sql, actual.subid);
      return html(paginaListado(base, `${actual.nombre} · ${TIENDA}`, "Categoría", ps, cats,
        `/c/${actual.slug}/`,
        `${actual.nombre} de ${TIENDA}: ${ps.length} productos. Pide por WhatsApp.`,
        actual.slug), [`categoria-${actual.subid}`]);
    }

    const fic = ruta.match(/^\/p\/([^/]+)\/$/);
    if (fic) {
      const slug = decodeURIComponent(fic[1]);
      const [cats, p] = await Promise.all([categorias(sql), producto(sql, slug)]);
      if (!p) return noEncontrada(base, cats);
      // Con el id solo o con un slug viejo se llega igual, pero la dirección
      // buena es una: se manda a ella para que no haya dos.
      if (p.slug !== slug) return Response.redirect(`${base}/p/${p.slug}/${url.search}`, 301);
      return html(paginaFicha(base, p, cats), [`producto-${p.id}`]);
    }

    if (ruta === "/buscar.json") {
      return new Response(indiceBusqueda(await productos(sql)), {
        headers: { ...cabecerasCache(), "content-type": "application/json; charset=utf-8" },
      });
    }

    if (ruta === "/sitemap.xml") {
      const [cats, ps] = await Promise.all([categorias(sql), productos(sql)]);
      return new Response(sitemap(base, cats, ps), {
        headers: { ...cabecerasCache(), "content-type": "application/xml; charset=utf-8" },
      });
    }

    // Una dirección del catálogo que no existe: /c/loquesea/, /p/loquesea/.
    // Lo que no es del catálogo ni un archivo lo contesta 404.html, que
    // Netlify sirve solo, sin pasar por aquí (ver _redirects).
    return noEncontrada(base, await categorias(sql));
  } catch (e) {
    console.error("catalogo:", ruta, e instanceof Error ? e.message : e);
    return sinBase();
  }
};

function html(cuerpo: string, etiquetas: string[] = []) {
  return new Response(cuerpo, { headers: cabecerasCache(etiquetas) });
}

/* Ojo: aquí llega cualquier ruta que no sea un archivo ni una función, por la
 * regla `/*  /404  404`. Incluida la URL de una imagen que en ese instante no
 * estuviera disponible. Por eso esta respuesta no se guarda más de un minuto:
 * ver cabecerasNoEncontrada(). */
function noEncontrada(base: string, cats: Awaited<ReturnType<typeof categorias>>) {
  return new Response(pagina404(base, cats), { status: 404, headers: cabecerasNoEncontrada() });
}

/** Sin base no hay catálogo. Se pide reintentar, y no se cachea. */
function sinBase() {
  return new Response(
    `<!doctype html><html lang="es-PE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Un momento · ${TIENDA}</title><link rel="stylesheet" href="${css()}"></head><body><main class="envoltura" style="padding-top:60px;text-align:center"><img src="/logo.svg" alt="${TIENDA}" width="180" height="34" style="margin:0 auto 28px"><h1 style="font-size:20px;text-transform:uppercase">Un momento</h1><p style="color:#4d4d4d;max-width:34ch;margin:12px auto 28px">El catálogo está tardando en responder. Vuelve a cargar en unos segundos.</p><a class="cta" href="/" style="max-width:280px;margin:0 auto;text-decoration:none">Reintentar</a></main></body></html>`,
    { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "retry-after": "5" } },
  );
}

export const config: Config = {
  path: ["/", "/c/:slug", "/c/:slug/", "/p/:slug", "/p/:slug/", "/buscar.json", "/sitemap.xml"],
};
