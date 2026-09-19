// La ficha después de lo que pidieron los dueños: sin elegir color, con
// botón de consultar disponibilidad y sin la Ref. en el mensaje de WhatsApp.
//
//   npx tsx sitio/pruebas/ficha.mts
import assert from "node:assert/strict";
import { tallasVisibles, fotosDe, mensajeWa, paginaFicha } from "../../netlify/functions/_lib/plantillas.mts";

const base = (extra: any = {}) => ({
  id: 1, slug: "1-x", nombre: "TOP RAISA", descripcion: "", categoria: "Tops",
  categoriaSlug: "tops", subid: 1, precio: 45, antes: null, marca: null,
  agotado: false, galeria: ["aaa"], colores: [], ...extra,
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
assert.ok(mensajeWa("consulta", base(), "https://x").includes("consultar disponibilidad"));

// la página: ni rastro del selector de color, y los dos botones
const html = paginaFicha("https://x", base({ colores: [color("Azul", ["30"]), color("Gris", ["32"])] }),
  [{ nombre: "Tops", slug: "tops", subid: 1, cuantos: 1 }]);
assert.ok(!html.includes("data-colores"), "queda el selector de color");
assert.ok(!html.includes(">Color<"), "queda el título Color");
assert.ok(html.includes("data-consulta") && html.includes("Consultar disponibilidad"));
assert.ok(html.includes("Continuar compra"));
assert.ok(html.includes("data-tallas") && html.includes(">30<") && html.includes(">32<"));
assert.ok(!/Ref\.|%20Ref/.test(html), "la Ref. sigue en la página");

const agotado = paginaFicha("https://x", base({ agotado: true, colores: [color("Azul", ["30"])] }),
  [{ nombre: "Tops", slug: "tops", subid: 1, cuantos: 1 }]);
assert.ok(agotado.includes("cta--muerto") && agotado.includes("cta--llena"),
  "sin stock, preguntar tiene que ser el botón principal");

console.log("ficha: todo bien");
