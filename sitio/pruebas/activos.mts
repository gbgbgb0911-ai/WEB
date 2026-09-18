// La hoja de estilos y el guion dentro del HTML: que se lean, que se guarden,
// que cuando no se puedan leer la página salga igual con los enlaces de
// siempre, y que el catálogo nunca dependa del guion para verse.
//
//   npx tsx sitio/pruebas/activos.mts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hoja, guion, olvidar } from "../../netlify/functions/_lib/activos.mts";
import { cabeza, pie, fijarHoja, fijarGuion } from "../../netlify/functions/_lib/plantillas.mts";

const leer = (n: string) => readFileSync(new URL(`../estatico/${n}`, import.meta.url), "utf8");
const CSS = leer("estilos.css");
const JS = leer("app.js");

const original = globalThis.fetch;
let llamadas = 0;

/** Finge el sitio: devuelve el archivo bueno para cada ruta. */
function fingirSitio(mal: string[] = []) {
  llamadas = 0;
  globalThis.fetch = (async (u: string) => {
    llamadas++;
    const ruta = String(u).replace(/^https?:\/\/[^/]+/, "");
    if (mal.includes(ruta)) throw new Error("sin red");
    if (ruta === "/estilos.css") return new Response(CSS, { headers: { "content-type": "text/css; charset=UTF-8" } });
    if (ruta === "/app.js") return new Response(JS, { headers: { "content-type": "application/javascript" } });
    return new Response("no", { status: 404 });
  }) as unknown as typeof fetch;
}
const responde = (cuerpo: string, tipo: string, estado = 200) => {
  llamadas = 0;
  globalThis.fetch = (async () => { llamadas++; return new Response(cuerpo, { status: estado, headers: { "content-type": tipo } }); }) as unknown as typeof fetch;
};

/** Una página entera, como la arma la función. */
async function pagina(base = "https://x") {
  fijarHoja(await hoja(base));
  fijarGuion(await guion(base));
  return cabeza(base, "T", "D", "/") + pie();
}

const casos: [string, () => Promise<void>][] = [
  ["el CSS y el JS van dentro de la página", async () => {
    olvidar(); fingirSitio();
    const html = await pagina();
    assert.ok(html.includes("<style>"), "sin <style>");
    assert.ok(html.includes(".revelar"), "el <style> no trae el CSS real");
    assert.ok(!html.includes('href="/estilos.css'), "sigue enlazando la hoja aparte");
    assert.ok(!html.includes('src="/app.js'), "sigue enlazando el guion aparte");
    assert.ok(html.includes("Euchel — catálogo"), "el <script> no trae el guion real");
  }],

  ["el guion metido espera al documento, como hacía defer", async () => {
    olvidar(); fingirSitio();
    const html = await pagina();
    assert.ok(html.includes("DOMContentLoaded"), "el guion corre antes de tiempo");
    assert.ok(html.includes("readyState"), "sin salida si el documento ya está armado");
  }],

  ["se guardan: una lectura de cada archivo por instancia", async () => {
    olvidar(); fingirSitio();
    await Promise.all([hoja("https://x"), guion("https://x"), hoja("https://x"), guion("https://x")]);
    await hoja("https://x"); await guion("https://x");
    assert.equal(llamadas, 2, `se pidieron ${llamadas} archivos`);
  }],

  ["si falla el CSS, la página sale con <link>", async () => {
    olvidar(); fingirSitio(["/estilos.css"]);
    const html = await pagina();
    assert.ok(html.includes('rel="stylesheet" href="/estilos.css'), "sin <link> de respaldo");
    assert.ok(html.includes("onerror="), "el <link> de respaldo no reintenta");
    assert.ok(html.includes("Euchel — catálogo"), "el guion no se metió");
  }],

  ["si falla el guion, la página sale con <script src>", async () => {
    olvidar(); fingirSitio(["/app.js"]);
    const html = await pagina();
    assert.ok(html.includes('src="/app.js'), "sin <script src> de respaldo");
    assert.ok(html.includes("<style>"), "el CSS no se metió");
  }],

  ["una página de error no se toma por archivo bueno", async () => {
    olvidar(); responde("<html>No encontrado</html>", "text/html");
    assert.equal(await hoja("https://x"), null);
    olvidar(); responde("<html>No encontrado</html>", "text/html");
    assert.equal(await guion("https://x"), null);
    olvidar(); responde(CSS, "text/css", 404);
    assert.equal(await hoja("https://x"), null);
  }],

  ["un archivo cortado no se toma por bueno", async () => {
    olvidar(); responde(":root{--x:1}", "text/css");
    assert.equal(await hoja("https://x"), null);
  }],

  ["un cierre de etiqueta dentro no rompe la página", async () => {
    olvidar(); responde(`.a{content:"</style><script>alert(1)</script>"}` + " ".repeat(600), "text/css");
    fijarHoja(await hoja("https://x")); fijarGuion(null);
    const html = cabeza("https://x", "T", "D", "/");
    assert.equal(html.split("</style>").length, 2, "hay más de un cierre de <style>");
  }],

  ["el catálogo no se esconde si el guion no llega", async () => {
    // La regla que esconde las tarjetas está condicionada, y el trozo que la
    // activa va dentro del HTML y se desactiva solo.
    assert.ok(CSS.includes("[data-revelar] .revelar { opacity: 0"),
      "el CSS esconde las tarjetas sin condición");
    assert.ok(!/^\.revelar \{ opacity: 0/m.test(CSS), "queda una regla suelta que las esconde");
    olvidar(); fingirSitio(["/app.js"]);
    const html = await pagina();
    assert.ok(html.includes('setAttribute("data-revelar"'), "nadie activa el revelado");
    assert.ok(html.includes('removeAttribute("data-revelar")'), "no hay red de seguridad");
    assert.ok(JS.includes(`setAttribute('data-js', '1')`), "el guion no avisa de que llegó");
  }],

  ["tras un fallo se vuelve a intentar", async () => {
    olvidar(); fingirSitio(["/estilos.css"]);
    assert.equal(await hoja("https://x"), null);
    fingirSitio();
    assert.ok(await hoja("https://x"), "no reintentó tras el fallo");
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
