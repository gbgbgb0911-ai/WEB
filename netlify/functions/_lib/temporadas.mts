/* Temporadas: el catálogo vestido para una fecha.
 *
 * Una temporada son tres cosas, y las tres van dentro del HTML solo cuando
 * está puesta (con ninguna, la página sale byte a byte como siempre):
 *
 *   anuncio    la barra de arriba cambia de color, lleva un icono dibujado y
 *              un brillo que la recorre de vez en cuando
 *   guirnalda  algo colgado del borde de la cabecera, que es fija: luces,
 *              banderines, corazones, calabazas. Cada pieza cuelga de su
 *              hilo y se mece por su cuenta
 *   capa       una capa fija por encima de todo, sin recibir clics, con lo
 *              que se mueve todo el rato: nieve, pétalos, murciélagos,
 *              fuegos artificiales. Y los adornos de las esquinas
 *
 * Lo que da el acabado:
 *
 *   profundidad  lo que cae o sube va en dos o tres planos: lejos, chico,
 *                lento y tenue; cerca, grande, rápido y nítido
 *   vaivén       nada cae en línea recta: cada pieza se balancea de lado y,
 *                si es plana (confeti, pétalos), gira en 3D como el papel
 *   volumen      degradados y un punto de luz en bombillas, corazones,
 *                calabazas y banderines, en vez de colores planos
 *   tono         el botón de la categoría elegida toma el color de la fecha
 *
 * Todo es CSS y SVG en línea: ni una petición más, ni una línea de guion.
 * Solo se animan transform y opacity, y con `prefers-reduced-motion` lo que
 * se mueve desaparece y queda lo quieto. En el celular va la mitad de las
 * partículas (clase tp-pc).
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

type Opciones = {
  colores: string[];
  tam: [number, number];
  dur: [number, number];
  /** Cuánto se corre de lado en todo el recorrido, en px. */
  deriva?: number;
  /** Amplitud y duración del balanceo. */
  vaiven?: [number, number];
  ritmo?: [number, number];
  /** Giro en 3D en cada balanceo, en grados (papel, pétalos). */
  giro?: number;
  opacidad?: [number, number];
  contenido?: string;
  /** Las últimas N solo se ven en pantallas grandes. */
  soloPc?: number;
};

/** N partículas repartidas a lo ancho. La de fuera hace el recorrido (cae o
 *  sube); la de dentro, el balanceo y el giro. Cómo se ven lo dice la clase. */
function particulas(n: number, clase: string, semilla: number, o: Opciones): string {
  const r = azar(semilla);
  const entre = ([a, b]: [number, number]) => a + r() * (b - a);
  let html = "";
  for (let i = 0; i < n; i++) {
    const t = entre(o.dur);
    const pc = o.soloPc && i >= n - o.soloPc ? " tp-pc" : "";
    html += `<i class="${clase} tp-mov${pc}" style="--x:${f1((i + r()) / n * 100)}%;--t:${f1(t)}s;--d:${f1(-r() * t)}s;`
      + `--s:${f1(entre(o.tam))}px;--o:${f1(entre(o.opacidad ?? [.7, 1]))};--dx:${f1((r() - .5) * 2 * (o.deriva ?? 30))}px;`
      + `--sw:${f1(entre(o.vaiven ?? [6, 14]))}px;--sv:${f1(entre(o.ritmo ?? [2.4, 4]))}s;--r3:${Math.round((o.giro ?? 0) * (.6 + r() * .4))}deg;`
      + `color:${o.colores[i % o.colores.length]}"><b>${o.contenido ?? ""}</b></i>`;
  }
  return html;
}

/** Cuerda con comba, de lado a lado, y el punto de la curva en cada x. */
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

/** Pieza colgada en (x, y) que se mece desde su punto de anclaje. */
const colgada = (x: number, y: number, retraso: number, cuerpo: string, clase = "tp-pendulo") =>
  `<g transform="translate(${f1(x)} ${f1(y)})"><g class="${clase}" style="animation-delay:${f1(retraso)}s">${cuerpo}</g></g>`;

const guirnalda = (defs: string, cuerpo: string) =>
  `<div class="tp-guirnalda" aria-hidden="true"><svg viewBox="0 0 1400 48" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><defs>${defs}</defs>${cuerpo}</svg></div>`;

const icono = (cuerpo: string, relleno = false) =>
  `<svg width="13" height="13" viewBox="0 0 24 24" ${relleno ? 'fill="currentColor"'
    : 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${cuerpo}</svg>`;

function estrella(r: number, ri: number, puntas = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < puntas * 2; i++) {
    const rad = i % 2 === 0 ? r : ri;
    const a = -Math.PI / 2 + (Math.PI / puntas) * i;
    pts.push(`${f1(rad * Math.cos(a))},${f1(rad * Math.sin(a))}`);
  }
  return `M${pts.join("L")}Z`;
}

/* Lo común: la capa, lo que cae y sube, el balanceo, el brillo de la barra y
 * las piezas que cuelgan. */
const BASE_CSS = `
.tp{position:fixed;inset:0;z-index:22;pointer-events:none;overflow:hidden;contain:strict}
.tp *{pointer-events:none}
.tp svg{display:block}
.tp i,.tp b{display:block}
.tp b>svg{width:100%;height:100%;overflow:visible}
.tp div>svg{width:100%;height:auto}
.tp-cae,.tp-sube{position:absolute;left:var(--x);width:var(--s);height:var(--s);opacity:0;will-change:transform}
.tp-cae{top:-8vh;animation:tp-cae var(--t) linear var(--d) infinite}
.tp-sube{bottom:-10vh;animation:tp-sube var(--t) linear var(--d) infinite}
.tp-cae>b,.tp-sube>b{width:100%;height:100%;animation:tp-vaiven var(--sv) ease-in-out var(--d) infinite alternate}
@keyframes tp-cae{0%{transform:translate3d(0,0,0);opacity:0}6%{opacity:var(--o)}90%{opacity:var(--o)}100%{transform:translate3d(var(--dx),112vh,0);opacity:0}}
@keyframes tp-sube{0%{transform:translate3d(0,0,0) scale(.7);opacity:0}10%{opacity:var(--o)}80%{opacity:var(--o)}100%{transform:translate3d(var(--dx),-118vh,0) scale(1);opacity:0}}
@keyframes tp-vaiven{from{transform:translateX(calc(var(--sw) * -1)) rotate3d(1,.5,.25,calc(var(--r3) * -1))}to{transform:translateX(var(--sw)) rotate3d(1,.5,.25,var(--r3))}}
.anuncio{position:relative;overflow:hidden}
.anuncio::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,transparent 38%,var(--tp-brillo,rgba(255,255,255,.2)) 50%,transparent 62%);transform:translateX(-120%);animation:tp-brillo 9s ease-in-out 2s infinite}
@keyframes tp-brillo{0%,62%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
.anuncio svg{display:inline-block;vertical-align:-2px;margin-right:7px}
.cabecera{margin-bottom:var(--tp-hueco,28px)}
.tp-guirnalda{position:absolute;left:0;right:0;top:100%;height:48px;margin-top:-1px;pointer-events:none;overflow:visible}
.tp-guirnalda svg{width:100%;height:100%;display:block;overflow:visible}
.tp-pendulo{transform-box:fill-box;transform-origin:50% 0;animation:tp-pendulo var(--p,3.4s) ease-in-out infinite alternate}
@keyframes tp-pendulo{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}
@media (max-width:640px){.tp-pc{display:none}}
@media (prefers-reduced-motion:reduce){.tp .tp-mov,.tp-guirnalda .tp-mov{display:none}.tp *,.tp-guirnalda *,.anuncio::after{animation:none!important}.anuncio::after{display:none}}
`;

/* ================================================================ Halloween */

/** Telaraña de esquina: radios desde el vértice y anillos que se hunden
 *  entre radio y radio, como las de verdad, con gotas de rocío que brillan. */
function telarana(): string {
  const r = azar(31);
  const R = 150, radios = 7;
  const angulo = (i: number) => (Math.PI / 2) * (i / radios);
  const partes: string[] = [];
  let rocio = "";
  for (let i = 0; i <= radios; i++) {
    const a = angulo(i);
    partes.push(`M0 0L${f1(R * Math.cos(a))} ${f1(R * Math.sin(a))}`);
  }
  for (const base of [24, 50, 78, 108, 138]) {
    let d = "";
    let prev = base * (0.96 + r() * 0.08);
    for (let i = 0; i < radios; i++) {
      const rad = base * (0.96 + r() * 0.08);
      const a0 = angulo(i), a1 = angulo(i + 1), am = (a0 + a1) / 2;
      const hund = ((prev + rad) / 2) * 0.86;
      d += (i === 0 ? `M${f1(prev * Math.cos(a0))} ${f1(prev * Math.sin(a0))}` : "")
        + `Q${f1(hund * Math.cos(am))} ${f1(hund * Math.sin(am))} ${f1(rad * Math.cos(a1))} ${f1(rad * Math.sin(a1))}`;
      if (r() < .22) {
        rocio += `<circle class="tph-rocio" style="animation-delay:${f1(-r() * 4)}s" cx="${f1(rad * Math.cos(a1))}" cy="${f1(rad * Math.sin(a1))}" r="1.5"/>`;
      }
      prev = rad;
    }
    partes.push(d);
  }
  return `<svg viewBox="0 0 150 150" aria-hidden="true"><path d="${partes.join("")}" fill="none" stroke="currentColor" stroke-width=".8" stroke-linecap="round"/><g fill="#fff">${rocio}</g></svg>`;
}

const MURCIELAGO = "M30 11C26 4 18 2 10 6 4 9 2 16 1 23c5-4 11-4 15 0 2-6 8-7 14-2 6-5 12-4 14 2 4-4 10-4 15 0-1-7-3-14-9-17-8-4-16-2-20 5z";

const ARANA = `<svg viewBox="0 0 40 44" width="28" height="31" aria-hidden="true"><defs><radialGradient id="tph-a" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#4a3d55"/><stop offset=".55" stop-color="#1a1320"/><stop offset="1" stop-color="#07050a"/></radialGradient></defs>`
  + `<g fill="none" stroke="#120d16" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l-6-6-7 1M15 21l-8-3-6 4M15 24l-8 2-5 6M16 27l-5 5-3 8M24 18l6-6 7 1M25 21l8-3 6 4M25 24l8 2 5 6M24 27l5 5 3 8"/></g>`
  + `<ellipse cx="20" cy="17" rx="4.6" ry="4.2" fill="url(#tph-a)"/><ellipse cx="20" cy="27.5" rx="7.2" ry="8.8" fill="url(#tph-a)"/>`
  + `<ellipse cx="17.6" cy="24" rx="2" ry="3" fill="#fff" opacity=".18"/><path d="M17 30l3 3 3-3" fill="none" stroke="#f6a53b" stroke-width=".9" opacity=".7"/>`
  + `<circle cx="18.3" cy="16" r="1.1" fill="#ffb347"/><circle cx="21.7" cy="16" r="1.1" fill="#ffb347"/></svg>`;

function calabaza(id: string, cara = true): string {
  return `<svg viewBox="0 0 80 72" aria-hidden="true"><defs>`
    + `<radialGradient id="${id}c" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#ffb867"/><stop offset=".55" stop-color="#ec7a22"/><stop offset="1" stop-color="#a8460b"/></radialGradient>`
    + `<radialGradient id="${id}h"><stop offset="0" stop-color="#ffcf6b" stop-opacity=".6"/><stop offset="1" stop-color="#ffcf6b" stop-opacity="0"/></radialGradient></defs>`
    + (cara ? `<circle class="tph-halo" cx="40" cy="44" r="40" fill="url(#${id}h)"/>` : "")
    + `<path d="M39 17c0-7 3-11 9-13-1 4-3 8-4 13z" fill="#4c6b2f"/><path d="M44 8c5-4 10-3 12 1" fill="none" stroke="#5b7c36" stroke-width="1.6" stroke-linecap="round"/>`
    + `<g fill="url(#${id}c)" stroke="#b5520e" stroke-width=".7"><ellipse cx="23" cy="44" rx="17" ry="24"/><ellipse cx="57" cy="44" rx="17" ry="24"/><ellipse cx="40" cy="44" rx="19" ry="26"/></g>`
    + `<path d="M33 22c-3 8-3 36 0 46M47 22c3 8 3 36 0 46" fill="none" stroke="#c4600f" stroke-width=".8" opacity=".6"/>`
    + `<ellipse cx="31" cy="32" rx="4" ry="7" fill="#fff" opacity=".14"/>`
    + (cara ? `<g class="tph-cara"><path d="M24 38l9 6-11 3z" fill="#ffd27a"/><path d="M56 38l-9 6 11 3z" fill="#ffd27a"/>`
      + `<path d="M22 52l6 3 4-3 4 4 4-4 4 4 4-4 4 3 6-3c-3 9-11 13-18 13s-15-4-18-13z" fill="#ffc35a"/></g>` : "")
    + `</svg>`;
}

function cordelHalloween(): string {
  const c = cuerda(1400, 100, 7, 3);
  let piezas = "";
  for (let k = 0; k < 14; k++) {
    const p = c.en(50 + k * 100);
    const cuerpo = k % 2 === 0
      ? `<path d="M0 0v8" stroke="#3b2f2a" stroke-width=".9"/><use href="#tph-mini" y="8"/>`
      : `<path d="M0 0v10" stroke="#3b2f2a" stroke-width=".9"/><use href="#tph-bat" y="10"/>`;
    piezas += colgada(p.x, p.y, -(k % 5) * .7, cuerpo);
  }
  const defs = `<radialGradient id="tph-m" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffb867"/><stop offset=".6" stop-color="#ec7a22"/><stop offset="1" stop-color="#a8460b"/></radialGradient>`
    + `<g id="tph-mini"><path d="M-1 0c0-3 1-4 3-5" fill="none" stroke="#4c6b2f" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="-4.5" cy="9" rx="5.5" ry="7.5" fill="url(#tph-m)"/><ellipse cx="4.5" cy="9" rx="5.5" ry="7.5" fill="url(#tph-m)"/><ellipse cx="0" cy="9" rx="6" ry="8" fill="url(#tph-m)" stroke="#b5520e" stroke-width=".5"/><ellipse cx="-2.5" cy="6" rx="1.2" ry="2.2" fill="#fff" opacity=".22"/></g>`
    + `<g id="tph-bat"><path d="${MURCIELAGO}" fill="#1a1220" transform="scale(.42) translate(-30 -2)"/></g>`;
  return guirnalda(defs, `<path d="${c.d}" fill="none" stroke="#3b2f2a" stroke-width="1.2"/>${piezas}`);
}

const HALLOWEEN: Temporada = {
  clave: "halloween", nombre: "Halloween", cuando: "Octubre", emoji: "🎃",
  fondo: "#1c0f2b", texto: "#f6a53b",
  anuncio: `${icono('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>')}Halloween en Euchel`,
  css: `
:root{--tp-hueco:34px;--tp-brillo:rgba(246,165,59,.22)}
.anuncio{background:linear-gradient(90deg,#150a20,#2b1542 50%,#150a20);color:#f6a53b}
.menu a[aria-current="page"]{background:#2b1542;border-color:#2b1542}
.tp-tela{position:absolute;top:0;left:0;width:160px;height:160px;color:#3a3240;opacity:.38}
.tp-tela--der{left:auto;right:0;transform:scaleX(-1)}
.tph-rocio{animation:tph-rocio 3.6s ease-in-out infinite}
@keyframes tph-rocio{0%,100%{opacity:.25}50%{opacity:.95}}
.tp-colgante{position:absolute;right:9%;top:100%;width:64px;height:230px;overflow:hidden;pointer-events:none}
.tp-arana{position:absolute;left:18px;top:0;width:28px;height:230px;animation:tp-arana-baja 16s ease-in-out infinite}
.tp-arana__mece{transform-origin:50% 0;animation:tp-arana-mece 3.4s ease-in-out infinite alternate}
.tp-arana__hilo{width:1px;height:168px;margin:0 auto;background:linear-gradient(#2a2230,rgba(42,34,48,.5))}
.tp-arana svg{margin:-2px auto 0}
@keyframes tp-arana-baja{0%{transform:translateY(-210px)}22%{transform:translateY(0)}58%{transform:translateY(0)}66%{transform:translateY(-26px)}74%{transform:translateY(-8px)}100%{transform:translateY(-210px)}}
@keyframes tp-arana-mece{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
.tp-murcielago{position:absolute;top:var(--y);left:-10vw;width:var(--s);opacity:var(--o,1);animation:tp-vuela var(--t) linear var(--d) infinite}
.tp-murcielago svg{animation:tp-aleteo .44s ease-in-out infinite alternate;transform-origin:50% 40%}
@keyframes tp-vuela{0%{transform:translate3d(0,0,0)}25%{transform:translate3d(30vw,-4vh,0)}50%{transform:translate3d(60vw,2vh,0)}75%{transform:translate3d(90vw,-3vh,0)}100%{transform:translate3d(122vw,1vh,0)}}
@keyframes tp-aleteo{from{transform:scaleY(1)}to{transform:scaleY(.42)}}
.tp-calabaza{position:absolute;left:10px;bottom:8px;width:72px;filter:drop-shadow(0 6px 10px rgba(20,8,30,.28))}
.tp-calabaza--chica{left:68px;bottom:6px;width:44px}
.tph-halo{animation:tph-vela 3.2s ease-in-out infinite}
.tph-cara{animation:tph-vela 2.8s ease-in-out infinite}
@keyframes tph-vela{0%,100%{opacity:.7}18%{opacity:1}42%{opacity:.62}60%{opacity:.95}82%{opacity:.78}}
.tp-niebla{position:absolute;left:-20%;right:-20%;bottom:-3vh;height:17vh;opacity:.9;background:radial-gradient(38% 60% at 22% 72%,rgba(176,154,206,.26),transparent 72%),radial-gradient(32% 55% at 68% 82%,rgba(176,154,206,.2),transparent 72%),radial-gradient(26% 50% at 92% 70%,rgba(176,154,206,.18),transparent 72%);animation:tp-niebla 26s ease-in-out infinite alternate}
@keyframes tp-niebla{from{transform:translateX(-5%)}to{transform:translateX(5%)}}
.tph-chispa>b{border-radius:50%;background:radial-gradient(circle,#fff3c8 0 18%,currentColor 34%,transparent 70%)}
@media (max-width:899px){.tp-tela{width:104px;height:104px;opacity:.34}.tp-tela--der{display:none}.tp-calabaza{width:54px;left:6px;bottom:6px}.tp-calabaza--chica{display:none}.tp-colgante{right:16px}}
`,
  guirnalda: cordelHalloween()
    + `<div class="tp-colgante" aria-hidden="true"><div class="tp-arana tp-mov"><div class="tp-arana__mece"><div class="tp-arana__hilo"></div>${ARANA}</div></div></div>`,
  capa: `<div class="tp-niebla tp-mov"></div><div class="tp-tela">${telarana()}</div><div class="tp-tela tp-tela--der">${telarana()}</div>`
    + [[9, 36, 19, 0, 1, ""], [15, 22, 27, -8, .55, ""], [6, 28, 23, -15, .8, ""], [21, 16, 33, -4, .4, " tp-pc"], [12, 30, 21, -11, .9, " tp-pc"]]
      .map(([y, s, t, d, o, pc]) => `<div class="tp-murcielago tp-mov${pc}" style="--y:${y}vh;--s:${s}px;--t:${t}s;--d:${d}s;--o:${o}"><svg viewBox="0 0 60 30" aria-hidden="true"><path d="${MURCIELAGO}" fill="${Number(o) < .7 ? "#3d2e4c" : "#120c18"}"/></svg></div>`).join("")
    + particulas(8, "tp-sube tph-chispa", 41, { colores: ["#ffb347", "#ffd27a", "#f6a53b"], tam: [4, 7], dur: [14, 22], deriva: 60, vaiven: [8, 18], ritmo: [3, 5], opacidad: [.5, .9], soloPc: 3 })
    + `<div class="tp-calabaza">${calabaza("tph-1")}</div><div class="tp-calabaza tp-calabaza--chica">${calabaza("tph-2", false)}</div>`,
};

/* ================================================================== Navidad */

function luces(): string {
  const c = cuerda(1400, 100, 12, 4);
  const colores: [string, string, string][] = [
    ["#ffd1d1", "#e63946", "#8f1520"], ["#fff3c4", "#f4c542", "#a8790e"], ["#c9fff3", "#2a9d8f", "#145c53"],
    ["#ffd0e0", "#d3255c", "#7d0f33"], ["#d6e8ff", "#4f8fd1", "#20507f"],
  ];
  const defs = colores.map(([a, b, cc], i) =>
    `<radialGradient id="tpn-b${i}" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${cc}"/></radialGradient>`
    + `<radialGradient id="tpn-h${i}"><stop offset="0" stop-color="${b}" stop-opacity=".55"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient>`).join("")
    + `<path id="tpn-bombilla" d="M0 7c-4.6 2-6.6 6.6-5.6 11.4C-4.6 22.4-2.4 26 0 26s4.6-3.6 5.6-7.6C6.6 13.6 4.6 9 0 7z"/>`;
  let bombillas = "";
  for (let k = 0; k < 14; k++) {
    const p = c.en(50 + k * 100);
    const i = k % colores.length;
    bombillas += colgada(p.x, p.y, -(k % 4) * .8,
      `<circle class="tpn-halo" style="animation-delay:${f1(-(k % 5) * .55)}s" cy="17" r="15" fill="url(#tpn-h${i})"/>`
      + `<rect x="-3.2" y="0" width="6.4" height="7.5" rx="1.4" fill="#1d4434"/><rect x="-3.2" y="2.4" width="6.4" height="1" fill="#2f6650"/>`
      + `<use href="#tpn-bombilla" fill="url(#tpn-b${i})"/><ellipse cx="-2.2" cy="14" rx="1.2" ry="3.4" fill="#fff" opacity=".55"/>`, "tp-pendulo tpn-luz");
  }
  const c2 = cuerda(1400, 100, 12, 5.5);
  return guirnalda(defs, `<path d="${c.d}" fill="none" stroke="#163a2b" stroke-width="1.5"/><path d="${c2.d}" fill="none" stroke="#2b5a45" stroke-width="1" stroke-dasharray="5 4"/>${bombillas}`);
}

function cristal(): string {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const x = (r: number, da = 0) => f1(r * Math.cos(a + da));
    const y = (r: number, da = 0) => f1(r * Math.sin(a + da));
    d += `M0 0L${x(11)} ${y(11)}M${x(5.5)} ${y(5.5)}L${x(8.2, .38)} ${y(8.2, .38)}M${x(5.5)} ${y(5.5)}L${x(8.2, -.38)} ${y(8.2, -.38)}`
      + `M${x(8.4)} ${y(8.4)}L${x(10.2, .22)} ${y(10.2, .22)}M${x(8.4)} ${y(8.4)}L${x(10.2, -.22)} ${y(10.2, -.22)}`;
  }
  return `<svg viewBox="-12 -12 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round"/><circle r="1.6" fill="currentColor"/></svg>`;
}

const NAVIDAD: Temporada = {
  clave: "navidad", nombre: "Navidad", cuando: "Diciembre", emoji: "🎄",
  fondo: "#0f3b2e", texto: "#f5e6c8",
  anuncio: `${icono('<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5"/>')}Navidad en Euchel`,
  css: `
:root{--tp-hueco:36px;--tp-brillo:rgba(245,230,200,.22)}
.anuncio{background:linear-gradient(90deg,#0b2d23,#14503d 50%,#0b2d23);color:#f5e6c8}
.menu a[aria-current="page"]{background:#14503d;border-color:#14503d}
.tpn-halo{animation:tpn-parpadeo 2.6s ease-in-out infinite}
@keyframes tpn-parpadeo{0%,100%{opacity:1}50%{opacity:.2}}
.tpn-luz{--p:4.2s}
.tpn-copo>b{border-radius:50%;background:radial-gradient(circle at 42% 38%,#fff 0 16%,#dbe8f3 36%,rgba(160,188,210,.6) 58%,rgba(160,188,210,0) 72%)}
.tpn-lejos>b{background:radial-gradient(circle,rgba(190,212,230,.9) 0 30%,rgba(190,212,230,0) 70%)}
.tpn-cristal{color:#9db8ce}
`,
  guirnalda: luces(),
  capa: particulas(18, "tp-cae tpn-copo tpn-lejos", 6, { colores: ["#fff"], tam: [3, 5], dur: [20, 30], deriva: 30, vaiven: [5, 12], ritmo: [3, 5], opacidad: [.45, .75], soloPc: 8 })
    + particulas(12, "tp-cae tpn-copo", 7, { colores: ["#fff"], tam: [6, 10], dur: [12, 18], deriva: 50, vaiven: [10, 22], ritmo: [2.6, 4], opacidad: [.75, .95], soloPc: 4 })
    + particulas(6, "tp-cae tpn-cristal", 8, { colores: ["#9db8ce", "#b6cadb"], tam: [16, 24], dur: [11, 16], deriva: 60, vaiven: [14, 26], ritmo: [3, 5], giro: 160, opacidad: [.6, .9], contenido: cristal(), soloPc: 2 }),
};

/* ================================================================ Año Nuevo */

function estrellas(): string {
  const c = cuerda(1400, 140, 10, 4);
  const defs = `<linearGradient id="tpa-o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2bf"/><stop offset=".45" stop-color="#e6c15c"/><stop offset="1" stop-color="#a87b23"/></linearGradient>`
    + `<path id="tpa-e" d="${estrella(7, 3)}"/><path id="tpa-c" d="${estrella(5, .9, 4)}"/>`;
  let piezas = "";
  for (let k = 0; k < 20; k++) {
    const p = c.en(35 + k * 70);
    const grande = k % 2 === 0;
    if (k % 3 === 1) {
      const col = ["#e6c15c", "#e8a3b4", "#c8ced6"][k % 3 === 1 ? (k % 9 === 1 ? 0 : k % 9 === 4 ? 1 : 2) : 0];
      piezas += colgada(p.x, p.y, -(k % 4) * .6,
        `<path d="M0 0c6 5-6 10 0 15s-6 10 0 15s-6 10 0 13" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>`);
      continue;
    }
    piezas += colgada(p.x, p.y, -(k % 5) * .5,
      `<path d="M0 0v${grande ? 9 : 7}" stroke="#b08d3c" stroke-width=".9"/>`
      + `<use href="#tpa-e" fill="url(#tpa-o)" transform="translate(0 ${grande ? 16 : 12}) scale(${grande ? 1 : .72})"/>`
      + (k % 4 === 0 ? `<use class="tpa-destello" style="animation-delay:${f1(-k * .35)}s" href="#tpa-c" fill="#fff" transform="translate(5 ${grande ? 10 : 7})"/>` : ""));
  }
  return guirnalda(defs, `<path d="${c.d}" fill="none" stroke="#b08d3c" stroke-width="1.2"/>${piezas}`);
}

function fuego(): string {
  let rayos = "", puntas = "", dentro = "";
  for (let i = 0; i < 18; i++) {
    const a = (Math.PI * 2 * i) / 18;
    const b = a + Math.PI / 18;
    rayos += `M${f1(12 * Math.cos(a))} ${f1(12 * Math.sin(a))}L${f1(40 * Math.cos(a))} ${f1(40 * Math.sin(a))}`;
    puntas += `<circle cx="${f1(45 * Math.cos(a))}" cy="${f1(45 * Math.sin(a))}" r="1.8"/>`;
    if (i % 2 === 0) dentro += `M${f1(6 * Math.cos(b))} ${f1(6 * Math.sin(b))}L${f1(24 * Math.cos(b))} ${f1(24 * Math.sin(b))}`;
  }
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><circle r="9" fill="currentColor" opacity=".25"/>`
    + `<path d="${rayos}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`
    + `<path d="${dentro}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1" stroke-linecap="round"/>`
    + `<g fill="currentColor">${puntas}</g></svg>`;
}

/** El año que entra: desde julio ya es el siguiente. */
function anoQueEntra(): number {
  const hoy = new Date();
  return hoy.getMonth() >= 6 ? hoy.getFullYear() + 1 : hoy.getFullYear();
}

const ANO_NUEVO: Temporada = {
  clave: "anonuevo", nombre: "Año Nuevo", cuando: "Fin de diciembre", emoji: "✨",
  fondo: "#0a0a0a", texto: "#e6c15c",
  anuncio: `${icono(`<path d="${estrella(10, 2.4, 4)}" transform="translate(12 12)"/>`, true)}Feliz ${anoQueEntra()}`,
  css: `
:root{--tp-hueco:30px;--tp-brillo:rgba(230,193,92,.3)}
.anuncio{background:linear-gradient(90deg,#050505,#1d1a12 50%,#050505);color:#e6c15c}
.menu a[aria-current="page"]{background:#0a0a0a;border-color:#0a0a0a;color:#e6c15c}
.tpa-destello{transform-box:fill-box;transform-origin:center;animation:tpa-destello 2.6s ease-in-out infinite}
@keyframes tpa-destello{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:1;transform:scale(1)}}
.tp-fuego{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);margin:calc(var(--s) / -2) 0 0 calc(var(--s) / -2);color:var(--c);opacity:0;will-change:transform;animation:tp-estalla 5.6s cubic-bezier(.15,.7,.25,1) var(--d) infinite}
@keyframes tp-estalla{0%{transform:scale(.06) rotate(0);opacity:0}5%{opacity:.95}32%{transform:scale(1) rotate(8deg);opacity:.75}56%{transform:scale(1.07) rotate(10deg) translateY(14px);opacity:0}100%{transform:scale(1.07) rotate(10deg) translateY(14px);opacity:0}}
.tpa-confeti>b{height:52%;border-radius:1px;background:linear-gradient(120deg,currentColor 0 42%,rgba(255,255,255,.9) 50%,currentColor 58%)}
.tpa-lejos{filter:saturate(.7)}
@media (max-width:640px){.tp-fuego{width:calc(var(--s) * .7);height:calc(var(--s) * .7)}}
`,
  guirnalda: estrellas(),
  capa: [[14, 34, 150, "#e6c15c", 0, ""], [78, 28, 124, "#e8a3b4", 1.6, ""], [46, 48, 100, "#c8ced6", 3.1, ""], [88, 60, 134, "#f3dc95", 4.2, " tp-pc"], [24, 64, 112, "#e6c15c", 2.4, " tp-pc"]]
    .map(([x, y, s, c, d, pc]) => `<div class="tp-fuego tp-mov${pc}" style="--x:${x}%;--y:${y}vh;--s:${s}px;--c:${c};--d:${d}s">${fuego()}</div>`).join("")
    + particulas(12, "tp-cae tpa-confeti tpa-lejos", 10, { colores: ["#e6c15c", "#c8ced6", "#e8a3b4"], tam: [4, 6], dur: [14, 20], deriva: 50, vaiven: [6, 14], ritmo: [1.6, 2.6], giro: 200, opacidad: [.45, .7], soloPc: 6 })
    + particulas(14, "tp-cae tpa-confeti", 11, { colores: ["#e6c15c", "#1a1a1a", "#d3255c", "#c8ced6", "#f3dc95"], tam: [7, 11], dur: [9, 14], deriva: 80, vaiven: [10, 22], ritmo: [1.2, 2], giro: 260, opacidad: [.8, 1], soloPc: 5 }),
};

/* ============================================================= San Valentín */

const CORAZON = "M0 4.2C-1.6 1.6-6.4.4-6.4-3.4c0-2.6 1.9-4 3.8-4 1.2 0 2.1.6 2.6 1.4.5-.8 1.4-1.4 2.6-1.4 1.9 0 3.8 1.4 3.8 4C6.4.4 1.6 1.6 0 4.2z";
const CORAZON_SVG = `<svg viewBox="-7 -8 14 13" aria-hidden="true"><path d="${CORAZON}" fill="currentColor"/><ellipse cx="-3" cy="-4.4" rx="1.6" ry="1" fill="#fff" opacity=".5" transform="rotate(-30 -3 -4.4)"/></svg>`;

function corazones(): string {
  const c = cuerda(1400, 175, 9, 4);
  const tonos: [string, string, string][] = [["#ff8fb1", "#d3255c", "#94103f"], ["#ffc4d6", "#f08aa8", "#c94d77"], ["#fff0f5", "#f7c2d2", "#e08aa6"]];
  const defs = tonos.map(([a, b, cc], i) =>
    `<radialGradient id="tpv-c${i}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${cc}"/></radialGradient>`).join("")
    + `<g id="tpv-brillo"><ellipse cx="-3" cy="-4.4" rx="1.6" ry=".9" fill="#fff" opacity=".6" transform="rotate(-30 -3 -4.4)"/></g>`;
  let colgados = "";
  for (let k = 0; k < 20; k++) {
    const p = c.en(35 + k * 70);
    const esc = [1.2, .9, 1.05][k % 3];
    colgados += colgada(p.x, p.y, -(k % 5) * .9,
      `<path d="M0 0v9" stroke="#e7a1b6" stroke-width=".9"/>`
      + `<g transform="translate(0 16) scale(${esc})"><path d="${CORAZON}" fill="url(#tpv-c${k % 3})"/><use href="#tpv-brillo"/></g>`);
  }
  return guirnalda(defs, `<path d="${c.d}" fill="none" stroke="#efa6bc" stroke-width="1.3"/>${colgados}`);
}

const SAN_VALENTIN: Temporada = {
  clave: "sanvalentin", nombre: "San Valentín", cuando: "14 de febrero", emoji: "💗",
  fondo: "#d3255c", texto: "#ffffff",
  anuncio: `${icono(`<path d="${CORAZON}" transform="translate(12 13) scale(1.5)"/>`, true)}San Valentín en Euchel`,
  css: `
:root{--tp-hueco:30px;--tp-brillo:rgba(255,255,255,.28)}
.anuncio{background:linear-gradient(90deg,#b81a4d,#e0336b 50%,#b81a4d);color:#fff}
.menu a[aria-current="page"]{background:#d3255c;border-color:#d3255c}
`,
  guirnalda: corazones(),
  capa: particulas(10, "tp-sube", 3, { colores: ["#f7c2d2", "#f4b3c8"], tam: [8, 12], dur: [16, 24], deriva: 50, vaiven: [8, 16], ritmo: [3, 4.5], opacidad: [.45, .7], contenido: CORAZON_SVG, soloPc: 4 })
    + particulas(12, "tp-sube", 5, { colores: ["#d3255c", "#ef7fa0", "#e85d88", "#f4a9bf"], tam: [14, 26], dur: [10, 16], deriva: 70, vaiven: [12, 26], ritmo: [2.4, 3.6], giro: 40, opacidad: [.7, .95], contenido: CORAZON_SVG, soloPc: 4 }),
};

/* ========================================================== Día de la Madre */

function flor(cx: number, cy: number, r: number, id: string): string {
  let petalos = "";
  for (let i = 0; i < 5; i++) {
    const a = -90 + 72 * i;
    petalos += `<ellipse cx="0" cy="${f1(-r * .95)}" rx="${f1(r * .7)}" ry="${f1(r * 1.02)}" transform="rotate(${a + 90})"/>`;
  }
  return `<g transform="translate(${f1(cx)} ${f1(cy)})"><g class="tp-flor"><g fill="url(#${id})" stroke="#e4869f" stroke-width=".5">${petalos}</g>`
    + `<circle r="${f1(r * .5)}" fill="#f4c542"/><circle r="${f1(r * .5)}" fill="none" stroke="#d99f2b" stroke-width=".6" stroke-dasharray="1 1.2"/></g></g>`;
}

const HOJA = "M0 0c3-4 9-5 14-2-3 5-9 6-14 2z";

function enredadera(): string {
  const c = cuerda(1400, 200, 8, 3);
  const defs = `<radialGradient id="tpm-p"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#f9c9d6"/><stop offset="1" stop-color="#ee98b0"/></radialGradient>`
    + `<radialGradient id="tpm-q"><stop offset="0" stop-color="#fff6f8"/><stop offset=".6" stop-color="#f6b6c8"/><stop offset="1" stop-color="#e3809d"/></radialGradient>`
    + `<linearGradient id="tpm-h" x1="0" x2="1"><stop offset="0" stop-color="#6f9457"/><stop offset="1" stop-color="#a9c98f"/></linearGradient>`
    + `<g id="tpm-hoja"><path d="${HOJA}" fill="url(#tpm-h)"/><path d="M1 0c4-1 8-1 12-1.6" fill="none" stroke="#5d7f47" stroke-width=".5"/></g>`;
  let cosas = "";
  for (let k = 0; k < 40; k++) {
    const p = c.en(20 + k * 35);
    if (k % 4 === 1) {
      cosas += flor(p.x, p.y + 11, k % 8 === 1 ? 5 : 4, k % 8 === 1 ? "tpm-p" : "tpm-q");
    } else if (k % 8 === 3) {
      cosas += `<path d="M${p.x} ${f1(p.y)}c3 4 0 8 3 10s4-2 1-3" fill="none" stroke="#7fa562" stroke-width=".9" stroke-linecap="round"/>`;
    } else {
      const lado = k % 2 ? 1 : -1;
      cosas += `<use href="#tpm-hoja" transform="translate(${p.x} ${f1(p.y + 1)}) rotate(${lado > 0 ? 35 : 145}) scale(.85)"/>`;
    }
  }
  return guirnalda(defs, `<path d="${c.d}" fill="none" stroke="#7fa562" stroke-width="1.7"/>${cosas}`);
}

const RAMO = `<svg viewBox="0 0 130 130" aria-hidden="true"><defs><radialGradient id="tpm-r"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#f9c9d6"/><stop offset="1" stop-color="#e98ba5"/></radialGradient><linearGradient id="tpm-g" x1="0" x2="1"><stop offset="0" stop-color="#6f9457"/><stop offset="1" stop-color="#a9c98f"/></linearGradient></defs>`
  + `<g fill="none" stroke="#7fa562" stroke-width="1.7" stroke-linecap="round"><path d="M10 122C22 90 36 66 64 44M10 122c10-42 28-66 58-88M10 122C32 100 54 90 82 84M10 122c18-26 38-40 64-50"/></g>`
  + `<g fill="url(#tpm-g)"><path d="${HOJA}" transform="translate(28 92) rotate(-55) scale(1.2)"/><path d="${HOJA}" transform="translate(44 74) rotate(-35) scale(1.2)"/><path d="${HOJA}" transform="translate(36 108) rotate(-20) scale(1.1)"/><path d="${HOJA}" transform="translate(58 94) rotate(-10) scale(1.1)"/></g>`
  + `${flor(66, 42, 8, "tpm-r")}${flor(84, 82, 7, "tpm-r")}${flor(50, 24, 6, "tpm-r")}${flor(76, 64, 5, "tpm-r")}`
  + `<path d="M8 116c-6-2-10 2-8 6 4 1 7-2 8-6zM8 116c4-6 10-6 12-2-2 4-8 5-12 2z" fill="#e98ba5"/><path d="M8 116l-5 12M8 116l7 11" stroke="#e98ba5" stroke-width="2" stroke-linecap="round"/></svg>`;

const DIA_MADRE: Temporada = {
  clave: "madre", nombre: "Día de la Madre", cuando: "Segundo domingo de mayo", emoji: "🌸",
  fondo: "#f7d9e3", texto: "#8c1638",
  anuncio: `${icono('<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5C10 6 10 3.5 12 2c2 1.5 2 4 0 7.5zM14.4 11.2c3.6-1.6 6-1.2 7.2.9-1.4 1.9-3.9 2.3-7.2.9zM9.6 11.2C6 9.6 3.6 10 2.4 12.1c1.4 1.9 3.9 2.3 7.2.9zM13.4 14.2c1.6 3.4 1.6 5.9-.4 7.4-2-1.5-2-4 .4-7.4zM10.6 14.2c-2.4 3.4-2.4 5.9-.4 7.4 2-1.5 2-4 .4-7.4z"/>')}Feliz Día, Mamá`,
  css: `
:root{--tp-hueco:28px;--tp-brillo:rgba(255,255,255,.55)}
.anuncio{background:linear-gradient(90deg,#f4cfdc,#fae6ee 50%,#f4cfdc);color:#8c1638}
.menu a[aria-current="page"]{background:#8c1638;border-color:#8c1638}
.tp-flor{transform-box:fill-box;transform-origin:center;animation:tp-respira 4.2s ease-in-out infinite alternate}
@keyframes tp-respira{from{transform:scale(1) rotate(0)}to{transform:scale(1.12) rotate(8deg)}}
.tpm-petalo>b{height:64%;border-radius:100% 0 100% 0;background:linear-gradient(135deg,#fff3f6 0,currentColor 70%)}
.tp-ramo{position:absolute;left:0;bottom:0;width:136px;height:136px;transform:translate(-12px,10px)}
@media (max-width:899px){.tp-ramo{width:96px;height:96px}}
`,
  guirnalda: enredadera(),
  capa: particulas(10, "tp-cae tpm-petalo", 2, { colores: ["#f9c9d6", "#fbe1e8"], tam: [7, 10], dur: [16, 24], deriva: 60, vaiven: [8, 16], ritmo: [2.6, 4], giro: 140, opacidad: [.45, .7], soloPc: 5 })
    + particulas(12, "tp-cae tpm-petalo", 3, { colores: ["#f4a7bb", "#e98ba5", "#f7bccb"], tam: [12, 18], dur: [10, 16], deriva: 90, vaiven: [14, 28], ritmo: [2.2, 3.4], giro: 220, opacidad: [.75, .95], soloPc: 4 })
    + `<div class="tp-ramo">${RAMO}</div>`,
};

/* =========================================================== Fiestas Patrias */

function banderines(): string {
  const c = cuerda(1400, 280, 12, 3);
  const defs = `<linearGradient id="tpp-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f03246"/><stop offset=".6" stop-color="#d91023"/><stop offset="1" stop-color="#a70b1a"/></linearGradient>`
    + `<linearGradient id="tpp-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9e4e4"/></linearGradient>`
    + `<g id="tpp-1"><path d="M-15 0H15L0 27z" fill="url(#tpp-r)"/><path d="M-11 2.5H11L0 22z" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".7" stroke-dasharray="2 1.6"/></g>`
    + `<g id="tpp-2"><path d="M-15 0H15L0 27z" fill="url(#tpp-b)" stroke="#e6c8cb" stroke-width=".6"/><path d="M-11 2.5H11L0 22z" fill="none" stroke="#d91023" stroke-opacity=".45" stroke-width=".7" stroke-dasharray="2 1.6"/></g>`;
  let piezas = "";
  for (let k = 0; k < 36; k++) {
    const x = 20 + k * 39;
    const p = c.en(x);
    piezas += colgada(x, p.y, -(k % 6) * .4, `<use href="#tpp-${k % 2 === 0 ? 1 : 2}"/>`, "tpp-flamea");
  }
  return guirnalda(defs, `<path d="${c.d}" fill="none" stroke="#8a8a8a" stroke-width="1.4"/>${piezas}`);
}

const BANDERA = `<svg viewBox="0 0 18 12" width="18" height="12" aria-hidden="true"><rect x=".5" y=".5" width="17" height="11" fill="#d91023" stroke="#fff"/><rect x="6" y=".5" width="6" height="11" fill="#fff"/></svg>`;

const ESCARAPELA = `<svg viewBox="-40 -40 80 96" aria-hidden="true"><defs><radialGradient id="tpp-e" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f03246"/><stop offset="1" stop-color="#a70b1a"/></radialGradient></defs>`
  + `<path d="M-8 22l-10 32 11-6 6 10 4-36zM8 22l10 32-11-6-6 10-4-36z" fill="url(#tpp-e)"/>`
  + `<g class="tpp-gira"><circle r="31" fill="url(#tpp-e)"/>`
  + `<g stroke="#fff" stroke-opacity=".35" stroke-width="1">${Array.from({ length: 28 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 28;
    return `<line x1="${f1(24 * Math.cos(a))}" y1="${f1(24 * Math.sin(a))}" x2="${f1(30 * Math.cos(a))}" y2="${f1(30 * Math.sin(a))}"/>`;
  }).join("")}</g><circle r="22" fill="#fff"/><circle r="22" fill="none" stroke="#e6c8cb"/><circle r="13" fill="url(#tpp-e)"/><circle cx="-4" cy="-5" r="4" fill="#fff" opacity=".25"/></g></svg>`;

const PATRIAS: Temporada = {
  clave: "patrias", nombre: "Fiestas Patrias", cuando: "28 y 29 de julio", emoji: "🇵🇪",
  fondo: "#d91023", texto: "#ffffff",
  anuncio: `${BANDERA}¡Viva el Perú! Fiestas Patrias`,
  css: `
:root{--tp-hueco:40px;--tp-brillo:rgba(255,255,255,.28)}
.anuncio{background:linear-gradient(90deg,#b80c1d,#e8172c 50%,#b80c1d);color:#fff}
.menu a[aria-current="page"]{background:#d91023;border-color:#d91023}
.tpp-flamea{transform-box:fill-box;transform-origin:50% 0;animation:tpp-flamea 2.8s ease-in-out infinite alternate}
@keyframes tpp-flamea{from{transform:skewX(-5deg) rotate(-2deg)}to{transform:skewX(5deg) rotate(2deg)}}
.tpp-papel>b{height:55%;border-radius:1px;background:linear-gradient(120deg,currentColor 0 42%,rgba(255,255,255,.75) 50%,currentColor 58%)}
.tpp-blanco>b{background:linear-gradient(120deg,#fff 0 42%,#f3d0d4 50%,#fff 58%);box-shadow:0 0 0 .6px rgba(217,16,35,.35)}
.tp-escarapela{position:absolute;left:12px;bottom:6px;width:62px;filter:drop-shadow(0 5px 8px rgba(120,10,20,.22))}
.tpp-gira{transform-box:fill-box;transform-origin:center;animation:tpp-gira 12s ease-in-out infinite alternate}
@keyframes tpp-gira{from{transform:rotate(-10deg)}to{transform:rotate(10deg)}}
@media (max-width:899px){.tp-escarapela{width:46px;left:8px}}
`,
  guirnalda: banderines(),
  capa: particulas(10, "tp-cae tpp-papel", 16, { colores: ["#d91023"], tam: [5, 7], dur: [15, 22], deriva: 50, vaiven: [6, 14], ritmo: [1.6, 2.6], giro: 220, opacidad: [.45, .7], soloPc: 5 })
    + particulas(14, "tp-cae tpp-papel", 17, { colores: ["#d91023", "#d91023", "#b70d1d"], tam: [8, 12], dur: [9, 15], deriva: 70, vaiven: [10, 22], ritmo: [1.2, 2], giro: 280, opacidad: [.8, 1], soloPc: 5 })
    + particulas(8, "tp-cae tpp-papel tpp-blanco", 18, { colores: ["#fff"], tam: [8, 12], dur: [9, 15], deriva: 70, vaiven: [10, 22], ritmo: [1.2, 2], giro: 280, opacidad: [.9, 1], soloPc: 3 })
    + `<div class="tp-escarapela">${ESCARAPELA}</div>`,
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
