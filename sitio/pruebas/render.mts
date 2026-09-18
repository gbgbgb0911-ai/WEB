// Arma páginas con el código de la función, contra la base real, y las
// escribe a disco para compararlas con las que generaba Python.
import { neon } from "@neondatabase/serverless";
import { writeFileSync, mkdirSync } from "node:fs";
import { categorias, productos, producto } from "../../netlify/functions/_lib/catalogo.mts";
import { paginaListado, paginaFicha, pagina404, indiceBusqueda, sitemap, TIENDA }
  from "../../netlify/functions/_lib/plantillas.mts";

const sql = neon(process.env.DATABASE_URL!);
const base = "https://euchel-catalogo.netlify.app";
const t0 = Date.now();

const cats = await categorias(sql);
const todos = await productos(sql);
console.log(`categorías ${cats.length} · productos ${todos.length} · ${Date.now() - t0} ms`);

mkdirSync("/tmp/render/nuevo/c/pantalones", { recursive: true });
mkdirSync("/tmp/render/nuevo/p/1367-top-raisa", { recursive: true });
mkdirSync("/tmp/render/nuevo/p/9-flare-pants-chompero", { recursive: true });

writeFileSync("/tmp/render/nuevo/index.html", paginaListado(base, `Catálogo · ${TIENDA}`, "Colección", todos, cats, "/",
  `Catálogo completo de ${TIENDA}: ${todos.length} productos. Elige color y talla y continúa tu compra por WhatsApp.`));

const pant = cats.find((c) => c.slug === "pantalones")!;
const t1 = Date.now();
const enPant = await productos(sql, pant.subid);
console.log(`pantalones ${enPant.length} · ${Date.now() - t1} ms`);
writeFileSync("/tmp/render/nuevo/c/pantalones/index.html", paginaListado(base, `${pant.nombre} · ${TIENDA}`, "Categoría", enPant, cats,
  `/c/${pant.slug}/`, `${pant.nombre} de ${TIENDA}: ${enPant.length} productos. Pide por WhatsApp.`, pant.slug));

const t2 = Date.now();
const raisa = await producto(sql, "1367-top-raisa");
console.log(`ficha 1367 · ${Date.now() - t2} ms · colores ${raisa!.colores.length}`);
writeFileSync("/tmp/render/nuevo/p/1367-top-raisa/index.html", paginaFicha(base, raisa!, cats));

// por id solo, y un producto oculto (9) debe dar null
console.log("por id 1367:", (await producto(sql, "1367"))?.slug, "| oculto 9:", await producto(sql, "9-flare-pants-chompero"));

writeFileSync("/tmp/render/nuevo/buscar.json", indiceBusqueda(todos));
writeFileSync("/tmp/render/nuevo/sitemap.xml", sitemap(base, cats, todos));
writeFileSync("/tmp/render/nuevo/404.html", pagina404(base, cats));
console.log("escrito en /tmp/render/nuevo · total", Date.now() - t0, "ms");
