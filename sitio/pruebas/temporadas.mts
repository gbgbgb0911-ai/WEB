// Las temporadas del catálogo: sin ninguna, la página sale como siempre;
// con una, lleva su barra, su guirnalda y su capa, y nada más cambia.
//
//   npx tsx sitio/pruebas/temporadas.mts
import assert from "node:assert/strict";
import { TEMPORADAS, CLAVES_TEMPORADA, temporada, estilosTemporada, capaTemporada, resumenTemporadas }
  from "../../netlify/functions/_lib/temporadas.mts";
import { paginaListado, paginaFicha, pagina404, fijarTemporada, ANUNCIO }
  from "../../netlify/functions/_lib/plantillas.mts";

const cats = [{ nombre: "Tops", slug: "tops", subid: 1, cuantos: 1 }];
const prod = {
  id: 1, slug: "1-x", nombre: "TOP RAISA", descripcion: "", categoria: "Tops",
  categoriaSlug: "tops", subid: 1, precio: 45, antes: null, marca: null,
  agotado: false, destacado: false, galeria: ["aaa"],
  colores: [{ id: 1, nombre: "Azul", precio: null, agotado: false,
              tallas: [{ nombre: "30", agotado: false }], imagenes: [] }],
} as any;

const portada = () => paginaListado("https://x", "Catálogo · Euchel", "Colección", [prod], cats, "/", "d");

// Sin temporada: ni rastro. Y es lo que sale con una clave que no existe.
fijarTemporada("");
const limpia = portada();
assert.ok(!limpia.includes("data-temporada") && !limpia.includes('class="tp"') && !limpia.includes("tp-guirnalda"));
assert.ok(limpia.includes(`<div class="anuncio">${ANUNCIO}</div>`));
assert.ok(limpia.includes('content="#ffffff"'));
fijarTemporada("loquesea");
assert.equal(portada(), limpia, "una clave desconocida tiene que dar la página de siempre");
fijarTemporada(null);
assert.equal(portada(), limpia);

// Con cada temporada: marca en <html>, estilos, barra, guirnalda y capa.
// Y al quitarla, la página vuelve a ser la misma byte a byte.
for (const t of TEMPORADAS) {
  fijarTemporada(t.clave);
  const html = portada();
  assert.ok(html.includes(`data-temporada="${t.clave}"`), `${t.clave}: sin marca`);
  assert.ok(html.includes("<style data-temporada>"), `${t.clave}: sin estilos`);
  assert.ok(html.includes(t.anuncio) && html.includes(`· ${ANUNCIO}`), `${t.clave}: la barra no dice qué se celebra`);
  assert.ok(html.includes(`content="${t.fondo}"`), `${t.clave}: theme-color`);
  assert.ok(html.includes('<div class="tp" aria-hidden="true">'), `${t.clave}: sin capa`);
  assert.ok(html.indexOf(t.guirnalda) > html.indexOf('<header class="cabecera">')
         && html.indexOf(t.guirnalda) < html.indexOf("</header>"), `${t.clave}: la guirnalda no cuelga de la cabecera`);
  assert.ok(html.indexOf('class="tp"') < html.indexOf('<footer class="pie">'), `${t.clave}: la capa va antes del pie`);
  // Lo que se mueve todo el rato existe y está marcado para poder quitarse
  assert.ok(html.includes("tp-mov"), `${t.clave}: nada se mueve`);
  assert.ok(html.includes("prefers-reduced-motion"), `${t.clave}: no respeta reduced-motion`);
  // Nada de la capa recibe clics
  assert.ok(estilosTemporada(t).includes(".tp{position:fixed;inset:0;z-index:22;pointer-events:none"));
  // Nada puede cerrar el bloque de estilos antes de tiempo
  assert.ok(!estilosTemporada(t).slice(23, -8).includes("</style"));
  // La ficha y el 404 también van vestidos
  assert.ok(paginaFicha("https://x", prod, cats).includes(`data-temporada="${t.clave}"`));
  assert.ok(pagina404("https://x", cats).includes(`data-temporada="${t.clave}"`));
  // Peso: lo que se añade a cada página tiene que quedarse chico
  const extra = html.length - limpia.length;
  assert.ok(extra < 20000, `${t.clave}: añade ${extra} bytes a cada página`);
  console.log(`${t.clave.padEnd(12)} +${extra} bytes`);
}
fijarTemporada("");
assert.equal(portada(), limpia, "al quitar la temporada no queda nada");

// El registro que ve el panel
assert.deepEqual(CLAVES_TEMPORADA, ["sanvalentin", "madre", "patrias", "halloween", "navidad", "anonuevo"]);
assert.equal(temporada("halloween")?.nombre, "Halloween");
assert.equal(temporada(""), null);
assert.equal(temporada(undefined), null);
for (const r of resumenTemporadas()) {
  assert.ok(r.clave && r.nombre && r.cuando && r.emoji && /^#[0-9a-f]{6}$/i.test(r.fondo) && /^#[0-9a-f]{6}$/i.test(r.texto));
  assert.ok(!("css" in r) && !("capa" in r), "el panel no necesita el CSS");
}

// El HTML de una temporada es siempre el mismo: el borde guarda una copia y
// el navegador otra, y no pueden diferir
assert.equal(capaTemporada(TEMPORADAS[0]), capaTemporada(TEMPORADAS[0]));

console.log("temporadas: todo bien");
