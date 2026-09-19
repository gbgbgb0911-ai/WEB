// La ficha después de lo que pidieron los dueños: sin elegir color, con
// botón de consultar disponibilidad y sin la Ref. en el mensaje de WhatsApp.
//
//   npx tsx sitio/pruebas/ficha.mts
import assert from "node:assert/strict";
import { tallasVisibles, fotosDe, mensajeWa, paginaFicha } from "../../netlify/functions/_lib/plantillas.mts";

const base = (extra: any = {}) => ({
  id: 1, slug: "1-x", nombre: "TOP RAISA", descripcion: "", categoria: "Tops",
  categoriaSlug: "tops", subid: 1, precio: 45, antes: null, marca: null,
  agotado: false, destacado: false, galeria: ["aaa"], colores: [], ...extra,
}) as any;

const color = (n: string, tallas: string[], agotado = false, imgs: string[] = []) => ({
  id: 1, nombre: n, precio: null, agotado,
  tallas: tallas.map((t) => ({ nombre: t, agotado: false })), imagenes: imgs,
});

// tallas: se juntan, se limpian y se ordenan
assert.deepEqual(tallasVisibles(base({ colores: [color("Azul", ["30", "26"]), color("Gris", ["34", "26"])] })),
  ["26", "30", "34"]);
assert.deepEqual(tallasVisibles(base({ colores: [color("Único", ["Standar"])] })), []);
assert.deepEqual(tallasVisibles(base({ colores: [color("Único", ["standard", "-", "único"])] })), []);
assert.deepEqual(tallasVisibles(base({ colores: [color("A", ["L", "XS", "M", "S"])] })), ["XS", "S", "M", "L"]);
assert.deepEqual(tallasVisibles(base({ colores: [color("A", ["28"], true)] })), [], "color agotado no aporta tallas");

// fotos: las del producto y las de cada color, sin repetir
assert.deepEqual(fotosDe(base({ galeria: ["a"], colores: [color("Azul", ["30"], false, ["b", "a"])] })), ["a", "b"]);

// mensaje: sin Ref., con talla si la hay
const m = mensajeWa("compra", base(), "https://x", "30");
assert.ok(!/Ref\./.test(m), "sigue llevando la Ref.");
assert.ok(m.includes("Talla: 30") && m.includes("S/ 45") && m.includes("https://x/p/1-x/"));

// El de colores tiene que decir que pregunta por colores, y de qué prenda
const col = mensajeWa("colores", base(), "https://x");
assert.ok(col.includes("colores"), "el mensaje no dice que pregunta por colores");
assert.ok(col.includes("TOP RAISA") && col.includes("https://x/p/1-x/"),
  "no se sabe por qué prenda se pregunta");
assert.ok(mensajeWa("stock", base(), "https://x").includes("vuelve"));

// Un emoji por intención, al principio: es lo que se ve en la lista de WhatsApp
assert.ok(mensajeWa("compra", base(), "https://x").startsWith("\u{1F6CD}"), "compra sin bolsas");
assert.ok(mensajeWa("colores", base(), "https://x").startsWith("\u{1F3A8}"), "colores sin paleta");
assert.ok(mensajeWa("talla", base(), "https://x").startsWith("\u{1F4CF}"), "talla sin regla");
assert.ok(mensajeWa("tallas", base(), "https://x").startsWith("\u{1F4CF}"), "tallas sin regla");

// la página: ni rastro del selector de color, y los dos botones
const html = paginaFicha("https://x", base({ colores: [color("Azul", ["30"]), color("Gris", ["32"])] }),
  [{ nombre: "Tops", slug: "tops", subid: 1, cuantos: 1 }]);
assert.ok(!html.includes("data-colores"), "queda el selector de color");
assert.ok(!html.includes(">Color<"), "queda el título Color");
assert.ok(html.includes('data-consulta="colores"'), "el botón no pregunta por colores");
assert.ok(html.includes('data-boton="talla"') && html.includes("¿Tienen mi talla?"),
  "falta el tercer botón, el de la talla");
assert.equal((html.match(/data-boton=/g) || []).length, 3, "tienen que ser tres botones");
assert.ok(html.includes("¿Qué colores hay?"), "el botón no dice para qué sirve");
assert.ok(html.match(/data-consulta="colores"[^>]*href="[^"]*colores/), "el enlace no lleva el mensaje de colores");
assert.ok(html.includes("Continuar compra"));
assert.ok(html.includes("data-tallas") && html.includes(">30<") && html.includes(">32<"));
assert.ok(!/Ref\.|%20Ref/.test(html), "la Ref. sigue en la página");

const sinTallas = paginaFicha("https://x", base({ colores: [color("Único", ["Standar"])] }),
  [{ nombre: "Tops", slug: "tops", subid: 1, cuantos: 1 }]);
assert.ok(sinTallas.includes('data-boton="tallas"') && sinTallas.includes("¿Qué tallas hay?"),
  "sin tallas que elegir, el botón tiene que preguntar cuáles hay");

const agotado = paginaFicha("https://x", base({ agotado: true, colores: [color("Azul", ["30"])] }),
  [{ nombre: "Tops", slug: "tops", subid: 1, cuantos: 1 }]);
assert.ok(agotado.includes("cta--muerto") && agotado.includes("cta--llena"),
  "sin stock, preguntar tiene que ser el botón principal");
assert.ok(agotado.includes(`data-consulta="stock"`) && agotado.includes("¿Cuándo vuelve?"),
  "sin stock, preguntar por el color no sirve de nada");

console.log("ficha: todo bien");

// El resumen de tallas de la tarjeta: rango solo si están todas las del medio
{
  const { tarjeta } = await import("../../netlify/functions/_lib/plantillas.mts");
  const meta = (tallas: string[]) => {
    const html = tarjeta(base({ colores: [color("Único", tallas)] }) as any, false);
    return (html.match(/tarjeta__meta">([^<]*)</) || [])[1] || "";
  };
  assert.equal(meta(["26", "28", "30", "32", "34"]), "Tallas 26–34");
  assert.equal(meta(["36", "37", "38", "39"]), "Tallas 36–39");
  assert.equal(meta(["36", "37", "39"]), "Tallas 36, 37, 39", "un hueco no puede anunciarse como rango");
  assert.equal(meta(["35", "36", "37", "39"]), "Tallas 35, 36, 37, 39");
  assert.equal(meta(["Standar"]), "");
  assert.equal(meta(["S", "M", "L"]), "Tallas S, M, L");
  console.log("tarjeta: todo bien");
}
