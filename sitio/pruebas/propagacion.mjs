// Cada cambio hecho desde la API del panel debe verse en el catálogo público
// en la siguiente petición, sin desplegar. Se ejercita como equipo (lo que
// puede) y como admin (lo demás), y se mira el HTML público después de cada
// paso. Termina borrando lo que creó.
import { readFileSync } from "node:fs";

const S = "https://euchel-catalogo.netlify.app";
const A = "https://ep-delicate-poetry-ar49pls1.neonauth.c-4.us-west-2.aws.neon.tech/euchel/auth";
const O = { origin: S };

async function jwt(email, password) {
  const r = await fetch(`${A}/sign-in/email`, { method: "POST", headers: { ...O, "content-type": "application/json" },
    body: JSON.stringify({ email, password }) });
  const cookie = (r.headers.getSetCookie?.() || [])[0].split(";")[0];
  const t = await fetch(`${A}/token`, { headers: { ...O, cookie } });
  return (await t.json()).token;
}
const JA = await jwt(process.env.ADMIN_EMAIL, process.env.ADMIN_CLAVE);
const JE = await jwt("qa.equipo@euchel.pe", process.env.CLAVE_EQUIPO);

// El proxy de salida del contenedor corta ~1 de cada 30 conexiones y deja
// una respuesta vacía: se reintenta solo en ese caso (sin cuerpo JSON), no
// cuando la API responde de verdad.
async function api(tok, ruta, init = {}) {
  for (let intento = 1; ; intento++) {
    let r, cuerpo;
    try {
      r = await fetch(`${S}/api/panel/${ruta}`, { ...init,
        headers: { authorization: `Bearer ${tok}`, ...(init.body && !(init.body instanceof Blob) ? { "content-type": "application/json" } : {}), ...(init.headers || {}) } });
      cuerpo = await r.json().catch(() => null);
    } catch (e) { if (intento < 4) continue; throw e; }
    if (!r.ok && cuerpo === null && intento < 4) continue;
    if (!r.ok) throw new Error(`${ruta} -> ${r.status} ${JSON.stringify(cuerpo)}`);
    return cuerpo;
  }
}
const pubRaw = async (ruta) => {
  for (let i = 1; ; i++) {
    try { const r = await fetch(S + ruta); return { estado: r.status, html: await r.text() }; }
    catch (e) { if (i >= 4) throw e; }
  }
};
const pub = pubRaw;

let fallos = 0;
async function limpiar() {
  for (const filtro of ["QA PROPAGACI", ""]) {
    const l = await api(JA, "productos?q=" + encodeURIComponent("QA PROPAGACI")).catch(() => ({ productos: [] }));
    for (const p of l.productos) { await api(JA, `producto/${p.id}/archivar`, { method: "POST", body: JSON.stringify({ archivado: false }) }).catch(() => {}); await api(JA, `producto/${p.id}`, { method: "DELETE" }).catch(() => {}); }
    const la = await api(JA, "productos?estado=archivado&q=" + encodeURIComponent("QA PROPAGACI")).catch(() => ({ productos: [] }));
    for (const p of la.productos) { await api(JA, `producto/${p.id}/archivar`, { method: "POST", body: JSON.stringify({ archivado: false }) }).catch(() => {}); await api(JA, `producto/${p.id}`, { method: "DELETE" }).catch(() => {}); }
  }
}
process.on("exit", () => {});
await limpiar();   // restos de una corrida anterior
function ok(nombre, cond, detalle = "") {
  console.log(`${cond ? "ok " : "FALLA"} ${nombre}${detalle ? "  · " + detalle : ""}`);
  if (!cond) fallos++;
}

// ---- 1. equipo crea un producto: oculto, no se ve en ningún lado
const creado = await api(JE, "producto", { method: "POST", body: JSON.stringify({ nombre: "QA PROPAGACIÓN", precio: "33", subid: 6 }) });
const id = creado.id, slug = creado.slug;
console.log("producto", id, slug);
ok("creado oculto no sale en portada", !(await pub("/")).html.includes("QA PROPAGACIÓN"));
ok("creado oculto no sale en buscar.json", !(await pub("/buscar.json")).html.includes("QA PROPAGACIÓN"));
ok("creado oculto: ficha 404", (await pub(`/p/${slug}/`)).estado === 404);

// color, talla y foto (equipo)
const color = await api(JE, `producto/${id}/color`, { method: "POST", body: JSON.stringify({ nombre: "Negro" }) });
const color2 = await api(JE, `producto/${id}/color`, { method: "POST", body: JSON.stringify({ nombre: "Rojo" }) });
await api(JE, `color/${color.id}/talla`, { method: "POST", body: JSON.stringify({ nombre: "S" }) });
const tallaM = await api(JE, `color/${color.id}/talla`, { method: "POST", body: JSON.stringify({ nombre: "M" }) });
await api(JE, `color/${color2.id}/talla`, { method: "POST", body: JSON.stringify({ nombre: "L" }) });
const foto = await api(JE, `producto/${id}/foto`, { method: "POST", body: new Blob([readFileSync(process.env.FOTO_PRUEBA || "/tmp/foto1.jpg")], { type: "image/jpeg" }), headers: { "content-type": "image/jpeg" } });

// ---- 2. equipo lo pone visible: aparece en portada, categoría, buscador, sitemap, ficha
await api(JE, `producto/${id}/estado`, { method: "POST", body: JSON.stringify({ visible: true }) });
ok("visible: portada", (await pub("/")).html.includes("QA PROPAGACIÓN"));
ok("visible: categoría Pantalones", (await pub("/c/pantalones/")).html.includes("QA PROPAGACIÓN"));
ok("visible: buscar.json", (await pub("/buscar.json")).html.includes("QA PROPAGACIÓN"));
ok("visible: sitemap", (await pub("/sitemap.xml")).html.includes(`/p/${slug}/`));
let f = await pub(`/p/${slug}/`);
ok("visible: ficha 200 con foto subida y 2 colores", f.estado === 200 && f.html.includes("/img/subidas/") && f.html.includes('data-color="1"'));
ok("visible: /p/<id> redirige a la ficha", (await fetch(`${S}/p/${id}/`, { redirect: "manual" })).status === 301);

// ---- 3. agotar una talla: desaparece del JSON de la ficha
await api(JE, `talla/${tallaM.id}/estado`, { method: "POST", body: JSON.stringify({ agotado: true }) });
f = await pub(`/p/${slug}/`);
const datos = JSON.parse(f.html.match(/id="datos-producto">(.*?)<\/script>/s)[1]);
ok("talla M agotada no se ofrece", !datos.colores[0].tallas.some((t) => t.nombre === "M") && datos.colores[0].tallas.some((t) => t.nombre === "S"));

// ---- 4. agotar un color: desaparece del selector
await api(JE, `color/${color2.id}/estado`, { method: "POST", body: JSON.stringify({ agotado: true }) });
f = await pub(`/p/${slug}/`);
ok("color Rojo agotado no se ofrece", !f.html.includes(">Rojo<") && f.html.includes(">Negro<") === false || !f.html.includes('data-color="1"'));

// ---- 5. agotar el otro color también: el producto sale agotado sin tocar la general
await api(JE, `color/${color.id}/estado`, { method: "POST", body: JSON.stringify({ agotado: true }) });
f = await pub(`/p/${slug}/`);
ok("todos los colores agotados => ficha agotada", f.html.includes("<span>Agotado</span>") && f.html.includes('aria-disabled="true"'));
ok("todos los colores agotados => sello en portada", (await pub("/")).html.split(`href="/p/${slug}/"`)[1]?.split("</a>")[0].includes("sello--agotado") === true);
// volver a habilitar los colores
await api(JE, `color/${color.id}/estado`, { method: "POST", body: JSON.stringify({ agotado: false }) });
await api(JE, `color/${color2.id}/estado`, { method: "POST", body: JSON.stringify({ agotado: false }) });

// ---- 6. agotar el producto entero
await api(JE, `producto/${id}/estado`, { method: "POST", body: JSON.stringify({ agotado: true }) });
const tarjetaDe = (html, s) => (html.split(`href="/p/${s}/"`)[1] || "").split("</a>")[0];
ok("agotado: sello en la tarjeta", tarjetaDe((await pub("/")).html, slug).includes("sello--agotado"));
ok("agotado: botón desactivado en ficha", (await pub(`/p/${slug}/`)).html.includes('aria-disabled="true"'));
await api(JE, `producto/${id}/estado`, { method: "POST", body: JSON.stringify({ agotado: false }) });
ok("disponible otra vez: sin sello", !tarjetaDe((await pub("/")).html, slug).includes("sello--agotado"));

// ---- 7. admin cambia precio y equipo cambia nombre y categoría
await api(JA, `producto/${id}/precio`, { method: "POST", body: JSON.stringify({ precio: "44.5", precio_antes: "60" }) });
f = await pub(`/p/${slug}/`);
ok("precio y tachado en ficha", f.html.includes("S/ 44.50") && f.html.includes("S/ 60") && f.html.includes(">Oferta<"));
ok("precio en buscar.json", (await pub("/buscar.json")).html.includes('"p":"44.50","a":"60"'));

const renombrado = await api(JE, `producto/${id}/datos`, { method: "POST", body: JSON.stringify({ nombre: "QA PROPAGACIÓN RENOMBRADA", subid: 2 }) });
ok("nombre nuevo en portada", (await pub("/")).html.includes("QA PROPAGACIÓN RENOMBRADA"));
ok("ya no está en Pantalones", !(await pub("/c/pantalones/")).html.includes("QA PROPAGACIÓN"));
const cats = (await pub("/")).html.match(/href="\/c\/([a-z-]+)\/"/g);
ok("slug viejo sigue llegando (por id) a la ficha", (await fetch(`${S}/p/${slug}/`, { redirect: "manual" })).status === 301 || (await pub(`/p/${slug}/`)).estado === 200);

// ---- 8. quitar la foto
await api(JE, `foto/${foto.id}`, { method: "DELETE" });
f = await pub(`/p/${renombrado.slug}/`);
ok("sin foto subida en ficha tras borrarla", !f.html.includes("/img/subidas/"));

// ---- 9. ocultar: 404 en ficha, fuera de portada y buscador
await api(JE, `producto/${id}/estado`, { method: "POST", body: JSON.stringify({ visible: false }) });
ok("oculto: ficha 404", (await pub(`/p/${renombrado.slug}/`)).estado === 404);
ok("oculto: fuera de portada", !(await pub("/")).html.includes("QA PROPAGACIÓN"));
ok("oculto: fuera de buscar.json", !(await pub("/buscar.json")).html.includes("QA PROPAGACIÓN"));

// ---- 10. archivar (admin): fuera del panel normal, dentro del filtro archivado
await api(JE, `producto/${id}/estado`, { method: "POST", body: JSON.stringify({ visible: true }) });
await api(JA, `producto/${id}/archivar`, { method: "POST", body: JSON.stringify({ archivado: true }) });
ok("archivado: ficha 404", (await pub(`/p/${renombrado.slug}/`)).estado === 404);
const lista = await api(JA, `productos?q=${id}`);
const listaArch = await api(JA, `productos?q=${id}&estado=archivado`);
ok("archivado: no sale en el listado normal", lista.productos.length === 0);
ok("archivado: sí sale con estado=archivado", listaArch.productos.length === 1 && listaArch.productos[0].archivado);
await api(JA, `producto/${id}/archivar`, { method: "POST", body: JSON.stringify({ archivado: false }) });
ok("desarchivado: vuelve al listado, oculto", (await api(JA, `productos?q=${id}`)).productos[0]?.visible === false);

// ---- 11a. bitácora antes de borrar: nombre vivo
let bit = await api(JA, "bitacora?pagina=1");
let deEquipo = bit.movimientos.filter((m) => m.actor === "qa.equipo@euchel.pe");
ok("bitácora registra al equipo con nombre de producto", deEquipo.length >= 8 && deEquipo.some((m) => /QA PROPAGACI/.test(m.nombre || "")), `${deEquipo.length} movimientos`);

// ---- 11. equipo no puede borrar; admin sí; y tras borrar, 404 y sin rastro
const intento = await fetch(`${S}/api/panel/producto/${id}`, { method: "DELETE", headers: { authorization: `Bearer ${JE}` } });
ok("equipo no puede borrar (403)", intento.status === 403);
await api(JA, `producto/${id}`, { method: "DELETE" });
ok("borrado: ficha 404", (await pub(`/p/${renombrado.slug}/`)).estado === 404);
ok("borrado: la foto ya no está en el almacén", (await fetch(`${S}/img/subidas/${foto.hash}`)).status === 404);

// ---- 12. bitácora tras borrar: el nombre guardado en el movimiento sobrevive
bit = await api(JA, "bitacora?pagina=1");
const borrado = bit.movimientos.find((m) => m.accion === "borrar" && String(m.entidad_id) === String(id));
ok("bitácora conserva el nombre tras borrar el producto", !!borrado && /QA PROPAGACI/.test(borrado.nombre || ""), borrado?.nombre);

await limpiar();
console.log(fallos ? `\n${fallos} FALLOS` : "\ntodo ok");
process.exit(fallos ? 1 : 0);
