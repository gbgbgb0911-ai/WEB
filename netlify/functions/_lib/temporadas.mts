/* Temporadas: el catálogo vestido para una fecha.
 *
 * Una temporada son tres cosas, y las tres van dentro del HTML solo cuando
 * está puesta (con ninguna, la página sale byte a byte como siempre):
 *
 *   anuncio    la barra de arriba cambia de color y dice qué se celebra
 *   guirnalda  algo colgado del borde de la cabecera, que es fija: luces,
 *              banderines, corazones, una araña. Es lo que hace que se vea
 *              parte del sitio y no una capa pegada encima
 *   capa       una capa fija por encima de todo, sin recibir clics, con lo
 *              que se mueve todo el rato: nieve, pétalos, murciélagos,
 *              fuegos artificiales. Y los adornos de las esquinas
 *
 * Todo es CSS y SVG en línea: ni una petición más, ni una línea de guion.
 * Solo se animan transform y opacity, que no cuestan diseño de página, y
 * con `prefers-reduced-motion` lo que se mueve desaparece y queda lo quieto.
 *
 * Se elige desde el panel de administración (ajuste `temporada`) y llega
 * aquí por plantillas.fijarTemporada(). */

export type Temporada = {
  clave: string;
  nombre: string;
  /** Cuándo suele ponerse, para el panel. */
  cuando: string;
  emoji: string;
  /** Colores de la barra de anuncio; el panel los usa de muestra. */
  fondo: string;
  texto: string;
  /** Lo que dice la barra, ya en HTML seguro. */
  anuncio: string;
  css: string;
  guirnalda: string;
  capa: string;
};

/* ------------------------------------------------------------- utilidades */

/** Azar con semilla: el HTML de una temporada sale siempre igual, así la
 *  copia del borde y la del navegador no difieren en nada. */
function azar(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

type Particula = { x: number; d: number; t: number; s: number; o: number; dx: number; rot: number; c: string };

/** N partículas repartidas, cada una con su posición, tamaño, tiempos y color
 *  en propiedades CSS. Cómo se mueven lo dice la clase. */
function particulas(n: number, clase: string, semilla: number, opciones: {
  colores: string[]; tam: [number, number]; dur: [number, number]; deriva?: number; giro?: number;
  opacidad?: [number, number]; contenido?: string;
}): string {
  const r = azar(semilla);
  const entre = ([a, b]: [number, number]) => a + r() * (b - a);
  const partes: string[] = [];
  for (let i = 0; i < n; i++) {
    const p: Particula = {
      x: (i + r()) / n * 100,
      d: -r() * opciones.dur[1],
      t: entre(opciones.dur),
      s: entre(opciones.tam),
      o: entre(opciones.opacidad ?? [.7, 1]),
      dx: (r() - .5) * 2 * (opciones.deriva ?? 30),
      rot: (r() - .5) * 2 * (opciones.giro ?? 0),
      c: opciones.colores[i % opciones.colores.length],
    };
    partes.push(`<i class="${clase} tp-mov" style="--x:${f1(p.x)}%;--d:${f1(p.d)}s;--t:${f1(p.t)}s;`
      + `--s:${f1(p.s)}px;--o:${f1(p.o)};--dx:${f1(p.dx)}px;--rot:${Math.round(p.rot)}deg;color:${p.c}">`
      + `${opciones.contenido ?? ""}</i>`);
  }
  return partes.join("");
}

/** Cuerda con comba, de lado a lado, y los puntos donde cuelgan las cosas. */
function cuerda(ancho: number, tramo: number, comba: number, y = 3) {
  let d = `M0 ${y}`;
  for (let x0 = 0; x0 < ancho; x0 += tramo) {
    d += `Q${x0 + tramo / 2} ${y + comba * 2} ${x0 + tramo} ${y}`;
  }
  const enCurva = (x: number) => {
    const x0 = Math.floor(x / tramo) * tramo;
    const t = (x - x0) / tramo;
    return (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + comba * 2) + t * t * y;
  };
  return { d, en: (x: number) => ({ x, y: enCurva(x) }) };
}

/* Las cosas que se mueven, compartidas entre temporadas: lo que cae, lo que
 * sube, lo que parpadea. */
const BASE_CSS = `
.tp{position:fixed;inset:0;z-index:22;pointer-events:none;overflow:hidden;contain:strict}
.tp *{pointer-events:none}
.tp svg{display:block}
.tp i>svg,.tp-calabaza svg,.tp-ramo svg{width:100%;height:100%}
.tp-cae{position:absolute;top:-8vh;left:var(--x);width:var(--s);height:var(--s);opacity:0;will-change:transform;animation:tp-cae var(--t) linear var(--d) infinite}
@keyframes tp-cae{0%{transform:translate3d(0,0,0) rotate(0);opacity:0}6%{opacity:var(--o)}90%{opacity:var(--o)}100%{transform:translate3d(var(--dx),112vh,0) rotate(var(--rot));opacity:0}}
.tp-sube{position:absolute;bottom:-10vh;left:var(--x);width:var(--s);height:var(--s);opacity:0;will-change:transform;animation:tp-sube var(--t) ease-in var(--d) infinite}
@keyframes tp-sube{0%{transform:translate3d(0,0,0) scale(.6);opacity:0}10%{opacity:var(--o)}80%{opacity:var(--o)}100%{transform:translate3d(var(--dx),-115vh,0) scale(1);opacity:0}}
.cabecera{margin-bottom:var(--tp-hueco,28px)}
.tp-guirnalda{position:absolute;left:0;right:0;top:100%;height:48px;margin-top:-1px;pointer-events:none;overflow:visible}
.tp-guirnalda svg{width:100%;height:100%;display:block;overflow:visible}
@media (max-width:640px){.tp-cae:nth-child(n+15),.tp-sube:nth-child(n+13){display:none}}
@media (prefers-reduced-motion:reduce){.tp .tp-mov,.tp-guirnalda .tp-mov{display:none}.tp *,.tp-guirnalda *{animation:none!important}}
`;

/* ================================================================ Halloween */

/** Telaraña de esquina: radios desde el vértice y anillos que se hunden
 *  entre radio y radio, como las de verdad. Ligeramente irregular. */
function telarana(): string {
  const r = azar(31);
  const R = 150, radios = 6;
  const angulo = (i: number) => (Math.PI / 2) * (i / radios);
  const partes: string[] = [];
  for (let i = 0; i <= radios; i++) {
    const a = angulo(i);
    partes.push(`M0 0L${f1(R * Math.cos(a))} ${f1(R * Math.sin(a))}`);
  }
  for (const base of [26, 52, 78, 104, 130]) {
    let d = "";
    let prev = base * (0.96 + r() * 0.08);
    for (let i = 0; i < radios; i++) {
      const rad = base * (0.96 + r() * 0.08);
      const a0 = angulo(i), a1 = angulo(i + 1), am = (a0 + a1) / 2;
      const hund = ((prev + rad) / 2) * 0.87;
      const p0 = `${f1(prev * Math.cos(a0))} ${f1(prev * Math.sin(a0))}`;
      const c = `${f1(hund * Math.cos(am))} ${f1(hund * Math.sin(am))}`;
      const p1 = `${f1(rad * Math.cos(a1))} ${f1(rad * Math.sin(a1))}`;
      d += (i === 0 ? `M${p0}` : "") + `Q${c} ${p1}`;
      prev = rad;
    }
    partes.push(d);
  }
  return `<svg viewBox="0 0 150 150" aria-hidden="true"><path d="${partes.join("")}" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`;
}

const ARANA = `<svg viewBox="0 0 40 44" width="28" height="31" aria-hidden="true"><g fill="none" stroke="#161616" stroke-width="1.7" stroke-linecap="round"><path d="M16 18C11 13 8 11 3 12M15 21C9 19 6 19 1 22M15 24C9 25 6 27 2 32M16 27C11 31 9 34 6 40M24 18c5-5 8-7 13-6M25 21c6-2 9-2 14 1M25 24c6 1 9 3 13 8M24 27c5 4 7 7 10 13"/></g><ellipse cx="20" cy="17" rx="4.6" ry="4.2" fill="#161616"/><ellipse cx="20" cy="27" rx="7" ry="8.6" fill="#161616"/><circle cx="18.3" cy="16" r="1" fill="#fff"/><circle cx="21.7" cy="16" r="1" fill="#fff"/></svg>`;

const MURCIELAGO = `<svg viewBox="0 0 60 30" aria-hidden="true"><path fill="#161616" d="M30 11C26 4 18 2 10 6 4 9 2 16 1 23c5-4 11-4 15 0 2-6 8-7 14-2 6-5 12-4 14 2 4-4 10-4 15 0-1-7-3-14-9-17-8-4-16-2-20 5z"/></svg>`;

const CALABAZA = `<svg viewBox="0 0 64 58" width="64" height="58" aria-hidden="true"><path d="M31 11c1-6 4-9 9-9-2 3-3 6-3 9z" fill="#3f7d3a"/><ellipse cx="32" cy="34" rx="30" ry="22" fill="#ee8a2f"/><ellipse cx="20" cy="34" rx="12" ry="22" fill="none" stroke="#d3701c" stroke-width="2"/><ellipse cx="44" cy="34" rx="12" ry="22" fill="none" stroke="#d3701c" stroke-width="2"/><ellipse cx="32" cy="34" rx="6" ry="22" fill="none" stroke="#d3701c" stroke-width="1.5"/><g class="tp-cara" fill="#ffd166"><path d="M17 28l9 6-11 3z"/><path d="M47 28l-9 6 11 3z"/><path d="M17 41l6 3 4-3 5 4 5-4 4 3 6-3c-3 8-10 11-15 11S20 49 17 41z"/></g></svg>`;

const HALLOWEEN: Temporada = {
  clave: "halloween", nombre: "Halloween", cuando: "Octubre", emoji: "🎃",
  fondo: "#1c0f2b", texto: "#f6a53b",
  anuncio: "🎃 Halloween en Euchel",
  css: `
:root{--tp-hueco:0px}
.anuncio{background:#1c0f2b;color:#f6a53b}
.tp-tela{position:absolute;top:0;left:0;width:150px;height:150px;color:#161616;opacity:.42}
.tp-tela--der{left:auto;right:0;transform:scaleX(-1)}
.tp-colgante{position:absolute;right:9%;top:100%;width:64px;height:210px;overflow:hidden;pointer-events:none}
.tp-arana{position:absolute;left:18px;top:0;width:28px;height:210px;animation:tp-arana-baja 16s ease-in-out infinite}
.tp-arana__mece{transform-origin:50% 0;animation:tp-arana-mece 3.4s ease-in-out infinite alternate}
.tp-arana__hilo{width:1px;height:150px;margin:0 auto;background:#161616;opacity:.55}
.tp-arana svg{margin:-2px auto 0}
@keyframes tp-arana-baja{0%{transform:translateY(-190px)}22%{transform:translateY(0)}58%{transform:translateY(0)}66%{transform:translateY(-26px)}74%{transform:translateY(-8px)}100%{transform:translateY(-190px)}}
@keyframes tp-arana-mece{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
.tp-murcielago{position:absolute;top:var(--y);left:-10vw;width:var(--s);animation:tp-vuela var(--t) linear var(--d) infinite}
.tp-murcielago svg{animation:tp-aleteo .46s ease-in-out infinite alternate;transform-origin:50% 50%}
@keyframes tp-vuela{0%{transform:translate3d(0,0,0)}25%{transform:translate3d(30vw,-3vh,0)}50%{transform:translate3d(60vw,2vh,0)}75%{transform:translate3d(90vw,-2vh,0)}100%{transform:translate3d(122vw,1vh,0)}}
@keyframes tp-aleteo{from{transform:scaleY(1)}to{transform:scaleY(.5)}}
.tp-calabaza{position:absolute;left:12px;bottom:10px;width:64px;filter:drop-shadow(0 4px 8px rgba(20,8,30,.25))}
.tp-cara{animation:tp-vela 2.8s ease-in-out infinite}
@keyframes tp-vela{0%,100%{opacity:.75}18%{opacity:1}42%{opacity:.7}60%{opacity:.95}82%{opacity:.8}}
@media (max-width:899px){.tp-tela{width:104px;height:104px;opacity:.36}.tp-tela--der{display:none}.tp-calabaza{width:50px;left:8px;bottom:8px}.tp-colgante{right:16px}}
`,
  guirnalda: `<div class="tp-colgante" aria-hidden="true"><div class="tp-arana tp-mov"><div class="tp-arana__mece"><div class="tp-arana__hilo"></div>${ARANA}</div></div></div>`,
  capa: `<div class="tp-tela">${telarana()}</div><div class="tp-tela tp-tela--der">${telarana()}</div>`
    + [[9, 34, 19, 0], [16, 24, 24, -8], [6, 28, 27, -15]].map(([y, s, t, d]) =>
      `<div class="tp-murcielago tp-mov" style="--y:${y}vh;--s:${s}px;--t:${t}s;--d:${d}s">${MURCIELAGO}</div>`).join("")
    + `<div class="tp-calabaza">${CALABAZA}</div>`,
};

/* ================================================================== Navidad */

function luces(): string {
  const c = cuerda(1400, 100, 12, 4);
  const colores = ["#e63946", "#f4c542", "#2a9d8f", "#d3255c", "#4f8fd1"];
  let bombillas = "";
  for (let k = 0; k < 14; k++) {
    const p = c.en(50 + k * 100);
    const col = colores[k % colores.length];
    bombillas += `<g class="tp-luz" style="animation-delay:${f1((k % 5) * .48)}s" transform="translate(${p.x} ${f1(p.y)})">`
      + `<rect x="-2.2" y="0" width="4.4" height="5" rx="1" fill="#3a3a3a"/>`
      + `<circle cy="11" r="9" fill="${col}" opacity=".3" class="tp-halo"/>`
      + `<circle cy="11" r="5" fill="${col}"/></g>`;
  }
  return `<svg viewBox="0 0 1400 48" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><path d="${c.d}" fill="none" stroke="#3a3a3a" stroke-width="1.4"/>${bombillas}</svg>`;
}

const COPO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1M12 2l-2.5 2.5M12 2l2.5 2.5M12 22l-2.5-2.5M12 22l2.5-2.5M2 12l2.5-2.5M2 12l2.5 2.5M22 12l-2.5-2.5M22 12l-2.5 2.5"/></svg>`;

const NAVIDAD: Temporada = {
  clave: "navidad", nombre: "Navidad", cuando: "Diciembre", emoji: "🎄",
  fondo: "#0f3b2e", texto: "#f5e6c8",
  anuncio: "🎄 Navidad en Euchel",
  css: `
:root{--tp-hueco:34px}
.anuncio{background:#0f3b2e;color:#f5e6c8}
.tp-luz{animation:tp-parpadeo 2.4s ease-in-out infinite}
@keyframes tp-parpadeo{0%,100%{opacity:1}50%{opacity:.35}}
.tp-copo{border-radius:50%;background:radial-gradient(circle,#cfe0ee 0%,#e9f1f7 60%,rgba(233,241,247,0) 72%)}
.tp-copo--cristal{background:none;color:#9fb8cc}
`,
  guirnalda: `<div class="tp-guirnalda" aria-hidden="true">${luces()}</div>`,
  capa: particulas(26, "tp-cae tp-copo", 7, { colores: ["#cfe0ee"], tam: [6, 14], dur: [11, 20], deriva: 60, opacidad: [.6, .95] })
    + particulas(6, "tp-cae tp-copo tp-copo--cristal", 8, { colores: ["#9fb8cc", "#b9cbd9"], tam: [14, 22], dur: [14, 22], deriva: 50, giro: 360, opacidad: [.5, .8], contenido: COPO }),
};

/* ================================================================ Año Nuevo */

function estrella(r: number, ri: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : ri;
    const a = -Math.PI / 2 + (Math.PI / 5) * i;
    pts.push(`${f1(rad * Math.cos(a))},${f1(rad * Math.sin(a))}`);
  }
  return `M${pts.join("L")}Z`;
}

function estrellas(): string {
  const c = cuerda(1400, 140, 10, 4);
  let colgadas = "";
  for (let k = 0; k < 20; k++) {
    const p = c.en(35 + k * 70);
    const grande = k % 2 === 0;
    colgadas += `<g class="tp-estrella" style="animation-delay:${f1((k % 4) * .7)}s" transform="translate(${p.x} ${f1(p.y)})">`
      + `<path d="M0 0v${grande ? 9 : 7}" stroke="#b08d3c" stroke-width="1"/>`
      + `<path d="${estrella(grande ? 7 : 5, grande ? 3 : 2.2)}" fill="${grande ? "#e6c15c" : "#f3dc95"}" transform="translate(0 ${grande ? 16 : 12})"/></g>`;
  }
  return `<svg viewBox="0 0 1400 48" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><path d="${c.d}" fill="none" stroke="#b08d3c" stroke-width="1.2"/>${colgadas}</svg>`;
}

function fuego(): string {
  let d = "";
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16;
    d += `M${f1(9 * Math.cos(a))} ${f1(9 * Math.sin(a))}L${f1(44 * Math.cos(a))} ${f1(44 * Math.sin(a))}`;
  }
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}

/** El año que entra: desde julio ya es el siguiente. */
function anoQueEntra(): number {
  const hoy = new Date();
  return hoy.getMonth() >= 6 ? hoy.getFullYear() + 1 : hoy.getFullYear();
}

const ANO_NUEVO: Temporada = {
  clave: "anonuevo", nombre: "Año Nuevo", cuando: "Fin de diciembre", emoji: "✨",
  fondo: "#0a0a0a", texto: "#e6c15c",
  anuncio: `✨ Feliz ${anoQueEntra()}`,
  css: `
:root{--tp-hueco:26px}
.anuncio{background:#0a0a0a;color:#e6c15c}
.tp-estrella{animation:tp-titila 2.8s ease-in-out infinite}
@keyframes tp-titila{0%,100%{opacity:1}50%{opacity:.45}}
.tp-fuego{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);margin:calc(var(--s) / -2) 0 0 calc(var(--s) / -2);color:var(--c);opacity:0;will-change:transform;animation:tp-estalla 5.2s ease-out var(--d) infinite}
@keyframes tp-estalla{0%{transform:scale(.08);opacity:0}4%{opacity:.85}30%{transform:scale(1);opacity:.7}55%{transform:scale(1.06) translateY(10px);opacity:0}100%{transform:scale(1.06) translateY(10px);opacity:0}}
.tp-confeti{border-radius:1px;background:currentColor;height:calc(var(--s) * .5)}
@media (max-width:640px){.tp-fuego{width:calc(var(--s) * .7);height:calc(var(--s) * .7)}}
`,
  guirnalda: `<div class="tp-guirnalda" aria-hidden="true">${estrellas()}</div>`,
  capa: [[14, 34, 150, "#e6c15c", 0], [78, 28, 120, "#d3255c", 1.6], [46, 46, 100, "#c8ced6", 3.1], [88, 58, 130, "#f3dc95", 4.2], [24, 62, 110, "#e6c15c", 2.4]]
    .map(([x, y, s, c, d]) => `<div class="tp-fuego tp-mov" style="--x:${x}%;--y:${y}vh;--s:${s}px;--c:${c};--d:${d}s">${fuego()}</div>`).join("")
    + particulas(22, "tp-cae tp-confeti", 11, { colores: ["#e6c15c", "#0a0a0a", "#d3255c", "#c8ced6"], tam: [5, 9], dur: [9, 16], deriva: 80, giro: 720, opacidad: [.75, 1] }),
};

/* ============================================================= San Valentín */

const CORAZON = "M0 4.2C-1.6 1.6-6.4.4-6.4-3.4c0-2.6 1.9-4 3.8-4 1.2 0 2.1.6 2.6 1.4.5-.8 1.4-1.4 2.6-1.4 1.9 0 3.8 1.4 3.8 4C6.4.4 1.6 1.6 0 4.2z";
const CORAZON_SVG = `<svg viewBox="-8 -8 16 14" aria-hidden="true"><path d="${CORAZON}" fill="currentColor"/></svg>`;

function corazones(): string {
  const c = cuerda(1400, 175, 9, 4);
  const colores = ["#d3255c", "#f08aa8", "#f7c2d2"];
  let colgados = "";
  for (let k = 0; k < 20; k++) {
    const p = c.en(35 + k * 70);
    const esc = [1.15, .9, 1][k % 3];
    colgados += `<g transform="translate(${p.x} ${f1(p.y)})"><g class="tp-corazon" style="animation-delay:${f1(-(k % 5) * .9)}s">`
      + `<path d="M0 0v9" stroke="#b9b9b9" stroke-width="1"/>`
      + `<path d="${CORAZON}" fill="${colores[k % 3]}" transform="translate(0 16) scale(${esc})"/></g></g>`;
  }
  return `<svg viewBox="0 0 1400 48" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><path d="${c.d}" fill="none" stroke="#b9b9b9" stroke-width="1.2"/>${colgados}</svg>`;
}

const SAN_VALENTIN: Temporada = {
  clave: "sanvalentin", nombre: "San Valentín", cuando: "14 de febrero", emoji: "💗",
  fondo: "#d3255c", texto: "#ffffff",
  anuncio: "💗 San Valentín en Euchel",
  css: `
:root{--tp-hueco:28px}
.anuncio{background:#d3255c;color:#fff}
.tp-corazon{transform-box:fill-box;transform-origin:50% 0;animation:tp-pendulo 3.6s ease-in-out infinite alternate}
@keyframes tp-pendulo{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}
`,
  guirnalda: `<div class="tp-guirnalda" aria-hidden="true">${corazones()}</div>`,
  capa: particulas(18, "tp-sube tp-globo", 5, { colores: ["#d3255c", "#f08aa8", "#f7c2d2", "#e85d88"], tam: [12, 26], dur: [10, 18], deriva: 70, opacidad: [.55, .9], contenido: CORAZON_SVG }),
};

/* ========================================================== Día de la Madre */

function flor(cx: number, cy: number, r: number, petalo: string, centro: string): string {
  let d = "";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
    d += `<circle cx="${f1(cx + r * Math.cos(a))}" cy="${f1(cy + r * Math.sin(a))}" r="${f1(r * .95)}" fill="${petalo}"/>`;
  }
  return `<g class="tp-flor" style="transform-origin:${cx}px ${cy}px">${d}<circle cx="${cx}" cy="${cy}" r="${f1(r * .55)}" fill="${centro}"/></g>`;
}

function enredadera(): string {
  const c = cuerda(1400, 200, 8, 3);
  let cosas = "";
  for (let k = 0; k < 40; k++) {
    const p = c.en(20 + k * 35);
    if (k % 4 === 1) {
      cosas += flor(p.x, p.y + 12, k % 8 === 1 ? 4.6 : 3.6, k % 8 === 1 ? "#f4a7bb" : "#f9c9d6", "#f4c542");
    } else {
      const lado = k % 2 ? 1 : -1;
      cosas += `<ellipse cx="${p.x}" cy="${f1(p.y + 7)}" rx="3" ry="6.5" fill="#8db36f" transform="rotate(${lado * 28} ${p.x} ${f1(p.y + 7)})"/>`;
    }
  }
  return `<svg viewBox="0 0 1400 48" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><path d="${c.d}" fill="none" stroke="#7fa562" stroke-width="1.6"/>${cosas}</svg>`;
}

const RAMO = `<svg viewBox="0 0 120 120" aria-hidden="true"><g fill="none" stroke="#7fa562" stroke-width="1.6" stroke-linecap="round"><path d="M8 112C20 80 34 60 62 40M8 112c10-40 26-62 56-84M8 112C30 92 50 84 76 78"/></g><g fill="#8db36f"><ellipse cx="30" cy="84" rx="4" ry="9" transform="rotate(-40 30 84)"/><ellipse cx="44" cy="66" rx="4" ry="9" transform="rotate(-50 44 66)"/><ellipse cx="34" cy="100" rx="4" ry="9" transform="rotate(-70 34 100)"/><ellipse cx="56" cy="90" rx="4" ry="9" transform="rotate(-80 56 90)"/></g>${flor(64, 38, 8, "#f4a7bb", "#f4c542")}${flor(80, 78, 6.5, "#f9c9d6", "#f4c542")}${flor(48, 22, 5.5, "#e98ba5", "#f4c542")}</svg>`;

const DIA_MADRE: Temporada = {
  clave: "madre", nombre: "Día de la Madre", cuando: "Segundo domingo de mayo", emoji: "🌸",
  fondo: "#f7d9e3", texto: "#8c1638",
  anuncio: "🌸 Feliz Día, Mamá",
  css: `
:root{--tp-hueco:26px}
.anuncio{background:#f7d9e3;color:#8c1638}
.tp-flor{animation:tp-respira 4.2s ease-in-out infinite alternate}
@keyframes tp-respira{from{transform:scale(1)}to{transform:scale(1.12)}}
.tp-petalo{border-radius:100% 0 100% 0;background:currentColor;width:var(--s);height:calc(var(--s) * .62)}
.tp-ramo{position:absolute;left:0;bottom:0;width:150px;height:150px;transform:translate(-14px,10px)}
@media (max-width:899px){.tp-ramo{width:104px;height:104px}}
`,
  guirnalda: `<div class="tp-guirnalda" aria-hidden="true">${enredadera()}</div>`,
  capa: particulas(20, "tp-cae tp-petalo", 3, { colores: ["#f4a7bb", "#f9c9d6", "#e98ba5", "#fbe1e8"], tam: [10, 18], dur: [10, 17], deriva: 90, giro: 400, opacidad: [.7, .95] })
    + `<div class="tp-ramo">${RAMO}</div>`,
};

/* =========================================================== Fiestas Patrias */

function banderines(): string {
  const c = cuerda(1400, 280, 12, 3);
  let triangulos = "";
  for (let k = 0; k < 36; k++) {
    const x = 20 + k * 39;
    const p = c.en(x);
    const rojo = k % 2 === 0;
    triangulos += `<path d="M${f1(x - 15)} ${f1(p.y)}L${f1(x + 15)} ${f1(p.y)}L${x} ${f1(p.y + 27)}Z" fill="${rojo ? "#d91023" : "#fff"}" stroke="${rojo ? "#b70d1d" : "#d91023"}" stroke-width="1"/>`;
  }
  return `<svg viewBox="0 0 1400 48" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><path d="${c.d}" fill="none" stroke="#8a8a8a" stroke-width="1.4"/><g class="tp-vientos">${triangulos}</g></svg>`;
}

const BANDERA = `<svg viewBox="0 0 18 12" width="18" height="12" aria-hidden="true" style="display:inline-block;vertical-align:-1px;margin-right:6px"><rect width="6" height="12" fill="#d91023"/><rect x="6" width="6" height="12" fill="#fff"/><rect x="12" width="6" height="12" fill="#d91023"/></svg>`;

const PATRIAS: Temporada = {
  clave: "patrias", nombre: "Fiestas Patrias", cuando: "28 y 29 de julio", emoji: "🇵🇪",
  fondo: "#d91023", texto: "#ffffff",
  anuncio: `${BANDERA}¡Viva el Perú! Fiestas Patrias`,
  css: `
:root{--tp-hueco:40px}
.anuncio{background:#d91023;color:#fff}
.tp-vientos{transform-box:view-box;transform-origin:50% 0;animation:tp-viento 4.8s ease-in-out infinite alternate}
@keyframes tp-viento{from{transform:skewX(-5deg)}to{transform:skewX(5deg)}}
.tp-papel{border-radius:1px;background:currentColor;height:calc(var(--s) * .55)}
.tp-papel--blanco{box-shadow:inset 0 0 0 1px #e0b3b8}
`,
  guirnalda: `<div class="tp-guirnalda" aria-hidden="true">${banderines()}</div>`,
  capa: particulas(16, "tp-cae tp-papel", 17, { colores: ["#d91023", "#d91023", "#b70d1d"], tam: [7, 12], dur: [9, 15], deriva: 70, giro: 600, opacidad: [.8, 1] })
    + particulas(8, "tp-cae tp-papel tp-papel--blanco", 18, { colores: ["#fff"], tam: [7, 12], dur: [9, 15], deriva: 70, giro: 600, opacidad: [.9, 1] }),
};

/* ================================================================== registro */

export const TEMPORADAS: Temporada[] = [SAN_VALENTIN, DIA_MADRE, PATRIAS, HALLOWEEN, NAVIDAD, ANO_NUEVO];

export const CLAVES_TEMPORADA = TEMPORADAS.map((t) => t.clave);

/** La temporada de esa clave, o ninguna si no existe o está vacía. */
export function temporada(clave: string | null | undefined): Temporada | null {
  if (!clave) return null;
  return TEMPORADAS.find((t) => t.clave === clave) ?? null;
}

/** Lo que el panel necesita para pintar las opciones. */
export function resumenTemporadas() {
  return TEMPORADAS.map(({ clave, nombre, cuando, emoji, fondo, texto }) =>
    ({ clave, nombre, cuando, emoji, fondo, texto }));
}

/** El <style> de una temporada, listo para la cabeza de la página. */
export function estilosTemporada(t: Temporada): string {
  // Por si algún día un CSS llevara la secuencia que cierra el bloque.
  return `<style data-temporada>${(BASE_CSS + t.css).replace(/<\/style/gi, "<\\/style")}</style>`;
}

/** La capa fija con lo que se mueve. Va al final del cuerpo. */
export function capaTemporada(t: Temporada): string {
  return `<div class="tp" aria-hidden="true">${t.capa}</div>`;
}
