// La hoja de estilos dentro del HTML: que se lea, que se guarde, y que
// cuando no se pueda leer la página salga igual con el <link> de siempre.
//
//   npx tsx sitio/pruebas/hoja.mts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { estilos, olvidar } from "../../netlify/functions/_lib/estilos.mts";
import { cabeza, fijarHoja } from "../../netlify/functions/_lib/plantillas.mts";

const real = readFileSync(new URL("../estatico/estilos.css", import.meta.url), "utf8");
const original = globalThis.fetch;
let llamadas = 0;

function fingir(r: () => Promise<Response>) {
  llamadas = 0;
  globalThis.fetch = (async () => { llamadas++; return r(); }) as typeof fetch;
}
const hoja = (cuerpo: string, tipo = "text/css; charset=UTF-8", estado = 200) =>
  () => Promise.resolve(new Response(cuerpo, { status: estado, headers: { "content-type": tipo } }));

const casos: [string, () => Promise<void>][] = [
  ["se lee y se mete en <style>", async () => {
    olvidar(); fingir(hoja(real));
    const css = await estilos("https://x");
    assert.ok(css && css.includes(".redes a::before"), "falta una regla del CSS real");
    fijarHoja(css);
    const html = cabeza("https://x", "T", "D", "/");
    assert.ok(html.includes("<style>"), "no se metió el <style>");
    assert.ok(!html.includes('href="/estilos.css'), "sigue enlazando la hoja aparte");
  }],

  ["se guarda: una sola lectura por instancia", async () => {
    olvidar(); fingir(hoja(real));
    await estilos("https://x"); await estilos("https://x"); await estilos("https://x");
    assert.equal(llamadas, 1, `se pidió ${llamadas} veces`);
  }],

  ["dos peticiones a la vez comparten la lectura", async () => {
    olvidar(); fingir(hoja(real));
    await Promise.all([estilos("https://x"), estilos("https://x"), estilos("https://x")]);
    assert.equal(llamadas, 1, `se pidió ${llamadas} veces`);
  }],

  ["si falla la red, la página sale con <link>", async () => {
    olvidar(); fingir(() => Promise.reject(new Error("sin red")));
    const css = await estilos("https://x");
    assert.equal(css, null);
    fijarHoja(css);
    const html = cabeza("https://x", "T", "D", "/");
    assert.ok(html.includes('rel="stylesheet" href="/estilos.css'), "sin <link> de respaldo");
    assert.ok(html.includes("onerror="), "el <link> de respaldo no reintenta");
  }],

  ["una página de error no se toma por hoja de estilos", async () => {
    olvidar(); fingir(hoja("<html>No encontrado</html>", "text/html"));
    assert.equal(await estilos("https://x"), null);
    olvidar(); fingir(hoja(real, "text/css", 404));
    assert.equal(await estilos("https://x"), null);
  }],

  ["una hoja cortada no se toma por buena", async () => {
    olvidar(); fingir(hoja(":root{--x:1}"));
    assert.equal(await estilos("https://x"), null);
  }],

  ["un </style> dentro de la hoja no cierra la etiqueta", async () => {
    olvidar(); fingir(hoja(`.a{content:"</style><script>alert(1)</script>"}` + " ".repeat(600)));
    const css = await estilos("https://x");
    assert.ok(css && !/<\/style/i.test(css), "el </style> pasó sin escapar");
    fijarHoja(css);
    const html = cabeza("https://x", "T", "D", "/");
    assert.equal(html.split("</style>").length, 2, "hay más de un cierre de <style>");
  }],

  ["tras un fallo se vuelve a intentar", async () => {
    olvidar(); fingir(() => Promise.reject(new Error("sin red")));
    assert.equal(await estilos("https://x"), null);
    fingir(hoja(real));
    assert.ok(await estilos("https://x"), "no reintentó tras el fallo");
  }],
];

let mal = 0;
for (const [nombre, caso] of casos) {
  try { await caso(); console.log("  ok  ", nombre); }
  catch (err) { mal++; console.log("  MAL ", nombre, "·", (err as Error).message); }
}
globalThis.fetch = original;
console.log(mal ? `\n${mal} fallo(s)` : `\n${casos.length} pruebas, todo bien`);
process.exit(mal ? 1 : 0);
