/* Temporadas, segunda versión: una campaña, no una capa.
 *
 * La primera versión ponía cosas cayendo por encima de todo el catálogo:
 * confeti, nieve y murciélagos pasando por delante de las fotos. Llamaba la
 * atención, pero sobre la ropa, que es justo lo que no tiene que tapar.
 *
 * Esta hace lo que hacen las tiendas de moda en temporada:
 *
 *   barra      la de arriba toma el color de la fecha, con un icono dibujado
 *   cabecera   una línea fina del mismo color bajo el menú
 *   banner     una pieza de campaña sobre la lista: titular editorial,
 *              una frase y una ilustración que se mueve DENTRO del banner.
 *              Fuera de él no se mueve nada
 *
 * En la ficha de producto solo hay barra y línea: ahí manda la prenda.
 *
 * Todo es CSS y SVG en línea; lo único que se pide aparte es la tipografía
 * del titular (Cormorant Garamond, de Google Fonts, como Montserrat). Solo se
 * anima transform y opacity, y con `prefers-reduced-motion` todo queda
 * quieto. Mismo contrato que temporadas.mts: pieza(clave). */

import type { Pieza } from "./temporadas.mts";

export type Temporada = {
  clave: string;
  nombre: string;
  cuando: string;
  emoji: string;
  /** Colores de la barra; el panel los usa de muestra. */
  fondo: string;
  texto: string;
  /** Línea bajo la cabecera. */
  acento: string;
  icono: string;
  barra: string;
  /** El banner: textos, colores y la ilustración. */
  ceja: string;
  titulo: string;
  linea: string;
  colores: { fondo: string; titulo: string; ceja: string; texto: string; borde?: string };
  arte: string;
  /** Lo que va de lado a lado del banner, detrás del texto (suelo, esquinas). */
  fondo_extra?: string;
  css: string;
};

/* ------------------------------------------------------------- utilidades */

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

/** Partículas que se mueven dentro del área de la ilustración del banner,
 *  nunca por encima del texto ni del catálogo. */
function particulas(n: number, clase: string, semilla: number, o: {
  colores: string[]; tam: [number, number]; dur: [number, number];
  deriva?: number; giro?: number; opacidad?: [number, number]; contenido?: string;
}): string {
  const r = azar(semilla);
  const entre = ([a, b]: [number, number]) => a + r() * (b - a);
  let html = "";
  for (let i = 0; i < n; i++) {
    const t = entre(o.dur);
    html += `<i class="${clase} tb-mov" style="--x:${f1((i + r()) / n * 100)}%;--t:${f1(t)}s;--d:${f1(-r() * t)}s;`
      + `--s:${f1(entre(o.tam))}px;--o:${f1(entre(o.opacidad ?? [.6, 1]))};`
      + `--dx:${f1((r() - .5) * 2 * (o.deriva ?? 20))}px;--rot:${Math.round((r() - .5) * 2 * (o.giro ?? 0))}deg;`
      + `color:${o.colores[i % o.colores.length]}">${o.contenido ?? ""}</i>`;
  }
  return html;
}

function estrella(r: number, ri: number, puntas = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < puntas * 2; i++) {
    const rad = i % 2 === 0 ? r : ri;
    const a = -Math.PI / 2 + (Math.PI / puntas) * i;
    pts.push(`${f1(rad * Math.cos(a))},${f1(rad * Math.sin(a))}`);
  }
  return `M${pts.join("L")}Z`;
}

const ico = (cuerpo: string, relleno = false) =>
  `<svg width="13" height="13" viewBox="0 0 24 24" ${relleno ? 'fill="currentColor" stroke="none"'
    : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${cuerpo}</svg>`;

/* La base del banner, común a todas. Los colores llegan por variables. */
const BASE_CSS = `
.anuncio{background:var(--tb-barra);color:var(--tb-barra-texto)}
.anuncio svg{display:inline-block;vertical-align:-2px;margin-right:7px}
.tb-envios{display:none}
@media (min-width:640px){.tb-envios{display:inline}}
.cabecera{border-bottom:2px solid var(--tb-acento)}
.tb{position:relative;overflow:hidden;isolation:isolate;display:flex;align-items:center;
  min-height:188px;margin:16px 0 0;padding:24px 20px;border-radius:var(--radio);
  background:var(--tb-fondo);color:var(--tb-texto);box-shadow:inset 0 0 0 1px var(--tb-borde,transparent)}
.tb__texto{position:relative;z-index:2;max-width:58%;animation:tb-entra .9s var(--curva) both}
@keyframes tb-entra{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.tb__ceja{display:block;font-size:10px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--tb-ceja)}
.tb__titulo{display:block;margin:10px 0 12px;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;
  font-style:italic;font-weight:500;font-size:42px;line-height:.92;letter-spacing:-.005em;color:var(--tb-titulo)}
.tb__linea{display:block;font-size:12px;line-height:1.5;max-width:26ch}
.tb__arte{position:absolute;top:0;right:0;bottom:0;width:50%;z-index:1;overflow:hidden;pointer-events:none}
.tb__arte>svg{position:absolute;inset:0;width:100%;height:100%}
.tb-centro{transform-box:fill-box;transform-origin:center}
.tb__fondo{position:absolute;inset:0;z-index:0;pointer-events:none}
.tb-cae,.tb-sube{position:absolute;left:var(--x);width:var(--s);height:var(--s);opacity:0;will-change:transform}
.tb-cae{top:-14px;animation:tb-cae var(--t) linear var(--d) infinite}
.tb-sube{bottom:-20px;animation:tb-sube var(--t) ease-in var(--d) infinite}
.tb-cae>svg,.tb-sube>svg{display:block;width:100%;height:100%}
@keyframes tb-cae{0%{transform:translate3d(0,0,0) rotate(0);opacity:0}8%{opacity:var(--o)}88%{opacity:var(--o)}100%{transform:translate3d(var(--dx),330px,0) rotate(var(--rot));opacity:0}}
@keyframes tb-sube{0%{transform:translate3d(0,0,0) scale(.6);opacity:0}12%{opacity:var(--o)}75%{opacity:var(--o)}100%{transform:translate3d(var(--dx),-320px,0) scale(1);opacity:0}}
@media (min-width:640px){.tb{min-height:224px;padding:32px 40px}.tb__titulo{font-size:60px}.tb__linea{font-size:13px;max-width:32ch}.tb__arte{width:54%}}
@media (min-width:900px){.tb{min-height:272px;padding:44px 64px;margin-top:24px}.tb__titulo{font-size:84px}.tb__linea{font-size:14px}.tb__arte{width:58%}}
@media (prefers-reduced-motion:reduce){.tb,.tb *{animation:none!important}.tb .tb-mov{display:none}}
`;

/* ================================================================ Halloween */

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
      d += (i === 0 ? `M${f1(prev * Math.cos(a0))} ${f1(prev * Math.sin(a0))}` : "")
        + `Q${f1(hund * Math.cos(am))} ${f1(hund * Math.sin(am))} ${f1(rad * Math.cos(a1))} ${f1(rad * Math.sin(a1))}`;
      prev = rad;
    }
    partes.push(d);
  }
  return partes.join("");
}

const MURCIELAGO = "M30 11C26 4 18 2 10 6 4 9 2 16 1 23c5-4 11-4 15 0 2-6 8-7 14-2 6-5 12-4 14 2 4-4 10-4 15 0-1-7-3-14-9-17-8-4-16-2-20 5z";

const HALLOWEEN: Temporada = {
  clave: "halloween", nombre: "Halloween", cuando: "Octubre", emoji: "🎃",
  fondo: "#1c0f2b", texto: "#f6a53b", acento: "#1c0f2b",
  icono: ico('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>'),
  barra: "Halloween en Euchel",
  ceja: "Octubre en Euchel", titulo: "Halloween", linea: "Looks oscuros para la noche más esperada del año.",
  colores: {
    fondo: "radial-gradient(120% 130% at 82% 18%,#3b1e50 0%,#1d1029 52%,#120a1b 100%)",
    titulo: "#f6a53b", ceja: "#b9a3cc", texto: "#e7dcef",
  },
  fondo_extra: `<svg class="tbh-suelo" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 80V44C120 22 210 30 330 46s230 6 360-14 260 4 380 20 130 2 130 2V80z" fill="#0d0714"/><path d="M0 80V58c160-16 300-6 460 6s330-2 470-12 200 2 270 8V80z" fill="#08040d"/></svg>`
    + `<svg class="tbh-tela" viewBox="0 0 150 150" aria-hidden="true"><g transform="translate(150 0) scale(-1 1)" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-width="1.2"><path d="${telarana()}"/></g></svg>`,
  arte: `<svg viewBox="0 0 300 280" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
<defs><radialGradient id="tbh-halo"><stop offset="0" stop-color="#f6d9a8" stop-opacity=".55"/><stop offset="1" stop-color="#f6d9a8" stop-opacity="0"/></radialGradient></defs>
<circle class="tbh-halo tb-centro" cx="190" cy="108" r="118" fill="url(#tbh-halo)"/>
<circle cx="190" cy="108" r="54" fill="#f1e2c0"/>
<g fill="#ddc89c" opacity=".7"><circle cx="171" cy="94" r="9"/><circle cx="206" cy="126" r="6.5"/><circle cx="201" cy="88" r="4"/><circle cx="178" cy="128" r="3.5"/></g>
<g class="tbh-bat" style="--d:0s"><g class="tbh-ala tb-centro"><path d="${MURCIELAGO}" fill="#0c0612" transform="scale(.55)"/></g></g>
<g class="tbh-bat tbh-bat--2" style="--d:-4.5s"><g class="tbh-ala tb-centro"><path d="${MURCIELAGO}" fill="#0c0612" transform="scale(.38)"/></g></g>
<g class="tbh-arana"><line x1="244" y1="-240" x2="244" y2="58" stroke="#efe3cf" stroke-opacity=".55" stroke-width="1"/>
<g transform="translate(244 66)"><g class="tbh-mece" style="transform-box:fill-box"><g fill="none" stroke="#0c0612" stroke-width="1.8" stroke-linecap="round"><path d="M-4 0c-5-5-8-7-13-6M-5 3c-6-2-9-2-14 1M-5 6c-6 1-9 3-13 8M-4 9c-5 4-7 7-10 13M4 0c5-5 8-7 13-6M5 3c6-2 9-2 14 1M5 6c6 1 9 3 13 8M4 9c5 4 7 7 10 13"/></g>
<ellipse cx="0" cy="-1" rx="4.6" ry="4.2" fill="#0c0612"/><ellipse cx="0" cy="9" rx="7" ry="8.6" fill="#0c0612"/><circle cx="-1.7" cy="-2" r="1" fill="#f6a53b"/><circle cx="1.7" cy="-2" r="1" fill="#f6a53b"/></g></g></g>
</svg>`,
  css: `
.tbh-suelo{position:absolute;left:0;right:0;bottom:0;width:100%;height:44px}
.tbh-tela{position:absolute;top:0;right:0;width:96px;height:96px}
@media (min-width:900px){.tbh-suelo{height:64px}.tbh-tela{width:132px;height:132px}}
.tbh-halo{animation:tbh-pulso 6s ease-in-out infinite}
@keyframes tbh-pulso{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
.tbh-bat{animation:tbh-vuela 11s linear var(--d) infinite}
.tbh-bat--2{animation-duration:14s}
@keyframes tbh-vuela{0%{transform:translate(-40px,70px)}30%{transform:translate(90px,52px)}60%{transform:translate(200px,78px)}100%{transform:translate(340px,40px)}}
.tbh-ala{animation:tbh-aleteo .42s ease-in-out infinite alternate}
@keyframes tbh-aleteo{from{transform:scaleY(1)}to{transform:scaleY(.45)}}
.tbh-arana{animation:tbh-baja 13s cubic-bezier(.45,0,.3,1) infinite}
@keyframes tbh-baja{0%,100%{transform:translateY(-110px)}30%,62%{transform:translateY(0)}70%{transform:translateY(-18px)}78%{transform:translateY(-4px)}}
.tbh-mece{transform-origin:50% -60px;animation:tbh-balanceo 3.2s ease-in-out infinite alternate}
@keyframes tbh-balanceo{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
`,
};

/* ================================================================== Navidad */

function arbol(): string {
  // Un árbol de líneas doradas, con luces que se encienden por turnos.
  const r = azar(12);
  const luces = [[160, 82], [182, 96], [146, 122], [196, 132], [170, 140], [132, 176], [212, 172], [158, 186], [188, 196], [118, 214], [226, 210], [174, 224]];
  const cols = ["#f5e6c8", "#e8c56b", "#e5786d"];
  return `<g fill="none" stroke="#d9b45a" stroke-width="1.6" stroke-linejoin="round">
<path d="M170 52L134 108h20l-34 56h24l-38 66h128l-38-66h24l-34-56h20z"/>
<path d="M162 230v18h16v-18" />
<path d="M150 104q20 10 40 0M132 160q38 16 76 0M114 226q56 18 112 0" stroke-opacity=".55"/></g>
${luces.map(([x, y], i) => `<circle class="tbn-luz" style="animation-delay:${f1(-r() * 3)}s" cx="${x}" cy="${y}" r="2.6" fill="${cols[i % 3]}"/>`).join("")}
<g transform="translate(170 46)"><g class="tbn-estrella tb-centro"><path d="${estrella(13, 5.2)}" fill="#f2cf6b"/></g></g>`;
}

const NAVIDAD: Temporada = {
  clave: "navidad", nombre: "Navidad", cuando: "Diciembre", emoji: "🎄",
  fondo: "#0f3b2e", texto: "#f5e6c8", acento: "#0f3b2e",
  icono: ico('<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5"/>'),
  barra: "Navidad en Euchel",
  ceja: "Temporada de regalos", titulo: "Navidad", linea: "Prendas para regalar y para estrenar en Nochebuena.",
  colores: {
    fondo: "radial-gradient(120% 130% at 78% 20%,#1d5a46 0%,#0f3b2e 55%,#0a291f 100%)",
    titulo: "#ecd08a", ceja: "#9cc4b2", texto: "#e3eee8",
  },
  arte: `<svg viewBox="0 0 300 280" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${arbol()}</svg>`
    + particulas(16, "tb-cae tbn-copo", 7, { colores: ["#ffffff"], tam: [3, 6], dur: [7, 12], deriva: 26, opacidad: [.45, .9] }),
  css: `
.tbn-luz{animation:tbn-brilla 2.6s ease-in-out infinite}
@keyframes tbn-brilla{0%,100%{opacity:1}50%{opacity:.25}}
.tbn-estrella{animation:tbn-gira 9s linear infinite}
@keyframes tbn-gira{0%{transform:rotate(0) scale(1)}50%{transform:rotate(36deg) scale(1.12)}100%{transform:rotate(72deg) scale(1)}}
.tbn-copo{border-radius:50%;background:currentColor;filter:blur(.3px)}
`,
};

/* ================================================================ Año Nuevo */

function estallido(cx: number, cy: number, r: number, color: string, retraso: number): string {
  let d = "", puntas = "";
  for (let i = 0; i < 18; i++) {
    const a = (Math.PI * 2 * i) / 18;
    d += `M${f1(cx + r * .22 * Math.cos(a))} ${f1(cy + r * .22 * Math.sin(a))}L${f1(cx + r * .86 * Math.cos(a))} ${f1(cy + r * .86 * Math.sin(a))}`;
    puntas += `<circle cx="${f1(cx + r * Math.cos(a))}" cy="${f1(cy + r * Math.sin(a))}" r="1.6"/>`;
  }
  return `<g class="tba-fuego tb-centro" style="animation-delay:${retraso}s" stroke="${color}" fill="${color}">`
    + `<path d="${d}" stroke-width="1.4" stroke-linecap="round" fill="none"/>${puntas}</g>`;
}

function chispas(): string {
  const r = azar(21);
  let html = "";
  for (let i = 0; i < 12; i++) {
    const x = 20 + r() * 260, y = 20 + r() * 240, s = 3 + r() * 4;
    html += `<g transform="translate(${f1(x)} ${f1(y)})"><path class="tba-chispa tb-centro" style="animation-delay:${f1(-r() * 3)}s" d="${estrella(s, s * .22, 4)}" fill="#f3dc95"/></g>`;
  }
  return html;
}

function anoQueEntra(): number {
  const hoy = new Date();
  return hoy.getMonth() >= 6 ? hoy.getFullYear() + 1 : hoy.getFullYear();
}

const ANO_NUEVO: Temporada = {
  clave: "anonuevo", nombre: "Año Nuevo", cuando: "Fin de diciembre", emoji: "✨",
  fondo: "#0a0a0a", texto: "#e6c15c", acento: "#e6c15c",
  icono: ico(`<path d="${estrella(10, 2.4, 4)}" transform="translate(12 12)"/>`, true),
  barra: `Feliz ${anoQueEntra()}`,
  ceja: "Cuenta regresiva", titulo: `Feliz ${anoQueEntra()}`, linea: "Brilla en la última noche del año.",
  colores: {
    fondo: "radial-gradient(120% 140% at 78% 26%,#2c2616 0%,#0e0d0a 58%,#080807 100%)",
    titulo: "#e9c868", ceja: "#b7a36e", texto: "#efe9dc",
  },
  arte: `<svg viewBox="0 0 300 280" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${chispas()}`
    + estallido(170, 96, 70, "#e6c15c", 0) + estallido(236, 176, 48, "#e8a3b4", -1.6)
    + estallido(96, 178, 42, "#d6d9de", -3.1) + `</svg>`,
  css: `
.tba-fuego{opacity:0;animation:tba-estalla 4.8s cubic-bezier(.2,.7,.2,1) infinite}
@keyframes tba-estalla{0%{opacity:0;transform:scale(.15)}6%{opacity:1}38%{opacity:.85;transform:scale(1)}62%{opacity:0;transform:scale(1.05) translateY(8px)}100%{opacity:0;transform:scale(1.05) translateY(8px)}}
.tba-chispa{animation:tba-titila 3s ease-in-out infinite}
@keyframes tba-titila{0%,100%{opacity:.15;transform:scale(.6)}50%{opacity:1;transform:scale(1)}}
`,
};

/* ============================================================= San Valentín */

const CORAZON = "M0 4.2C-1.6 1.6-6.4.4-6.4-3.4c0-2.6 1.9-4 3.8-4 1.2 0 2.1.6 2.6 1.4.5-.8 1.4-1.4 2.6-1.4 1.9 0 3.8 1.4 3.8 4C6.4.4 1.6 1.6 0 4.2z";
const CORAZON_SVG = `<svg viewBox="-7 -8 14 13" aria-hidden="true"><path d="${CORAZON}" fill="currentColor"/></svg>`;

const SAN_VALENTIN: Temporada = {
  clave: "sanvalentin", nombre: "San Valentín", cuando: "14 de febrero", emoji: "💗",
  fondo: "#d3255c", texto: "#ffffff", acento: "#d3255c",
  icono: ico(`<path d="${CORAZON}" transform="translate(12 13) scale(1.5)"/>`, true),
  barra: "San Valentín en Euchel",
  ceja: "14 de febrero", titulo: "San Valentín", linea: "Para salir, para regalar, para ti.",
  colores: {
    fondo: "linear-gradient(135deg,#fdf0f4 0%,#f9d7e3 100%)",
    titulo: "#b0174a", ceja: "#c25b7e", texto: "#6b2a3f", borde: "#f3c9d7",
  },
  arte: `<svg viewBox="0 0 300 280" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
<g transform="translate(176 146)"><g class="tbv-late tb-centro">
<path d="${CORAZON}" transform="translate(-14 -10) scale(8.6) rotate(-8)" fill="#f6bccd" opacity=".55"/>
<path d="${CORAZON}" transform="scale(10)" fill="none" stroke="#d3255c" stroke-width=".16"/>
<path d="${CORAZON}" transform="scale(7.6)" fill="none" stroke="#d3255c" stroke-opacity=".4" stroke-width=".18"/></g></g></svg>`
    + particulas(11, "tb-sube", 5, { colores: ["#d3255c", "#ef7fa0", "#f4a9bf"], tam: [9, 18], dur: [7, 12], deriva: 30, opacidad: [.55, .9], contenido: CORAZON_SVG }),
  css: `
.tbv-late{animation:tbv-latido 2.6s ease-in-out infinite}
@keyframes tbv-latido{0%,100%{transform:scale(1)}14%{transform:scale(1.06)}28%{transform:scale(1)}42%{transform:scale(1.04)}}
`,
};

/* ========================================================== Día de la Madre */

function flor(cx: number, cy: number, r: number, clase: string, retraso: number, tallo: string): string {
  let petalos = "";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
    petalos += `<ellipse cx="${f1(cx + r * .9 * Math.cos(a))}" cy="${f1(cy + r * .9 * Math.sin(a))}" rx="${f1(r * .62)}" ry="${f1(r * .9)}" transform="rotate(${f1(a * 180 / Math.PI + 90)} ${f1(cx + r * .9 * Math.cos(a))} ${f1(cy + r * .9 * Math.sin(a))})"/>`;
  }
  return `<g class="${clase}" style="animation-delay:${retraso}s;transform-box:fill-box">
<path d="${tallo}" fill="none" stroke="#7f9a6b" stroke-width="1.6" stroke-linecap="round"/>
<g fill="#f7d6df" stroke="#c76a86" stroke-width="1.2">${petalos}</g>
<circle cx="${cx}" cy="${cy}" r="${f1(r * .42)}" fill="#e7b75f"/></g>`;
}

const DIA_MADRE: Temporada = {
  clave: "madre", nombre: "Día de la Madre", cuando: "Segundo domingo de mayo", emoji: "🌸",
  fondo: "#f7d9e3", texto: "#8c1638", acento: "#e9b8c6",
  icono: ico('<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5C10 6 10 3.5 12 2c2 1.5 2 4 0 7.5zM14.4 11.2c3.6-1.6 6-1.2 7.2.9-1.4 1.9-3.9 2.3-7.2.9zM9.6 11.2C6 9.6 3.6 10 2.4 12.1c1.4 1.9 3.9 2.3 7.2.9zM13.4 14.2c1.6 3.4 1.6 5.9-.4 7.4-2-1.5-2-4 .4-7.4zM10.6 14.2c-2.4 3.4-2.4 5.9-.4 7.4 2-1.5 2-4 .4-7.4z"/>'),
  barra: "Feliz Día, Mamá",
  ceja: "Mayo en Euchel", titulo: "Para mamá", linea: "Detalles que se notan. Envíos a todo el Perú.",
  colores: {
    fondo: "linear-gradient(135deg,#faf1ec 0%,#f3dfe2 100%)",
    titulo: "#7a2a44", ceja: "#b0607b", texto: "#5c3a44", borde: "#eed3d9",
  },
  arte: `<svg viewBox="0 0 300 280" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
<g fill="#9bb38a"><ellipse cx="150" cy="226" rx="5" ry="13" transform="rotate(-40 150 226)"/><ellipse cx="198" cy="214" rx="5" ry="13" transform="rotate(38 198 214)"/><ellipse cx="128" cy="190" rx="4.5" ry="11" transform="rotate(-62 128 190)"/></g>
${flor(130, 112, 20, "tbm-flor", 0, "M170 290C162 220 140 170 130 128")}
${flor(212, 86, 24, "tbm-flor tbm-flor--2", -1.4, "M178 290C190 220 206 150 212 106")}
${flor(176, 160, 15, "tbm-flor tbm-flor--3", -2.6, "M174 290C176 240 176 200 176 176")}
</svg>` + particulas(9, "tb-cae tbm-petalo", 3, { colores: ["#f0a9bd", "#f7c9d5", "#e98ba5"], tam: [8, 13], dur: [8, 13], deriva: 40, giro: 300, opacidad: [.6, .9] }),
  css: `
.tbm-flor{transform-origin:50% 100%;animation:tbm-mece 5.5s ease-in-out infinite alternate}
.tbm-flor--2{animation-duration:6.4s}.tbm-flor--3{animation-duration:4.8s}
@keyframes tbm-mece{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}
.tbm-petalo{border-radius:100% 0 100% 0;background:currentColor;height:calc(var(--s) * .62)}
`,
};

/* =========================================================== Fiestas Patrias */

function bandera(): string {
  // La bandera en tiras verticales que suben y bajan con un desfase: así
  // ondea sin deformar nada más que su propio dibujo.
  let tiras = "";
  const ancho = 9, n = 15;
  for (let i = 0; i < n; i++) {
    const color = i < 5 || i >= 10 ? "#d91023" : "#ffffff";
    tiras += `<rect class="tbp-ola" style="animation-delay:${f1(-i * .11)}s" x="${116 + i * ancho}" y="62" width="${ancho + .6}" height="92" fill="${color}"/>`;
  }
  return `<line x1="114" y1="40" x2="114" y2="262" stroke="#9a8f8f" stroke-width="3" stroke-linecap="round"/>
<circle cx="114" cy="38" r="4.5" fill="#c9a24a"/>${tiras}`;
}

function escarapela(): string {
  return `<g transform="translate(236 196)"><g class="tbp-gira tb-centro">
<path d="M-8 18l-9 34 11-6 6 10 4-36zM8 18l9 34-11-6-6 10-4-36z" fill="#d91023"/>
<circle r="30" fill="#d91023"/><circle r="22" fill="#fff"/><circle r="13" fill="#d91023"/>
<g stroke="#fff" stroke-opacity=".35" stroke-width="1">${Array.from({ length: 24 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 24;
    return `<line x1="${f1(23 * Math.cos(a))}" y1="${f1(23 * Math.sin(a))}" x2="${f1(29 * Math.cos(a))}" y2="${f1(29 * Math.sin(a))}"/>`;
  }).join("")}</g></g></g>`;
}

const PATRIAS: Temporada = {
  clave: "patrias", nombre: "Fiestas Patrias", cuando: "28 y 29 de julio", emoji: "🇵🇪",
  fondo: "#d91023", texto: "#ffffff", acento: "#d91023",
  icono: `<svg width="16" height="11" viewBox="0 0 18 12" aria-hidden="true"><rect width="6" height="12" fill="currentColor"/><rect x="6" width="6" height="12" fill="#d91023" stroke="currentColor" stroke-width=".8"/><rect x="12" width="6" height="12" fill="currentColor"/></svg>`,
  barra: "¡Viva el Perú! Fiestas Patrias",
  ceja: "28 y 29 de julio", titulo: "Fiestas Patrias", linea: "Celebra con estilo. Hecho con orgullo peruano.",
  colores: {
    fondo: "linear-gradient(135deg,#fdf3f4 0%,#f7dfe2 100%)",
    titulo: "#c8102e", ceja: "#b05a64", texto: "#5a2a30", borde: "#f1d3d7",
  },
  arte: `<svg viewBox="0 0 300 280" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${bandera()}${escarapela()}</svg>`
    + particulas(10, "tb-cae tbp-papel", 17, { colores: ["#d91023", "#ffffff", "#d91023"], tam: [6, 10], dur: [7, 11], deriva: 40, giro: 500, opacidad: [.8, 1] }),
  css: `
.tbp-ola{animation:tbp-ondea 2.4s ease-in-out infinite}
@keyframes tbp-ondea{0%,100%{transform:translateY(0)}50%{transform:translateY(7px)}}
.tbp-gira{animation:tbp-gira 14s ease-in-out infinite alternate}
@keyframes tbp-gira{from{transform:rotate(-8deg)}to{transform:rotate(8deg)}}
.tbp-papel{border-radius:1px;background:currentColor;height:calc(var(--s) * .55);box-shadow:0 0 0 .5px rgba(217,16,35,.35)}
`,
};

/* ================================================================== registro */

export const TEMPORADAS: Temporada[] = [SAN_VALENTIN, DIA_MADRE, PATRIAS, HALLOWEEN, NAVIDAD, ANO_NUEVO];

export const CLAVES_TEMPORADA = TEMPORADAS.map((t) => t.clave);

export function temporada(clave: string | null | undefined): Temporada | null {
  if (!clave) return null;
  return TEMPORADAS.find((t) => t.clave === clave) ?? null;
}

export function resumenTemporadas() {
  return TEMPORADAS.map(({ clave, nombre, cuando, emoji, fondo, texto }) =>
    ({ clave, nombre, cuando, emoji, fondo, texto }));
}

const FUENTE = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500&display=swap">`;

function variables(t: Temporada): string {
  const c = t.colores;
  return `:root{--tb-barra:${t.fondo};--tb-barra-texto:${t.texto};--tb-acento:${t.acento};`
    + `--tb-fondo:${c.fondo};--tb-titulo:${c.titulo};--tb-ceja:${c.ceja};--tb-texto:${c.texto};`
    + `${c.borde ? `--tb-borde:${c.borde};` : ""}}`;
}

export function pieza(clave: string | null | undefined): Pieza | null {
  const t = temporada(clave);
  if (!t) return null;
  const css = (variables(t) + BASE_CSS + t.css).replace(/<\/style/gi, "<\\/style");
  return {
    clave: t.clave,
    fondo: t.fondo,
    anuncio: `${t.icono}${t.barra}`,
    // La barra entera: en el celular solo la fecha, que en dos líneas se
    // leía partida en columnas.
    barra: `${t.icono}${t.barra}<span class="tb-envios"> · Envíos a todo el Perú</span>`,
    cabeza: `${FUENTE}\n<style data-temporada>${css}</style>`,
    guirnalda: "",
    banner: `<section class="tb" aria-label="${t.nombre}">
  <div class="tb__texto"><span class="tb__ceja">${t.ceja}</span><span class="tb__titulo">${t.titulo}</span><span class="tb__linea">${t.linea}</span></div>
  ${t.fondo_extra ? `<div class="tb__fondo" aria-hidden="true">${t.fondo_extra}</div>` : ""}<div class="tb__arte" aria-hidden="true">${t.arte}</div>
</section>`,
    capa: "",
  };
}
