/* parts.js — THE PARTS: the thirteen shapes and every environment piece of the COMIC 3D house style · 24 September 2026
 *
 * The builders for kit/parts-spec.js. Every shape applies the shape law by itself: round things take their sides from the
 * facet ladder, soft goods get one chamfer facet, anything under 2 cm across gets no ink hull, materials come by role
 * from the world's palette. Every piece is built at its own origin (base on y = 0, front toward +z, centred on x) from
 * those shapes only, so a piece is on style without anyone checking. The house (kit/interior.js), the parts box
 * (parts.html) and any future project build from here.
 *
 *   const K = makeKit(world, { palette });        // palette: the slots of PALETTE_SLOTS (the house passes HOUSE + DERIVED)
 *   const sofa = PIECE.sofa(K, { w: 2.4, d: 0.95, color: 'red' }, mulberry32(7));
 *   inkAll(sofa, new HullMaterial({ world }));     // ink by role (userData.inkMul, noInk) is already on every mesh
 *
 * Motion hooks stay on userData (kettle.puffs, fan.blades, sprinkler.head, palms.crowns, cardinal.head).
 */
import { THREE, ComicMaterial, latheY, mergeGeometries, canvasTexture, ridgeSilhouette, mulberry32, rng, pick, mix, shade, hash1 } from './comic3d.js';
import { SHAPE_LAW, ROLES, sidesFor } from './parts-spec.js';

const TAU = Math.PI * 2;
const R = ROLES;

/* ───────────────────────── surfaces: line art on canvas, flat colour and ink only (never dots) ───────────────────────── */
function tex(size, draw, seed) { const r = mulberry32(seed); return canvasTexture(size, size, (ctx, w, h) => draw(ctx, w, h, r)); }
export const TEX_PERIOD = { paver: 1.2, oak: 1.8, terrazzo: 0.7, rubber: 2, lawn: 4, mulch: 2, stucco: 2, pond: 8 };
/** makeTextures(pal): the line-art surfaces, drawn from the palette's slots (the house's seeds, so the house is unchanged) */
export function makeTextures(pal) {
  pal = derivePalette(pal); const INK = pal.ink;
  const inkA = a => { const c = INK.replace('#', ''); return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`; };
  const byColor = {};
  const memo = (key, hex, f) => (byColor[key + hex] ||= f(hex));
  return {
    paver: tex(1024, (x, w, h, r) => {                          // terracotta pavers, running bond, 0.15 m courses
      const grout = mix(pal.paver, '#f3dcc0', 0.55), rows = 8, ch = h / rows;
      const tones = [0, -0.06, 0.05, -0.1, 0.02].map((dl, i) => shade(pal.paver, dl, [0, 4, -3, 2, 6][i], [0, 0.02, -0.03, 0.03, -0.02][i]));
      x.fillStyle = grout; x.fillRect(0, 0, w, h);
      for (let row = 0; row < rows; row++) {
        let cx = -rng(r, 0, ch); const y0 = row * ch;
        while (cx < w) { const len = ch * (r() < 0.5 ? 1 : 2); const g = ch * 0.07, j = () => rng(r, -ch * 0.035, ch * 0.035);
          const pts = [[cx + g + j(), y0 + g + j()], [cx + len - g + j(), y0 + g + j()], [cx + len - g + j(), y0 + ch - g + j()], [cx + g + j(), y0 + ch - g + j()]];
          for (const dx of [0, w, -w]) { x.beginPath(); pts.forEach(([px, py], i) => i ? x.lineTo(px + dx, py) : x.moveTo(px + dx, py)); x.closePath(); x.fillStyle = pick(r, tones); x.fill(); x.strokeStyle = inkA(0.28); x.lineWidth = 2; x.stroke(); }
          cx += len; }
      }
    }, 11),
    oak: tex(1024, (x, w, h, r) => {                            // wood-look planks along z, 0.18 m wide, staggered ends
      const cols = 10, cw = w / cols, tones = [0, -0.05, 0.04, -0.09].map((dl, i) => shade(pal.oak, dl, [0, 3, -2, 5][i], 0));
      for (let c = 0; c < cols; c++) { let y = -rng(r, 0, h * 0.6);
        while (y < h) { const len = rng(r, 0.45, 0.8) * h; x.fillStyle = pick(r, tones);
          for (const dy of [0, h]) { x.fillRect(c * cw, y - dy, cw, len); x.strokeStyle = inkA(0.16); x.lineWidth = 1.5;
            for (let k = 0; k < 3; k++) { const gx = c * cw + rng(r, 0.15, 0.85) * cw; x.beginPath(); x.moveTo(gx, y - dy + len * rng(r, 0, 0.2)); x.bezierCurveTo(gx + rng(r, -4, 4), y - dy + len * 0.4, gx + rng(r, -4, 4), y - dy + len * 0.6, gx, y - dy + len * rng(r, 0.8, 1)); x.stroke(); }
            x.strokeStyle = inkA(0.45); x.lineWidth = 2.5; x.beginPath(); x.moveTo(c * cw, y - dy); x.lineTo(c * cw + cw, y - dy); x.stroke(); }
          y += len; }
        x.strokeStyle = inkA(0.45); x.lineWidth = 2.5; x.beginPath(); x.moveTo(c * cw, 0); x.lineTo(c * cw, h); x.stroke(); }
    }, 12),
    terrazzo: tex(512, (x, w, h, r) => {                        // the counters: stock chipped with the process set and a few ink flecks
      x.fillStyle = pal.counter; x.fillRect(0, 0, w, h);
      const fl = [[pal.cyan, 60], [pal.magenta, 55], [pal.yellow, 70], [INK, 40], [pal.stock, 50]];
      for (const [c, n] of fl) { x.fillStyle = c; for (let i = 0; i < n; i++) { const cx = r() * w, cy = r() * h, s = rng(r, 4, 11);
        for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) { x.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + r() * 0.5; x.lineTo(cx + dx + Math.cos(a) * s * rng(r, 0.6, 1.2), cy + dy + Math.sin(a) * s * rng(r, 0.6, 1.2)); } x.fill(); if (c !== INK) { x.strokeStyle = inkA(0.5); x.lineWidth = 1.2; x.stroke(); } } } }
    }, 13),
    rubber: tex(512, (x, w, h) => { x.fillStyle = pal.rubber; x.fillRect(0, 0, w, h); x.strokeStyle = shade(pal.rubber, 0.12, 0, 0); x.lineWidth = 3;
      for (const k of [0, 0.5]) { x.beginPath(); x.moveTo(k * w, 0); x.lineTo(k * w, h); x.moveTo(0, k * h); x.lineTo(w, k * h); x.stroke(); } }, 14),
    lawn: tex(1024, (x, w, h, r) => { x.fillStyle = pal.lawn; x.fillRect(0, 0, w, h);
      for (const [c, n] of [[shade(pal.lawn, -0.13, 6, 0.05), 520], [shade(pal.lawn, 0.1, -4, 0), 260]]) { x.strokeStyle = c; x.lineWidth = 3; x.lineCap = 'round';
        for (let i = 0; i < n; i++) { const cx = r() * w, cy = r() * h, l = rng(r, 8, 16), a = -Math.PI / 2 + rng(r, -0.5, 0.5); x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); x.stroke(); } } }, 15),
    mulch: tex(512, (x, w, h, r) => { x.fillStyle = pal.mulch; x.fillRect(0, 0, w, h);
      for (const c of [shade(pal.mulch, -0.08, 0, 0), shade(pal.mulch, 0.12, 4, 0)]) { x.strokeStyle = c; x.lineWidth = 4; for (let i = 0; i < 260; i++) { const cx = r() * w, cy = r() * h, a = r() * TAU, l = rng(r, 6, 14); x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); x.stroke(); } } }, 16),
    stucco: tex(512, (x, w, h, r) => { x.fillStyle = pal.stucco; x.fillRect(0, 0, w, h); x.strokeStyle = inkA(0.13); x.lineWidth = 2;
      for (let i = 0; i < 70; i++) { const cx = r() * w, cy = r() * h, rr = rng(r, 5, 12), a = r() * TAU; x.beginPath(); x.arc(cx, cy, rr, a, a + rng(r, 0.8, 1.8)); x.stroke(); } }, 17),
    shaker: hex => memo('shaker', hex, hx => tex(256, (x, w, h) => { x.fillStyle = hx; x.fillRect(0, 0, w, h); x.strokeStyle = inkA(0.45); x.lineWidth = 5; x.strokeRect(w * 0.17, h * 0.13, w * 0.66, h * 0.74);
      x.strokeStyle = inkA(0.16); x.lineWidth = 3; x.strokeRect(w * 0.2, h * 0.16, w * 0.6, h * 0.68); }, 18)),
    drawer: hex => memo('drawer', hex, hx => tex(256, (x, w, h) => { x.fillStyle = hx; x.fillRect(0, 0, w, h); x.strokeStyle = inkA(0.45); x.lineWidth = 6; x.strokeRect(w * 0.1, h * 0.2, w * 0.8, h * 0.6); }, 19)),
    doorPanels: hex => memo('door', hex, hx => tex(256, (x, w, h) => { x.fillStyle = hx; x.fillRect(0, 0, w, h); x.strokeStyle = inkA(0.5); x.lineWidth = 4;
      x.beginPath(); x.moveTo(w * 0.18, h * 0.47); x.lineTo(w * 0.18, h * 0.2); x.quadraticCurveTo(w * 0.5, h * 0.07, w * 0.82, h * 0.2); x.lineTo(w * 0.82, h * 0.47); x.closePath(); x.stroke();
      x.strokeRect(w * 0.18, h * 0.55, w * 0.64, h * 0.36); }, 20)),
    coir: tex(256, (x, w, h) => { x.fillStyle = '#c79a5e'; x.fillRect(0, 0, w, h); x.strokeStyle = '#4a3522'; x.lineWidth = 14; x.strokeRect(14, 14, w - 28, h - 28);
      x.lineWidth = 6; for (let i = 0; i < 4; i++) { const cx = w * (0.2 + i * 0.2), cy = h / 2; x.beginPath(); x.moveTo(cx, cy - 34); x.lineTo(cx + 22, cy); x.lineTo(cx, cy + 34); x.lineTo(cx - 22, cy); x.closePath(); x.stroke(); } }, 21),
    rug: tex(512, (x, w, h) => { x.fillStyle = pal.stock; x.fillRect(0, 0, w, h); x.strokeStyle = pal.magenta; x.lineWidth = 12; x.strokeRect(20, 20, w - 40, h - 40); x.strokeStyle = pal.cyan; x.lineWidth = 5; x.strokeRect(46, 46, w - 92, h - 92);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const cx = w * (0.3 + i * 0.2), cy = h * (0.37 + j * 0.26); x.beginPath(); x.moveTo(cx, cy - 40); x.lineTo(cx + 34, cy); x.lineTo(cx, cy + 40); x.lineTo(cx - 34, cy); x.closePath(); x.fillStyle = [pal.cyan, pal.yellow, pal.magenta][(i + j) % 3]; x.fill(); x.strokeStyle = inkA(0.6); x.lineWidth = 4; x.stroke(); } }, 22),
    runner: tex(256, (x, w, h) => { const c = [pal.cyan, pal.stock, pal.magenta, pal.yellow]; for (let i = 0; i < 16; i++) { x.fillStyle = c[i % 4]; x.fillRect(0, i * h / 16, w, h / 16); }
      x.strokeStyle = inkA(0.5); x.lineWidth = 4; for (let i = 1; i < 16; i += 2) { x.beginPath(); for (let k = 0; k <= 8; k++) x.lineTo(k * w / 8, i * h / 16 + (k % 2 ? 6 : -6)); x.stroke(); } }, 23),
  };
}

/* ───────────────────────── materials by role, from the palette's slots ───────────────────────── */
/** makeMats(world, T, pal): one cached ComicMaterial per (role, colour). Never clone() one: they share the world's uniforms. */
export function makeMats(world, T, pal) {
  pal = derivePalette(pal); const cache = {}, missing = new Set();
  const hex = k => { if (pal[k]) return pal[k]; if (typeof k === 'string' && k[0] !== '#' && !missing.has(k)) { missing.add(k); console.warn(`palette: no slot "${k}"; the parts expect every slot in PALETTE_SLOTS`); } return k; };
  const C = (o) => new ComicMaterial(Object.assign({ world }, o));
  const ARCH = Object.assign({ inkWeight: R.architecture.ink }, R.architecture.mat), FURN = Object.assign({ inkWeight: R.furniture.ink }, R.furniture.mat);
  const M = {
    hex,
    /** a wall or ceiling in a palette slot */
    arch(key) { return cache['a:' + key] ||= C(Object.assign({ color: hex(key) }, ARCH, key === 'stucco' ? { map: T.stucco } : {})); },
    /** furniture in a palette slot (or hex); extra material numbers make a variant */
    furn(key, extra) { const k = 'f:' + key + (extra ? JSON.stringify(extra) : ''); return cache[k] ||= C(Object.assign({ color: hex(key) }, FURN, extra || {})); },
    /** wicker in a palette slot: the base hue striped with its own lighter shade */
    wicker(key) { return cache['w:' + key] ||= C(Object.assign({ color: hex(key), color2: shade(hex(key), 0.14, 0, 0), stripe: { mode: 1, freq: 14, dir: [0.7, 0.7, 0] } }, FURN)); },
    shaker(key) { return cache['s:' + key] ||= C(Object.assign({ color: hex(key), map: T.shaker(hex(key)) }, FURN)); },
    drawer(key) { return cache['d:' + key] ||= C(Object.assign({ color: hex(key), map: T.drawer(hex(key)) }, FURN)); },
    doorPanels(key) { return cache['p:' + key] ||= C(Object.assign({ color: hex(key), map: T.doorPanels(hex(key)) }, FURN)); },
    ceiling: C(Object.assign({ color: pal.stock }, ARCH, R.ceiling.mat)),
    oak: C(Object.assign({ color: pal.oak, map: T.oak, inkWeight: R.floor.ink }, R.floor.mat)),
    paver: C(Object.assign({ color: pal.paver, map: T.paver, inkWeight: R.floor.ink }, R.floor.mat)),
    rubber: C({ color: pal.rubber, map: T.rubber, inkWeight: R.floor.ink, hatch: 0, keyMix: 0.12, shadowMul: 0.8 }),
    lawn: C(Object.assign({ color: pal.lawn, map: T.lawn, inkWeight: R.ground.ink }, R.ground.mat)),
    mulch: C({ color: pal.mulch, map: T.mulch, inkWeight: R.ground.ink, hatch: 0.2 }),
    pond: C({ color: pal.pond, bias: 0.1, inkWeight: R.ground.ink, hatch: 0, keyMix: 0.35, spec: 0 }),
    terrazzo: C(Object.assign({ color: pal.counter, map: T.terrazzo }, FURN, { hatch: 0.4 })),
    steel: C(Object.assign({ color: pal.steel, inkWeight: R.metal.ink }, R.metal.mat)),
    blackGlass: C(Object.assign({ color: pal.glass, inkWeight: R.gloss.ink }, R.gloss.mat)),
    cushion: C(Object.assign({ color: pal.stock, inkWeight: R.soft.ink }, R.soft.mat)),
    rubberObj: C(Object.assign({ color: pal.rubber }, FURN, { keyMix: 0.35, hatch: 0 })),
    oakWood: C(Object.assign({ color: shade(pal.oak, -0.06, 0, 0) }, FURN)),
    hedge: C(Object.assign({ color: pal.hedge, inkWeight: R.foliage.ink }, R.foliage.mat)),
    oakLeaf: C(Object.assign({ color: shade(pal.hedge, -0.06, 4, 0), inkWeight: R.foliage.ink }, R.foliage.mat, { fillAmt: 0.35 })),
    palm: C(Object.assign({ color: shade(pal.hedge, 0.08, 6, 0.05), inkWeight: R.foliage.ink }, R.foliage.mat, { hatch: 0.3, fillAmt: 0.35, side: THREE.DoubleSide })),
    bark: C(Object.assign({ color: pal.bark }, FURN)), fence: C(Object.assign({ color: pal.stock }, FURN, { inkWeight: 0.6 })),
    stone: C(Object.assign({ color: mix(pal.steel, pal.oak, 0.25), inkWeight: R.foliage.ink }, FURN, { hatch: 0.5, keyMix: 0.3 })),
    cloud: C({ color: pal.stock, inkWeight: 0.6, hatch: 0, shadowMul: 0.8, keyMix: 0.5 }),
    coir: C(Object.assign({ color: '#c79a5e', map: T.coir }, FURN, { inkWeight: R.clutter.ink })),
    rug: C({ color: pal.stock, map: T.rug, inkWeight: R.clutter.ink, hatch: 0.2 }), runner: C({ color: pal.stock, map: T.runner, inkWeight: R.clutter.ink, hatch: 0.2 }),
    mirror: C({ color: '#cfe2ea', inkWeight: R.furniture.ink, keyMix: 0.5, hatch: 0 }),
    wrong: C(Object.assign({ color: pal.lime, inkWeight: R.wrong.ink }, R.wrong.mat)),
    glare: C({ color: '#ffffff', unlit: true, inkWeight: 0, side: THREE.DoubleSide }),
    glow: C({ color: '#fff0c2', unlit: true, inkWeight: R.light.ink }), steam: C({ color: '#ffffff', inkWeight: 0.6, hatch: 0, keyMix: 0.6, shadowMul: 0.85 }),
    ripple: C({ color: '#eef8fb', unlit: true, inkWeight: 0 }),
    water: C({ color: mix(pal.cyan, pal.stock, 0.4), unlit: true, inkWeight: 0.12 }),
    dash: C({ color: pal.ink, unlit: true, inkWeight: 0 }), steamDash: C({ color: mix(pal.ink, pal.stock, 0.6), unlit: true, inkWeight: 0 }),
  };
  return M;
}

/** derivePalette(palette): the contract's derived slots, filled from the others when a world leaves them out
 *  (the house names every one, so its colours do not move) */
export function derivePalette(p = {}) {
  const pal = Object.assign({}, p);
  pal.counter ||= mix(pal.stock, pal.yellow, 0.22); pal.glass ||= shade(pal.rubber, 0.03, 0, 0); pal.pond ||= pal.cyan;
  pal.bark ||= shade(pal.oak, -0.2, 0, -0.1); pal.mulch ||= shade(pal.oak, -0.28, 0, -0.12); pal.sky ||= mix(pal.cyan, '#ffffff', 0.5);
  return pal;
}
/** makeKit(world, { palette, textures, mats }) → K: the palette, the surfaces and the materials, ready for the builders */
export function makeKit(world, o = {}) {
  const pal = derivePalette(o.palette);
  const T = o.textures || makeTextures(pal);
  const M = o.mats || makeMats(world, T, pal);
  return { world, pal, T, M, hex: k => pal[k] || k };
}

/* ───────────────────────── THE ALPHABET: thirteen shapes that apply the law by themselves ─────────────────────────
 * Common tail arguments: (m, x, y, z, o) with o = { rx, ry, rz, noInk, inkMul, name }. `B` variants put the base at y. */
function tag(k, shapeName, across, o = {}) {
  k.userData.shape = shapeName;
  if (o.rx) k.rotation.x = o.rx; if (o.ry) k.rotation.y = o.ry; if (o.rz) k.rotation.z = o.rz;
  if (o.noInk || (across != null && across < SHAPE_LAW.floor)) k.userData.noInk = true;   // the thickness floor
  if (o.inkMul) k.userData.inkMul = o.inkMul; if (o.name) k.name = o.name;
  return k;
}
function at(g, m, x = 0, y = 0, z = 0) { const k = new THREE.Mesh(g, m); k.position.set(x, y, z); return k; }
/** the facet ladder, as used by every round shape (o.sides overrides it only for things that are not round: a pyramid) */
export const sides = (r, o = {}) => o.sides || sidesFor(r);

const across = (w, h, d) => [w, h, d].sort((a, b) => a - b)[1];   // the floor looks at a thing's two thin directions: a cord is thin twice, a rug once
/** SLAB: a box with sharp edges, centred. slabB: base at y. */
export function slab(w, h, d, m, x, y, z, o) { return tag(at(new THREE.BoxGeometry(w, h, d), m, x, y, z), 'SLAB', across(w, h, d), o); }
export function slabB(w, h, d, m, x = 0, y = 0, z = 0, o) { return slab(w, h, d, m, x, y + h / 2, z, o); }

/** CUSHION: a box with one chamfer facet (12 % of the smallest side, ≤ 6 cm), per-face normals, centred. cushionB: base at y. */
export function cushionGeometry(w, h, d, c = Math.min(SHAPE_LAW.chamfer.max, SHAPE_LAW.chamfer.of * Math.min(w, h, d))) {
  const X = w / 2, Y = h / 2, Z = d / 2, P = {};
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { const k = `${sx}${sy}${sz}`;
    P['x' + k] = [sx * X, sy * (Y - c), sz * (Z - c)]; P['y' + k] = [sx * (X - c), sy * Y, sz * (Z - c)]; P['z' + k] = [sx * (X - c), sy * (Y - c), sz * Z]; }
  const faces = [], s = [-1, 1], key = (a, b, c2) => `${a}${b}${c2}`;
  for (const sx of s) faces.push([P['x' + key(sx, -1, -1)], P['x' + key(sx, 1, -1)], P['x' + key(sx, 1, 1)], P['x' + key(sx, -1, 1)]]);
  for (const sy of s) faces.push([P['y' + key(-1, sy, -1)], P['y' + key(1, sy, -1)], P['y' + key(1, sy, 1)], P['y' + key(-1, sy, 1)]]);
  for (const sz of s) faces.push([P['z' + key(-1, -1, sz)], P['z' + key(1, -1, sz)], P['z' + key(1, 1, sz)], P['z' + key(-1, 1, sz)]]);
  for (const sx of s) for (const sy of s) faces.push([P['x' + key(sx, sy, -1)], P['x' + key(sx, sy, 1)], P['y' + key(sx, sy, 1)], P['y' + key(sx, sy, -1)]]);
  for (const sy of s) for (const sz of s) faces.push([P['y' + key(-1, sy, sz)], P['y' + key(1, sy, sz)], P['z' + key(1, sy, sz)], P['z' + key(-1, sy, sz)]]);
  for (const sx of s) for (const sz of s) faces.push([P['x' + key(sx, -1, sz)], P['x' + key(sx, 1, sz)], P['z' + key(sx, 1, sz)], P['z' + key(sx, -1, sz)]]);
  for (const sx of s) for (const sy of s) for (const sz of s) faces.push([P['x' + key(sx, sy, sz)], P['y' + key(sx, sy, sz)], P['z' + key(sx, sy, sz)]]);
  const pos = [], uv = [];
  for (let f of faces) {                                     // wind every face outward (the shape is convex and centred)
    const a = f[0], b = f[1], c2 = f[2]; const n = [(b[1] - a[1]) * (c2[2] - a[2]) - (b[2] - a[2]) * (c2[1] - a[1]), (b[2] - a[2]) * (c2[0] - a[0]) - (b[0] - a[0]) * (c2[2] - a[2]), (b[0] - a[0]) * (c2[1] - a[1]) - (b[1] - a[1]) * (c2[0] - a[0])];
    const cen = f.reduce((q, p) => [q[0] + p[0] / f.length, q[1] + p[1] / f.length, q[2] + p[2] / f.length], [0, 0, 0]);
    if (n[0] * cen[0] + n[1] * cen[1] + n[2] * cen[2] < 0) f = f.slice().reverse();
    const ax = Math.abs(n[0]) > Math.abs(n[1]) && Math.abs(n[0]) > Math.abs(n[2]) ? 0 : Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2;
    const uvOf = p => ax === 0 ? [(p[2] + Z) / d, (p[1] + Y) / h] : ax === 1 ? [(p[0] + X) / w, (p[2] + Z) / d] : [(p[0] + X) / w, (p[1] + Y) / h];
    for (let i = 1; i < f.length - 1; i++) for (const p of [f[0], f[i], f[i + 1]]) { pos.push(...p); uv.push(...uvOf(p)); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  return g;
}
export function cushion(w, h, d, m, x, y, z, o) { return tag(at(cushionGeometry(w, h, d), m, x, y, z), 'CUSHION', across(w, h, d), o); }
export function cushionB(w, h, d, m, x = 0, y = 0, z = 0, o) { return cushion(w, h, d, m, x, y + h / 2, z, o); }

/** ROD: a prism along y, base at y, sides from the ladder (o.square = 4 sides, turned 45°). */
export function rod(r, len, m, x = 0, y = 0, z = 0, o = {}) { const n = o.square ? 4 : sides(r, o);
  const g = new THREE.CylinderGeometry(r, r, len, n); if (o.square) g.rotateY(Math.PI / 4); g.translate(0, len / 2, 0);
  return tag(at(g, m, x, y, z), 'ROD', 2 * r, o); }
/** DRUM: a frustum, base at y, sides from the ladder of its larger radius. */
export function drum(r0, r1, h, m, x = 0, y = 0, z = 0, o = {}) { return tag(at(new THREE.CylinderGeometry(r0, r1, h, sides(Math.max(r0, r1), o)).translate(0, h / 2, 0), m, x, y, z), 'DRUM', 2 * Math.max(r0, r1), o); }
/** a centred cone (a DRUM with a point): spouts, beaks, crests; o.sides for a pyramid */
export function cone(r, h, m, x, y, z, o = {}) { return tag(at(new THREE.ConeGeometry(r, h, sides(r, o)), m, x, y, z), 'DRUM', 2 * r, o); }
/** TURNED: a lathe of profile rows [[t, r]…] up to height h, base at y, sides from the widest row. */
export function turned(rows, h, m, x = 0, y = 0, z = 0, o = {}) { const rMax = Math.max(...rows.map(q => q[1]));
  return tag(at(latheY(rows, h, sides(rMax, o), o.pts || 8), m, x, y, z), 'TURNED', 2 * rMax, o); }
/** BENT: a tube along points (world units, relative to the piece), round by the ladder of its radius. */
export function bent(pts, r, m, seg = 12, o = {}) { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, sides(r, o), false);
  return tag(at(g, m), 'BENT', 2 * r, o); }
/** RING: a torus (o.arc for part of one), radial by the ladder of the tube, around by twice the ladder of the ring. */
export function ring(Rr, r, m, x, y, z, o = {}) { return tag(at(new THREE.TorusGeometry(Rr, r, sides(r), o.around || SHAPE_LAW.ringFactor * sidesFor(Rr), o.arc || TAU), m, x, y, z), 'RING', 2 * r, o); }
/** SHELL: an open cone or drum, two-sided (a lamp shade), centred like a cone. */
export function shell(r0, r1, h, m, x, y, z, o = {}) { return tag(at(new THREE.CylinderGeometry(r0, r1, h, sides(Math.max(r0, r1), o), 1, true), m, x, y, z), 'SHELL', null, o); }
/** a hood: part of a sphere, two-sided (the egg chair) */
export function hood(r, m, x, y, z, phi0, phiLen, thetaLen, o = {}) { const n = sides(r, o); return tag(at(new THREE.SphereGeometry(r, n, Math.max(4, n / 2 + 2), phi0, phiLen, 0, thetaLen), m, x, y, z), 'SHELL', null, o); }
/** PUFF: a round lump. A sphere by the ladder (knobs, pillows, birds), or o.ico = 0|1 for an icosahedron (leaves, steam). */
export function puff(r, m, x, y, z, o = {}) { const n = sides(r, o);
  const g = o.ico != null ? new THREE.IcosahedronGeometry(r, o.ico) : new THREE.SphereGeometry(r, n, Math.max(4, Math.round(n / 2) + 2));
  const k = tag(at(g, m, x, y, z), 'PUFF', 2 * r, o); if (o.squash) k.scale.set(...o.squash); return k; }
/** CRUMPLE: an icosahedron jittered by a seed, flat facets (rocks, paper balls). */
export function crumpleGeometry(r, seed) { const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const h = hash1(Math.round(x * 97) * 3.1 + Math.round(y * 97) * 7.7 + Math.round(z * 97) * 13.3 + seed * 17); const k = (0.78 + 0.34 * h) * r; p.setXYZ(i, x * k, y * k, z * k); }
  g.computeVertexNormals(); return g; }
export function crumple(r, m, x, y, z, o = {}) { const k = tag(at(crumpleGeometry(r, o.seed ?? 1), m, x, y, z), 'CRUMPLE', 2 * r, o); if (o.squash) k.scale.set(...o.squash); return k; }
/** CUTOUT: a 2D outline (a THREE.Shape, or [[x, y]…]) extruded `depth` (0 = flat), facing +z. */
export function cutout(outline, depth, m, x = 0, y = 0, z = 0, o = {}) { let s = outline;
  if (Array.isArray(outline)) { s = new THREE.Shape(); s.moveTo(outline[0][0], outline[0][1]); for (const p of outline.slice(1)) s.lineTo(p[0], p[1]); s.closePath(); }
  const g = depth > 0 ? new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: o.curve || 12 }) : new THREE.ShapeGeometry(s, o.curve || 12);
  return tag(at(g, m, x, y, z), 'CUTOUT', depth > 0 ? depth : null, o); }
/** SHEET: a folded card, PAGE ONE's construction: convex panels (3D points) share fold edges; each panel is a closed shell
 *  `t` thick with one normal per face, the cut edge rims every edge that is not a fold. Returns one mesh. */
export function sheet(panels, t, m, o = {}) {
  const key = p => p.map(v => v.toFixed(4)).join(','), ek = (a, b) => { const A = key(a), B = key(b); return A < B ? A + '|' + B : B + '|' + A; };
  const count = new Map(); for (const pn of panels) for (let i = 0; i < pn.length; i++) { const k = ek(pn[i], pn[(i + 1) % pn.length]); count.set(k, (count.get(k) || 0) + 1); }
  const pos = [];
  for (const pn of panels) {
    const a = pn[0], b = pn[1], c = pn[2]; let n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    const l = Math.hypot(...n) || 1; n = n.map(v => v / l);
    const off = s => pn.map(p => [p[0] + n[0] * s * t / 2, p[1] + n[1] * s * t / 2, p[2] + n[2] * s * t / 2]);
    const A = off(1), Bs = off(-1);
    for (let i = 1; i < pn.length - 1; i++) { pos.push(...A[0], ...A[i], ...A[i + 1]); pos.push(...Bs[0], ...Bs[i + 1], ...Bs[i]); }
    for (let i = 0; i < pn.length; i++) { const j = (i + 1) % pn.length; if (count.get(ek(pn[i], pn[j])) !== 1) continue;
      pos.push(...A[i], ...Bs[i], ...Bs[j], ...A[i], ...Bs[j], ...A[j]); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uv = new Float32Array(pos.length / 3 * 2); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals();
  const k = tag(new THREE.Mesh(g, m), 'SHEET', null, o); k.material.side = THREE.DoubleSide; return k;
}
/** GLARE: the comic's glass, two or three white strokes across a pane (w × h), centred, in the pane's plane */
export function glare(M, w, h, n = 2) { const g = new THREE.Group(); g.userData.shape = 'GLARE'; const L = Math.min(w, h) * 0.55;
  for (let i = 0; i < n; i++) { const s = tag(at(new THREE.PlaneGeometry(i ? 0.035 : 0.07, L * (i ? 0.6 : 1)), M.glare, (i - 0.4) * w * 0.22, (i ? -0.1 : 0.05) * h, 0), 'GLARE', null, { rz: -0.62, noInk: true }); g.add(s); }
  return g; }
/** DASH: an ink stroke along +z from its origin (unlit, no hull) */
export function dash(len, w, m, x = 0, y = 0, z = 0, o = {}) { return tag(at(new THREE.BoxGeometry(w, w, len).translate(0, 0, len / 2), m, x, y, z), 'DASH', null, Object.assign({ noInk: true }, o)); }
/** GLOW: an unlit light shape (a drum here; a disc or a box elsewhere), never inked */
export function glowDrum(r0, r1, h, M, x, y, z, o = {}) { const k = drum(r0, r1, h, M.glow, x, y, z, o); k.userData.shape = 'GLOW'; k.userData.noInk = true; return k; }

/* ───────────────────────── helpers built from the alphabet ───────────────────────── */
function doorLeaf(M, w, h, color) { const g = new THREE.Group(); g.add(slabB(w, h, 0.04, M.doorPanels(color || 'stock'), w / 2, 0, 0));
  for (const z of [0.04, -0.04]) g.add(puff(0.03, M.steel, w - 0.08, 0.95, z, { inkMul: 0.5 })); return g; }
function sneakerG(M, mat, x, y, z, ry) { const g = new THREE.Group(); g.add(slabB(0.1, 0.03, 0.27, M.furn('stock'), 0, 0, 0)); g.add(puff(0.07, mat, 0, 0.05, -0.03, { squash: [0.75, 0.7, 1.7] }));
  g.position.set(x, y, z); g.rotation.y = ry; g.traverse(o => { if (o.isMesh) o.userData.inkMul = 0.6; }); return g; }
export function cloudOutline(r) { const W = rng(r, 22, 40), n = 3 + Math.floor(r() * 3), bumps = []; for (let i = 0; i < n; i++) bumps.push({ x: -W / 2 + (i + 0.5) * W / n + rng(r, -2, 2), rad: rng(r, 4, 8) });
  const s = new THREE.Shape(); s.moveTo(-W / 2 - 4, 0); for (let i = 0; i <= 48; i++) { const x = -W / 2 - 4 + (W + 8) * i / 48; let y = 0; for (const b of bumps) { const u = (x - b.x) / b.rad; if (Math.abs(u) < 1) y = Math.max(y, b.rad * Math.sqrt(1 - u * u)); } s.lineTo(x, Math.max(0, y)); } s.closePath();
  return s; }
export function shrubG(M, r, s = 1) { const g = new THREE.Group(); const n = pick(r, [3, 3, 5]);
  for (let i = 0; i < n; i++) { const k = rng(r, 0.34, 0.5) * s; g.add(puff(k, M.hedge, rng(r, -0.35, 0.35) * s, k * 0.8 + rng(r, 0, 0.25) * s, rng(r, -0.2, 0.2) * s, { ico: 1, squash: [1, 0.85, 1] })); } return g; }
function palmG(M, r, h, lean) {
  const g = new THREE.Group(); const segs = 6, pts = []; for (let i = 0; i <= segs; i++) { const t = i / segs; pts.push([lean * t * t * h * 0.25, t * h, 0]); }
  g.add(bent(pts, 0.17, M.bark, 12)); const crown = new THREE.Group(); crown.position.set(...pts[segs]); g.add(crown);
  const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(1.2, 0.35, 2.6, 0.05); leaf.lineTo(2.9, -0.05); leaf.quadraticCurveTo(1.2, -0.3, 0, 0);
  for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + rng(r, -0.15, 0.15); const pivot = new THREE.Group(); pivot.rotation.y = a; const fr = cutout(leaf, 0, M.palm, 0, 0, 0, { rx: -Math.PI / 2 }); fr.rotation.y = rng(r, -0.5, -0.15) - (i % 3) * 0.12; pivot.add(fr); crown.add(pivot); }
  crown.add(puff(0.3, M.bark, 0, 0, 0)); g.userData.crown = crown; return g;
}
function eggChairG(M, color) {                               // round wicker chair in a spot colour: seat bowl, a hood open at the front, a fat stock cushion
  const g = new THREE.Group(), wk = M.wicker(color || 'tangerine');
  const seat = turned([[0, 0.08], [0.3, 0.3], [0.7, 0.4], [1, 0.42]], 0.3, wk, 0, 0.34, 0); seat.material.side = THREE.DoubleSide; g.add(seat);
  const hd = hood(0.46, wk, 0, 0.58, -0.04, Math.PI * 0.72, Math.PI * 1.56, Math.PI * 0.5); hd.scale.set(1, 1.25, 0.95); g.add(hd);
  g.add(drum(0.34, 0.3, 0.12, M.cushion, 0, 0.6, 0.03)); g.add(puff(0.3, M.cushion, 0, 0.9, -0.22, { squash: [1, 0.75, 0.35] }));
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) g.add(bent([[x * 0.5, 0.38, z * 0.5], [x, 0, z]], 0.018, M.rubberObj, 4));
  return g;
}
function screenCageG(M, p) {                                 // white posts and beams, a kick rail, glare strokes on every screened panel of the far side, and the door leaf standing open
  const w = p.w, d = p.d, h = p.h, g = new THREE.Group(), x0 = -w / 2, x1 = w / 2, z0 = -d / 2, P = 0.06, fr = M.furn('stock'), n = 4, pw = w / n;
  const posts = []; for (let i = 0; i <= n; i++) posts.push([x0 + w * i / n, z0]); for (let i = 1; i <= 2; i++) { posts.push([x0, z0 + d * i / 2]); posts.push([x1, z0 + d * i / 2]); }
  for (const [x, z] of posts) g.add(slabB(P, h, P, fr, x, 0, z));
  g.add(slab(w, P, P, fr, 0, h, z0)); g.add(slab(P, P, d, fr, x0, h, 0)); g.add(slab(P, P, d, fr, x1, h, 0));
  for (let i = 1; i < n; i++) g.add(slab(P * 0.8, P * 0.8, d, fr, x0 + w * i / n, h + 0.02, 0));
  for (let i = 0; i < n; i++) { const xm = x0 + pw * (i + 0.5); const isDoor = p.doorAt != null && Math.abs(xm - p.doorAt) < 0.01;
    if (isDoor) { const leaf = new THREE.Group(); leaf.position.set(p.doorAt + p.doorW / 2, 0, z0); leaf.rotation.y = -Math.PI / 2;   // hinged on its right post, swung into the lanai
      leaf.add(slabB(P * 0.7, 2.0, P * 0.7, fr, -p.doorW + P * 0.35, 0, 0)); leaf.add(slab(p.doorW, P * 0.7, P * 0.7, fr, -p.doorW / 2, 2.0, 0)); leaf.add(slab(p.doorW, P * 0.7, P * 0.7, fr, -p.doorW / 2, 0.9, 0)); leaf.add(slab(p.doorW, 0.1, P * 0.5, fr, -p.doorW / 2, 0.05, 0));
      const gl = glare(M, p.doorW - 0.2, 1.0, 2); gl.position.set(-p.doorW / 2, 1.45, 0.02); leaf.add(gl); g.add(leaf); g.add(slab(pw, P * 0.7, P * 0.7, fr, xm, 2.0, z0)); continue; }
    g.add(slab(pw, 0.05, 0.04, fr, xm, 0.9, z0)); const gl = glare(M, pw - 0.2, h - 1.1, 2); gl.position.set(xm, h * 0.62, z0 + 0.01); g.add(gl); }
  for (const z of [z0 + d * 0.25, z0 + d * 0.75]) for (const x of [x0, x1]) { g.add(slab(0.04, 0.05, d / 2, fr, x, 0.9, z)); const gl = glare(M, d / 2 - 0.2, h - 1.1, 2); gl.position.set(x + (x < 0 ? 0.01 : -0.01), h * 0.62, z); gl.rotation.y = Math.PI / 2; g.add(gl); }
  return g;
}

/* ───────────────────────── STRUCTURE: floors, ceilings, walls with openings ───────────────────────── */
/** a floor: a flat plane with a line texture (no hull), f = { mat, x:[a,b], z:[a,b], y, slope } in the scene's frame */
export function floorMesh(K, f) {
  const M = K.M, w = f.x[1] - f.x[0], d = f.z[1] - f.z[0];
  const g = f.mat === 'pond' ? new THREE.CircleGeometry(0.5, 40).scale(w, d, 1) : new THREE.PlaneGeometry(w, d, 1, f.slope ? 8 : 1); g.rotateX(-Math.PI / 2);   // a pond is an ellipse inscribed in its footprint
  const P = TEX_PERIOD[f.mat] || 2, uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / P, uv.getY(i) * d / P);
  if (f.slope) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, f.slope * (d / 2 - p.getZ(i)) / d); g.computeVertexNormals(); }
  const k = at(g, M[f.mat] || M.arch(f.mat), (f.x[0] + f.x[1]) / 2, f.y || 0, (f.z[0] + f.z[1]) / 2); k.userData.noInk = true; k.name = 'floor-' + f.mat; k.userData.shape = 'SLAB';
  return k;
}
/** a ceiling: a 6 cm SLAB, bias +0.75, no hull; c = { mat, x, z, y } */
export function ceilingMesh(K, c) {
  const M = K.M, w = c.x[1] - c.x[0], d = c.z[1] - c.z[0];
  const m = slab(w, 0.06, d, c.mat === 'stucco' ? M.arch('stucco') : M.ceiling, (c.x[0] + c.x[1]) / 2, c.y + 0.03, (c.z[0] + c.z[1]) / 2, { noInk: true, name: 'ceiling' });
  m.userData.ceilY = c.y; return m;
}
/** a wall: wl = { a:[x,z], b:[x,z], n:[x,z], h, mat, openings:[{ at, w, h, sill, kind: door|opening|slider|window, open }] } (the house form),
 *  or { len, h, mat, openings, leaf } for a straight wall facing +z, centred on x (the catalogue form; `leaf` hangs a door in the first opening). */
export function wallGroup(K, wl) {
  const M = K.M;
  if (!wl.a) wl = Object.assign({ a: [-wl.len / 2, 0], b: [wl.len / 2, 0], n: [0, 1] }, wl);
  const [ax, az] = wl.a, [bx, bz] = wl.b, L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, t = 0.12, H = wl.h || 2.7;
  const g = new THREE.Group(); g.name = 'wall-' + (wl.id || 'catalogue'); g.position.set(ax, 0, az); g.rotation.y = Math.atan2(-uz, ux);
  const side = Math.sign(wl.n[0] * -uz + wl.n[1] * ux) || 1;          // which local z side the viewer sees
  const mat = M.arch(wl.mat || 'paper'), trim = M.furn('stock'), pieces = []; const add = (x0, x1, y0, y1) => { if (x1 - x0 > 0.005 && y1 - y0 > 0.005) pieces.push({ geometry: new THREE.BoxGeometry(x1 - x0, y1 - y0, t), matrix: new THREE.Matrix4().makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, 0) }); };
  const ops = (wl.openings || []).slice().sort((p, q) => p.at - q.at); let u = 0;
  for (const o of ops) { const o0 = o.at - o.w / 2, o1 = o.at + o.w / 2; add(u, o0, 0, H); add(o0, o1, o.sill + o.h, H); add(o0, o1, 0, o.sill); u = o1; }
  add(u, L, 0, H);
  const wm = at(mergeGeometries(pieces), mat); wm.name = 'wall'; wm.userData.shape = 'SLAB'; g.add(wm);
  if (wl.mat !== 'stucco') { let v = 0; const bb = []; for (const o of ops) { bb.push([v, o.at - o.w / 2]); v = o.at + o.w / 2; } bb.push([v, L]);   // baseboard on the viewer's side, broken at openings
    for (const [p, q] of bb) if (q - p > 0.05) g.add(slab(q - p, 0.1, 0.02, trim, (p + q) / 2, 0.05, side * (t / 2 + 0.01), { inkMul: 0.6 })); }
  for (const o of ops) {
    const o0 = o.at - o.w / 2, o1 = o.at + o.w / 2, top = o.sill + o.h;
    if (o.kind === 'door' || o.kind === 'opening') {            // casing: three trim boards on the viewer's side
      const s = side; g.add(slab(0.07, top + 0.07, 0.025, trim, o0 - 0.035, (top + 0.07) / 2, s * (t / 2 + 0.012))); g.add(slab(0.07, top + 0.07, 0.025, trim, o1 + 0.035, (top + 0.07) / 2, s * (t / 2 + 0.012))); g.add(slab(o.w + 0.14, 0.07, 0.025, trim, o.at, top + 0.035, s * (t / 2 + 0.012)));
      if (wl.leaf && o === ops[0] && o.kind === 'door') { const lf = doorLeaf(M, o.w, 2.05, wl.leaf.color); lf.position.set(o0, 0, side * 0.02); lf.rotation.y = -side * (wl.leaf.open || 0) * Math.PI / 180; g.add(lf); }
    } else {                                                    // slider or window: a white frame, a mullion, glare on every CLOSED pane; an open pane is a gap
      const fw = 0.06, panes = o.kind === 'slider' ? 2 : 1, fr = M.furn('stock');
      g.add(slab(o.w, fw, t * 0.8, fr, o.at, o.sill + fw / 2, 0)); g.add(slab(o.w, fw, t * 0.8, fr, o.at, top - fw / 2, 0));
      g.add(slab(fw, o.h, t * 0.8, fr, o0 + fw / 2, o.sill + o.h / 2, 0)); g.add(slab(fw, o.h, t * 0.8, fr, o1 - fw / 2, o.sill + o.h / 2, 0));
      for (let k = 1; k < panes; k++) g.add(slab(fw * 0.8, o.h, t * 0.6, fr, o0 + o.w * k / panes, o.sill + o.h / 2, 0));
      if (o.kind === 'window') g.add(slab(o.w + 0.16, 0.04, t + 0.12, trim, o.at, o.sill - 0.02, side * 0.03));   // the sill, proud of the wall
      for (let k = 0; k < panes; k++) { const isOpen = o.open === 'right' ? k === panes - 1 : o.open === 'left' ? k === 0 : false; if (isOpen) continue;
        const gl = glare(M, o.w / panes - 0.1, o.h - 0.1, 3); gl.position.set(o0 + o.w * (k + 0.5) / panes, o.sill + o.h / 2, side * 0.01); g.add(gl);
        if (o.kind === 'slider') g.add(slab(o.w / panes - 0.1, fw * 0.7, t * 0.5, fr, o0 + o.w * (k + 0.5) / panes, o.sill + o.h - 0.4, 0, { inkMul: 0.5 })); }   // the closed pane's own top rail: it reads as a second, slid panel
    }
  }
  g.userData.cut = { a: [ax, az], n: wl.n };
  return g;
}

/* ───────────────────────── EFFECTS: a boost's dashes (a fan's wind, a steam column, a blower's stream) ───────────────────────── */
/** windDashes(K, box, r, id): ink strokes scrolling through the box on twos; box = { kind: push|lift|wind, dir, x, y, z }. tick(f) steps them. */
export function windDashes(K, w, r, id = 'box') {
  const M = K.M, g = new THREE.Group(); g.name = 'wind-' + id; const dir = new THREE.Vector3(...w.dir).normalize();
  const L = Math.abs((w.x[1] - w.x[0]) * dir.x) + Math.abs((w.y[1] - w.y[0]) * dir.y) + Math.abs((w.z[1] - w.z[0]) * dir.z) || 1;
  const mat = w.kind === 'lift' ? M.steamDash : M.dash, n = Math.min(40, Math.max(12, Math.round(L * 6)));
  const geo = new THREE.BoxGeometry(0.02, 0.02, w.kind === 'lift' ? 0.16 : 0.28); const list = [];
  for (let i = 0; i < n; i++) { const d = tag(at(geo, mat), 'DASH', null, { noInk: true }); d.userData.o = [rng(r, w.x[0], w.x[1]), rng(r, w.y[0], w.y[1]), rng(r, w.z[0], w.z[1]), rng(r, 0, L)]; d.lookAt(d.position.clone().add(dir)); g.add(d); list.push(d); }
  const inside = v => v.x >= w.x[0] && v.x <= w.x[1] && v.y >= w.y[0] && v.y <= w.y[1] && v.z >= w.z[0] && v.z <= w.z[1];
  g.userData.tick = f => { for (const d of list) { const o = d.userData.o, u = (o[3] + f * 0.18) % L; d.position.set(o[0] + dir.x * (u - o[3]), o[1] + dir.y * (u - o[3]), o[2] + dir.z * (u - o[3]));
    if (!inside(d.position)) d.position.set(o[0], o[1], o[2]); d.lookAt(d.position.clone().add(dir)); } };
  g.userData.tick(0);
  return g;
}

/* ───────────────────────── THE PIECES: PIECE[kind](K, params, rng) → THREE.Group, built at its own origin ───────────────────────── */
export const PIECE = {
  /* STRUCTURE */
  wall(K, p) { return wallGroup(K, p); },
  ceiling(K, p) { const g = new THREE.Group(); g.add(ceilingMesh(K, { mat: 'stock', x: [-p.w / 2, p.w / 2], z: [-p.d / 2, p.d / 2], y: 0 })); return g; },
  door(K, p) { return doorLeaf(K.M, p.w, 2.05, p.color); },
  stormDoor(K, p) { const M = K.M, g = new THREE.Group(), w = p.w, h = 2.05, f = 0.05, fr = M.furn(p.color || 'stock'); g.add(slabB(f, h, 0.04, fr, f / 2 - w, 0, 0)); g.add(slabB(f, h, 0.04, fr, -f / 2, 0, 0)); g.add(slab(w, f, 0.04, fr, -w / 2, h - f / 2, 0)); g.add(slab(w, 0.12, 0.04, fr, -w / 2, 0.06, 0));
    g.add(slab(w, 0.04, 0.04, fr, -w / 2, 1.0, 0)); const gl = glare(M, w - 0.1, h - 0.3, 3); gl.position.set(-w / 2, 1.1, 0.025); g.add(gl); g.add(slab(0.03, 0.14, 0.05, M.steel, -w + 0.09, 1.0, 0.04)); return g; },
  stairs(K, p) { const M = K.M, g = new THREE.Group(), n = p.steps || 7, rise = p.rise || 0.18, run = p.run || 0.28, w = p.w || 1.0, tread = M.furn(p.color || 'oak'), riser = M.furn('stock');
    const D = n * run, z0 = D / 2;                               // the flight climbs toward −z; the first riser faces +z at z0
    for (let i = 0; i < n; i++) { const y = (i + 1) * rise, z = z0 - i * run;
      g.add(slabB(w, 0.04, run + 0.02, tread, 0, y - 0.04, z - run / 2 + 0.01)); g.add(slabB(w - 0.02, rise - 0.04, 0.02, riser, 0, y - rise, z - 0.01, { inkMul: 0.7 })); }
    const sl = Math.atan2(n * rise, D), len = Math.hypot(n * rise, D);
    for (const sx of [-1, 1]) g.add(slab(0.05, 0.3, len + 0.1, M.furn(p.color || 'oak'), sx * (w / 2 + 0.025), n * rise / 2 - 0.02, 0, { rx: sl }));
    return g; },
  screenCage(K, p) { return screenCageG(K.M, p); },
  fence(K, p) {                                               // white panels between posts; a gap for the gate, whose leaf stands open on the far side
    const M = K.M, g = new THREE.Group(), items = [], n = Math.round(p.w / 2.4), gx0 = (p.gateAt ?? 0) - (p.gateW || 1.2) / 2, gx1 = (p.gateAt ?? 0) + (p.gateW || 1.2) / 2;
    const post = x => items.push({ geometry: new THREE.BoxGeometry(0.13, 1.95, 0.13), matrix: new THREE.Matrix4().makeTranslation(x, 0.975, 0) });
    const panel = (a, b) => { if (b - a > 0.1) items.push({ geometry: new THREE.BoxGeometry(b - a - 0.1, 1.6, 0.05), matrix: new THREE.Matrix4().makeTranslation((a + b) / 2, 0.95, 0) }); };
    for (let i = 0; i <= n; i++) { const x = -p.w / 2 + i * 2.4; if (x < gx0 || x > gx1) post(x); if (i < n) { const a = x, b = x + 2.4; if (b <= gx0 || a >= gx1) panel(a, b); else { panel(a, gx0); panel(gx1, b); } } }
    post(gx0); post(gx1); const fm = at(mergeGeometries(items), M.fence); fm.name = 'fence'; fm.userData.shape = 'SLAB'; g.add(fm);
    const leaf = slabB(p.gateW || 1.2, 1.5, 0.05, M.fence, 0, 0.1, 0); const hinge = new THREE.Group(); hinge.position.set(gx1, 0, 0); hinge.rotation.y = Math.PI / 2; leaf.position.x = -(p.gateW || 1.2) / 2; hinge.add(leaf); g.add(hinge); return g; },

  /* FURNITURE */
  sofa(K, p) { const M = K.M, g = new THREE.Group(), w = p.w, d = p.d, body = M.furn(p.color || 'red', { keyMix: 0.35 });
    g.add(cushionB(w, 0.42, d, body, 0, 0, 0)); g.add(cushionB(w, 0.45, 0.22, body, 0, 0.42, -d / 2 + 0.11)); g.add(cushionB(0.2, 0.22, d, body, -w / 2 + 0.1, 0.42, 0)); g.add(cushionB(0.2, 0.22, d, body, w / 2 - 0.1, 0.42, 0));
    for (const [x, m] of [[-0.6, M.furn('yellow')], [-0.15, M.cushion], [0.55, M.furn('cyan')]]) g.add(cushion(0.42, 0.36, 0.14, m, x, 0.66, -d / 2 + 0.3, { rx: -0.25 })); return g; },
  baseRun(K, p) { const M = K.M, g = new THREE.Group(), x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, d = p.d, c = p.color || 'teal'; const segs = []; let u = x0;
    for (const [cc, w] of p.gaps || []) { segs.push([u, cc - w / 2]); u = cc + w / 2; } segs.push([u, x1]);
    for (const [a, b] of segs) { const L = b - a, cx = (a + b) / 2 - p.x; if (L < 0.1) continue; g.add(slabB(L, 0.1, d - 0.06, M.rubberObj, cx, 0, -0.03)); g.add(slabB(L, 0.78, d - 0.02, M.furn(c), cx, 0.1, -0.01));
      const n = Math.max(1, Math.round(L / 0.46)); for (let i = 0; i < n; i++) { const dx = cx - L / 2 + L * (i + 0.5) / n, dw = L / n - 0.015;
        g.add(slab(dw, 0.15, 0.02, M.drawer(c), dx, 0.8, d / 2)); g.add(slab(dw, 0.56, 0.02, M.shaker(c), dx, 0.42, d / 2));
        g.add(slab(0.1, 0.012, 0.02, M.steel, dx, 0.8, d / 2 + 0.018, { inkMul: 0.4 })); g.add(slab(0.012, 0.12, 0.02, M.steel, dx + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), 0.58, d / 2 + 0.018, { inkMul: 0.4 })); }
      g.add(slabB(L + 0.02, 0.035, d + 0.04, M.terrazzo, cx, 0.88, 0.02)); }
    return g; },
  upperRun(K, p) { const M = K.M, g = new THREE.Group(), x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, d = p.d, c = p.color || 'teal'; const segs = []; let u = x0;
    for (const [cc, w] of p.gaps || []) { segs.push([u, cc - w / 2, 1.42, 2.28]); segs.push([cc - w / 2, cc + w / 2, 1.93, 2.28]); u = cc + w / 2; } segs.push([u, x1, 1.42, 2.28]);
    for (const [a, b, y0, y1] of segs) { const L = b - a, cx = (a + b) / 2 - p.x, H = y1 - y0; g.add(slabB(L, H, d - 0.02, M.furn(c), cx, y0, -0.01)); const n = Math.max(1, Math.round(L / 0.42));
      for (let i = 0; i < n; i++) { const dx = cx - L / 2 + L * (i + 0.5) / n; g.add(slab(L / n - 0.015, H - 0.02, 0.02, H < 0.5 ? M.drawer(c) : M.shaker(c), dx, y0 + H / 2, d / 2)); if (H > 0.5) g.add(slab(0.012, 0.12, 0.02, M.steel, dx + (i % 2 ? 1 : -1) * (L / n / 2 - 0.05), y0 + 0.14, d / 2 + 0.018, { inkMul: 0.4 })); } }
    g.add(slabB(p.w, 0.06, d + 0.03, M.furn('stock'), 0, 2.28, 0.01)); return g; },
  peninsula(K, p) { const M = K.M, g = new THREE.Group(), w = p.w, d = p.d, c = p.color || 'teal'; g.add(slabB(w, 0.1, d - 0.3, M.rubberObj, 0, 0, -0.12)); g.add(slabB(w, 0.8, d - 0.28, M.furn(c), 0, 0.1, -0.13));
    const n = Math.round(w / 0.46); for (let i = 0; i < n; i++) { const dx = -w / 2 + w * (i + 0.5) / n; g.add(slab(w / n - 0.015, 0.56, 0.02, M.shaker(c), dx, 0.42, -d / 2 + 0.14, { ry: Math.PI })); g.add(slab(w / n - 0.015, 0.15, 0.02, M.drawer(c), dx, 0.8, -d / 2 + 0.14, { ry: Math.PI })); }
    g.add(slabB(w + 0.04, 0.04, d, M.terrazzo, 0, 0.9, 0)); return g; },
  range(K, p) { const M = K.M, g = new THREE.Group(), w = p.w, d = p.d; g.add(slabB(w, 0.9, d, M.steel, 0, 0, 0)); g.add(slab(w - 0.12, 0.44, 0.02, M.blackGlass, 0, 0.42, d / 2)); const gl = glare(M, w - 0.2, 0.36, 2); gl.position.set(0, 0.42, d / 2 + 0.012); g.add(gl);
    g.add(bent([[-w / 2 + 0.06, 0.72, d / 2 + 0.02], [-w / 2 + 0.06, 0.72, d / 2 + 0.06], [w / 2 - 0.06, 0.72, d / 2 + 0.06], [w / 2 - 0.06, 0.72, d / 2 + 0.02]], 0.012, M.steel, 12, { inkMul: 0.5 }));
    g.add(slabB(w, 0.012, d, M.blackGlass, 0, 0.9, 0)); g.add(slabB(w, 0.12, 0.06, M.blackGlass, 0, 0.91, -d / 2 + 0.03));
    for (const [x, z, r] of [[-0.18, 0.1, 0.1], [0.18, 0.1, 0.08], [-0.18, -0.15, 0.08], [0.18, -0.15, 0.1]]) g.add(ring(r, 0.006, M.glare, x, 0.915, z, { rx: Math.PI / 2, noInk: true }));
    g.add(slabB(0.22, 0.34, 0.01, M.runner, 0.14, 0.42, d / 2 + 0.07, { inkMul: 0.5 })); return g; },
  microwave(K, p) { const M = K.M, g = new THREE.Group(), w = p.w, d = p.d; g.add(slabB(w, 0.42, d, M.steel, 0, 0, 0)); g.add(slab(w * 0.66, 0.3, 0.015, M.blackGlass, -w * 0.12, 0.21, d / 2)); g.add(slab(w * 0.2, 0.3, 0.015, M.blackGlass, w * 0.36, 0.21, d / 2));
    const gl = glare(M, w * 0.5, 0.24, 2); gl.position.set(-w * 0.12, 0.21, d / 2 + 0.01); g.add(gl); return g; },
  reformer(K, p) { const M = K.M, g = new THREE.Group(), L = p.d, w = p.w, fr = M.furn(p.color || 'yellow'), strap = M.furn('cyan');
    for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) g.add(slabB(0.1, 0.13, L, fr, x, 0.14, 0));
    for (const z of [-L / 2 + 0.05, L / 2 - 0.05]) g.add(slabB(w, 0.13, 0.1, fr, 0, 0.14, z));
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(slabB(0.09, 0.14, 0.09, fr, x * (w / 2 - 0.05), 0, z * (L / 2 - 0.05)));
    g.add(cushionB(w - 0.16, 0.09, 0.78, M.cushion, 0, 0.27, 0.35)); g.add(cushionB(w - 0.3, 0.07, 0.24, M.cushion, 0, 0.36, 0.62, { rx: -0.25 }));
    for (const x of [-0.14, 0.14]) g.add(drum(0.045, 0.045, 0.14, M.cushion, x, 0.36, 0.22));
    for (let i = 0; i < 4; i++) g.add(rod(0.015, 0.5, M.steel, -0.12 + i * 0.08, 0.22, -0.45, { rx: Math.PI / 2, inkMul: 0.4 }));
    g.add(bent([[-w / 2 + 0.06, 0.27, -L / 2 + 0.3], [-w / 2 + 0.06, 0.62, -L / 2 + 0.22], [w / 2 - 0.06, 0.62, -L / 2 + 0.22], [w / 2 - 0.06, 0.27, -L / 2 + 0.3]], 0.02, M.steel, 20));
    for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) { g.add(slabB(0.07, 0.42, 0.07, fr, x, 0.27, L / 2 - 0.05)); g.add(drum(0.04, 0.04, 0.03, M.rubberObj, x + 0.015, 0.66, L / 2 - 0.05, { rz: Math.PI / 2, inkMul: 0.5 }));
      g.add(bent([[x, 0.66, L / 2 - 0.05], [x * 0.9, 0.45, 0.6], [x * 0.6, 0.4, 0.2]], 0.012, strap, 10, { inkMul: 0.4 })); }
    g.traverse(o => { if (o.isMesh && o.material === fr) o.userData.inkMul = 1.2; }); return g; },
  eggChair(K, p) { return eggChairG(K.M, p.color); },
  sideTable(K, p) { const M = K.M, g = new THREE.Group(), b = M.furn(p.color || 'cobalt'); g.add(drum(0.23, 0.23, 0.03, b, 0, 0.5, 0)); g.add(rod(0.025, 0.5, b, 0, 0, 0)); g.add(drum(0.16, 0.18, 0.03, b, 0, 0, 0));
    g.add(turned([[0, 0.05], [1, 0.07]], 0.1, M.furn('yellow'), 0.06, 0.53, 0, { pts: 3 })); return g; },
  plantStand(K, p, r) { const M = K.M, g = new THREE.Group(), fr = M.furn('stock'), pots = ['cyan', 'magenta', 'yellow']; let k = 0;
    for (const [y, z] of [[0.25, 0.12], [0.6, 0], [0.95, -0.12]]) { g.add(slabB(p.w, 0.02, 0.14, fr, 0, y, z)); for (let i = 0; i < 2 + (y < 0.5 ? 1 : 0); i++) { const pt = PIECE.plant(K, { color: pots[k++ % 3] }, r); pt.scale.setScalar(0.55); pt.position.set(-p.w / 2 + 0.12 + i * 0.2, y + 0.02, z); g.add(pt); } }
    for (const x of [-p.w / 2, p.w / 2]) g.add(bent([[x, 0, 0.2], [x, 1.1, -0.15]], 0.012, fr, 4)); return g; },
  shoeTower(K, p, r) {                                        // five tiers of a tall rack; every pair in its own spot or process colour
    const M = K.M, g = new THREE.Group(), L = p.d, D = p.w, tiers = 5, H = p.h || 1.45, colors = (p.colors || ['stock']).map(k => M.furn(k)); let k = 0;
    for (let t = 0; t < tiers; t++) g.add(slabB(D, 0.025, L, M.oakWood, 0, 0.08 + t * (H - 0.1) / (tiers - 1), 0));
    for (const [x, z] of [[-D / 2, -L / 2], [D / 2, -L / 2], [-D / 2, L / 2], [D / 2, L / 2]]) g.add(slabB(0.025, H, 0.025, M.rubberObj, x, 0, z));
    for (let t = 0; t < tiers; t++) { const y = 0.105 + t * (H - 0.1) / (tiers - 1); for (let i = 0; i < 2; i++) { const z = -L / 2 + 0.24 + i * 0.36, c = colors[k++ % colors.length]; g.add(sneakerG(M, c, -0.02, y, z - 0.06, Math.PI / 2 + rng(r, -0.2, 0.2))); g.add(sneakerG(M, c, -0.02, y, z + 0.07, Math.PI / 2 + rng(r, -0.2, 0.2))); } }
    g.add(sneakerG(M, colors[1 % colors.length], -0.36, 0, -0.1, 0.9)); g.add(sneakerG(M, colors[1 % colors.length], -0.29, 0, 0.05, 1.2)); return g; },
  table(K, p) { const M = K.M, g = new THREE.Group(), w = p.w || 1.6, d = p.d || 0.9, h = p.h || 0.75, b = M.furn(p.color || 'oak'), leg = 0.07;
    g.add(slabB(w, 0.05, d, b, 0, h - 0.05, 0)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(slabB(leg, h - 0.05, leg, b, sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08)));
    for (const sz of [-1, 1]) g.add(slabB(w - 0.2, 0.08, 0.025, b, 0, h - 0.13, sz * (d / 2 - 0.08), { inkMul: 0.8 })); for (const sx of [-1, 1]) g.add(slabB(0.025, 0.08, d - 0.2, b, sx * (w / 2 - 0.08), h - 0.13, 0, { inkMul: 0.8 }));
    return g; },
  chair(K, p) { const M = K.M, g = new THREE.Group(), b = M.furn(p.color || 'teal'), w = 0.46, d = 0.5, sh = 0.45, leg = 0.045;
    g.add(slabB(w, 0.04, d, b, 0, sh - 0.04, 0)); g.add(cushionB(w - 0.06, 0.05, d - 0.08, M.cushion, 0, sh, 0.02));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(slabB(leg, sh - 0.04, leg, b, sx * (w / 2 - 0.03), 0, sz * (d / 2 - 0.03)));
    for (const sx of [-1, 1]) g.add(slabB(leg, 0.47, leg, b, sx * (w / 2 - 0.03), sh, -d / 2 + 0.03, { rx: -0.08 }));
    for (let i = 0; i < 3; i++) g.add(slabB(w - 0.04, 0.05, 0.025, b, 0, sh + 0.14 + i * 0.13, -d / 2 + 0.02 - i * 0.011, { rx: -0.08, inkMul: 0.8 }));
    return g; },
  bookshelf(K, p, r) { const M = K.M, g = new THREE.Group(), w = p.w || 0.9, h = p.h || 1.8, d = p.d || 0.32, t = 0.03, cs = M.furn('stock'), shelves = 4;
    for (const sx of [-1, 1]) g.add(slabB(t, h, d, cs, sx * (w / 2 - t / 2), 0, 0)); g.add(slabB(w, t, d, cs, 0, h - t, 0)); g.add(slabB(w - 2 * t, 0.08, d, cs, 0, 0, 0)); g.add(slabB(w - 2 * t, h - 0.1, 0.012, M.furn('paper'), 0, 0.08, -d / 2 + 0.006, { noInk: true }));
    const hues = ['cyan', 'magenta', 'yellow', 'cobalt', 'red', 'tangerine', 'teal', 'stock'];
    for (let s = 0; s < shelves; s++) { const y0 = 0.08 + s * (h - 0.11) / shelves; if (s > 0) g.add(slabB(w - 2 * t, 0.025, d - 0.02, cs, 0, y0 - 0.025, 0.01));
      const fill = [0.72, 0.5, 0.64, 0.38][s], n = [7, 5, 9, 3][s]; let x = -w / 2 + t + 0.01;   // odd runs, left-heavy
      for (let i = 0; i < n && x < -w / 2 + t + (w - 2 * t) * fill; i++) { const bw = rng(r, 0.03, 0.055), bh = rng(r, 0.19, 0.29), lean = i === n - 1 && s % 2 === 0 ? 0.28 : 0;
        const bk = slabB(bw, bh, d * rng(r, 0.62, 0.8), M.furn(pick(r, hues)), x + bw / 2 + (lean ? 0.05 : 0), y0, 0.02, { rz: -lean, inkMul: 0.6 }); g.add(bk); x += bw + 0.004 + (lean ? 0.08 : 0); } }
    return g; },

  /* FIXTURES */
  pendant(K, p) { const M = K.M, g = new THREE.Group(), drop = (p.h || 1.0) - 0.13; g.add(drum(0.05, 0.05, 0.025, M.furn('stock'), 0, -0.025, 0, { inkMul: 0.6 }));   // the canopy on the ceiling
    g.add(rod(0.006, drop, M.rubberObj, 0, -drop, 0)); g.add(shell(0, 0.13, 0.24, M.furn(p.color || 'tangerine', { side: THREE.DoubleSide }), 0, -drop - 0.12, 0)); g.add(drum(0.035, 0.035, 0.05, M.rubberObj, 0, -drop - 0.03, 0));
    const gl = tag(at(new THREE.CircleGeometry(0.1, sides(0.1)), M.glow, 0, -drop - 0.235, 0), 'GLOW', null, { rx: Math.PI / 2, noInk: true }); g.add(gl); return g; },
  flushLight(K) { const M = K.M, g = new THREE.Group(); g.add(glowDrum(0.17, 0.15, 0.06, M, 0, -0.07, 0)); g.add(drum(0.18, 0.18, 0.015, M.furn('stock'), 0, -0.015, 0)); return g; },
  floorLamp(K, p) { const M = K.M, g = new THREE.Group(), b = M.furn(p.color || 'cobalt'); g.add(drum(0.14, 0.16, 0.03, b, 0, 0, 0)); g.add(rod(0.012, 1.45, b, 0, 0.03, 0)); g.add(glowDrum(0.16, 0.19, 0.28, M, 0, 1.4, 0)); return g; },
  lantern(K) { const M = K.M, g = new THREE.Group(); g.add(slab(0.2, 0.3, 0.18, M.furn('stock'), 0, 0, 0.1)); const gl = slab(0.14, 0.2, 0.19, M.glow, 0, 0, 0.1, { noInk: true }); gl.userData.shape = 'GLOW'; g.add(gl);
    g.add(cone(0.16, 0.1, M.furn('stock'), 0, 0.2, 0.1, { sides: 4, ry: Math.PI / 4 })); return g; },
  fan(K, p) { const M = K.M, g = new THREE.Group(), head = new THREE.Group(), body = M.furn(p.color || 'red'); head.position.y = 0.46; head.rotation.x = -0.12; g.add(head);
    head.add(ring(0.36, 0.035, body, 0, 0, 0)); head.add(shell(0.36, 0.36, 0.14, M.furn(p.color || 'red', { side: THREE.DoubleSide }), 0, 0, -0.07, { rx: Math.PI / 2 }));
    head.add(drum(0.1, 0.12, 0.14, M.rubberObj, 0, 0, -0.23, { rx: Math.PI / 2 }));
    for (const rr of [0.12, 0.24]) head.add(ring(rr, 0.006, M.rubberObj, 0, 0, 0.03));
    for (let i = 0; i < 4; i++) head.add(slab(0.72, 0.008, 0.008, M.rubberObj, 0, 0, 0.03, { rz: i * Math.PI / 4 }));
    const blades = new THREE.Group(); blades.position.z = -0.03; for (let i = 0; i < 3; i++) { const b = slab(0.1, 0.3, 0.01, M.steel, 0, 0.16, 0, { ry: 0.5, inkMul: 0.4 }); const piv = new THREE.Group(); piv.rotation.z = i * TAU / 3; piv.add(b); blades.add(piv); }
    blades.add(drum(0.05, 0.05, 0.05, M.steel, 0, 0, -0.025, { rx: Math.PI / 2 })); head.add(blades); g.userData.blades = blades;
    for (const x of [-0.38, 0.38]) g.add(bent([[x, 0.46, 0], [x * 1.05, 0.2, 0], [x * 1.1, 0, 0.12]], 0.018, M.rubberObj, 6)); g.add(slab(0.9, 0.03, 0.1, M.rubberObj, 0, 0.015, 0.12)); return g; },
  boxFan(K, p) {                                              // a square box fan on the floor, its grille facing down the hall
    const M = K.M, g = new THREE.Group(), b = M.furn(p.color || 'cyan'), w = p.w, h = p.h || 0.55; g.add(slabB(w, h, 0.16, b, 0, 0, 0)); g.add(slab(w - 0.08, h - 0.08, 0.02, M.rubberObj, 0, h / 2, -0.09));
    for (const rr of [0.08, 0.16, 0.22]) g.add(ring(rr, 0.006, M.furn('stock'), 0, h / 2, -0.1));
    for (let i = 0; i < 4; i++) g.add(slab(w - 0.1, 0.008, 0.008, M.furn('stock'), 0, h / 2, -0.1, { rz: i * Math.PI / 4 }));
    g.add(slab(0.08, 0.03, 0.06, M.rubberObj, w / 2 - 0.08, h + 0.015, 0)); return g; },
  clock(K, p) { const M = K.M, g = new THREE.Group(); g.add(drum(0.24, 0.24, 0.03, M.furn('stock'), 0.035, 0, 0, { rz: Math.PI / 2 })); g.add(ring(0.24, 0.025, M.furn(p.color || 'cyan'), 0.03, 0, 0, { ry: Math.PI / 2 }));
    g.add(slab(0.01, 0.15, 0.02, M.rubberObj, 0.04, 0.06, 0, { rx: 0.5, noInk: true })); g.add(slab(0.01, 0.1, 0.02, M.rubberObj, 0.04, 0.03, 0.03, { rx: -1.6, noInk: true })); return g; },
  mirror(K) { const M = K.M, g = new THREE.Group(), w = 0.8, h = 1.8, f = 0.06; const outer = new THREE.Shape(); outer.moveTo(-w / 2, 0); outer.lineTo(w / 2, 0); outer.lineTo(w / 2, h - w / 2); outer.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); outer.lineTo(-w / 2, 0);
    const hole = new THREE.Path(); hole.moveTo(-w / 2 + f, f); hole.lineTo(w / 2 - f, f); hole.lineTo(w / 2 - f, h - w / 2); hole.absarc(0, h - w / 2, w / 2 - f, 0, Math.PI, false); hole.lineTo(-w / 2 + f, f); outer.holes.push(hole);
    const lean = new THREE.Group(); lean.rotation.x = -0.14; g.add(lean); lean.add(cutout(outer, 0.04, M.furn('stock')));
    const inner = new THREE.Shape(); inner.moveTo(-w / 2 + f, f); inner.lineTo(w / 2 - f, f); inner.lineTo(w / 2 - f, h - w / 2); inner.absarc(0, h - w / 2, w / 2 - f, 0, Math.PI, false); inner.lineTo(-w / 2 + f, f);
    lean.add(cutout(inner, 0, M.mirror, 0, 0, 0.02)); const gl = glare(M, w * 0.8, h * 0.5, 3); gl.position.set(0, h * 0.55, 0.03); lean.add(gl); g.position.z = 0.12; return g; },
  sink(K, p) { const M = K.M, g = new THREE.Group(); g.add(slabB(p.w, 0.006, p.d, M.rubberObj, 0, 0, 0, { inkMul: 0.4 })); g.add(slabB(0.012, 0.004, p.d - 0.08, M.steel, 0, 0.006, 0));
    if (p.faucet) { const f = PIECE.faucet(K); f.position.z = -p.d / 2 - 0.04; g.add(f); } return g; },
  faucet(K) { const g = new THREE.Group(); g.add(bent([[0, 0, 0], [0, 0.31, 0], [0, 0.34, 0.12], [0, 0.24, 0.2]], 0.014, K.M.steel, 12)); return g; },
  clothesline(K, p) {                                         // two white posts, the line, and the washing folded over it: a SHEET per item
    const M = K.M, g = new THREE.Group(), fr = M.furn('stock'), y = p.lineY || 1.6, H = p.h || 1.9;
    for (const sx of [-1, 1]) { g.add(rod(0.05, H, fr, sx * p.w / 2, 0, 0)); g.add(slab(0.5, 0.05, 0.05, fr, sx * p.w / 2, H - 0.05, 0)); }
    g.add(slab(p.w, 0.014, 0.014, M.rubberObj, 0, y, 0));
    for (const it of p.items || []) { const [x0, x1] = it.x, h = y - it.y, m = M.furn(it.color || 'stock', { hatch: 0.4 });
      g.add(sheet([[[x0, y, 0], [x1, y, 0], [x1, it.y, 0.04], [x0, it.y, 0.04]], [[x1, y, 0], [x0, y, 0], [x0, y - h * 0.78, -0.04], [x1, y - h * 0.78, -0.04]]], 0.012, m));
      for (const px of [x0 + 0.08, x1 - 0.08]) g.add(slab(0.03, 0.08, 0.05, fr, px, y + 0.01, 0, { inkMul: 0.4 })); }
    return g; },

  /* CLUTTER */
  basket(K, p) { const M = K.M, c = K.hex(p.color || 'yellow'); const m = M.furn(p.color || 'yellow', { color2: shade(c, -0.16, 0, 0), stripe: { mode: 1, freq: 22, dir: [0, 1, 0] }, side: THREE.DoubleSide });   // open vessel: its inside in its own planes
    const g = new THREE.Group(); g.add(turned([[0, 0.18], [0.1, 0.22], [0.9, 0.23], [1, 0.24]], 0.36, m, 0, 0, 0, { pts: 6 })); return g; },
  bowl(K, p) { const g = new THREE.Group(); g.add(turned([[0, 0.03], [0.3, 0.07], [0.8, 0.1], [1, 0.11]], 0.11, K.M.furn(p.color || 'magenta', { spec: 1, gloss: 40, side: THREE.DoubleSide }), 0, 0, 0, { pts: 6 })); return g; },   // an open vessel shows its inside in its own planes
  kettle(K) { const M = K.M, g = new THREE.Group(); g.add(turned([[0, 0.09], [0.4, 0.1], [0.8, 0.07], [1, 0.03]], 0.2, M.wrong)); g.add(ring(0.06, 0.012, M.rubberObj, 0, 0.2, 0, { arc: Math.PI }));
    g.add(cone(0.02, 0.12, M.wrong, 0.1, 0.13, 0, { rz: -1.0 })); const puffs = []; for (let i = 0; i < 4; i++) { const s = puff(0.05 + i * 0.015, M.steam, 0.14 + i * 0.03, 0.24 + i * 0.1, 0, { ico: 1 }); g.add(s); puffs.push(s); } g.userData.puffs = puffs; return g; },
  kettlebell(K) { const M = K.M, g = new THREE.Group(); g.add(puff(0.11, M.wrong, 0, 0.11, 0)); g.add(ring(0.075, 0.018, M.wrong, 0, 0.2, 0, { arc: Math.PI })); return g; },
  breadBox(K, p) { const M = K.M, g = new THREE.Group(); g.add(slabB(p.w, 0.26, p.d, M.furn(p.color || 'tangerine'), 0, 0, 0)); const gl = glare(M, p.w * 0.6, 0.18, 2); gl.position.set(0, 0.13, p.d / 2 + 0.01); g.add(gl); return g; },
  bananas(K) { const M = K.M, g = new THREE.Group(); for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.16; g.add(bent([[0, 0, 0], [Math.sin(a) * 0.08, 0.06, Math.cos(a) * 0.06], [Math.sin(a) * 0.18, 0.04, Math.cos(a) * 0.14]], 0.02, M.furn('yellow'), 8, { inkMul: 0.5 })); } return g; },
  knifeBlock(K) { const M = K.M, g = new THREE.Group(); g.add(slabB(0.12, 0.22, 0.2, M.oakWood, 0, 0, 0, { rx: -0.25 })); for (let i = 0; i < 4; i++) g.add(slabB(0.022, 0.09, 0.03, M.rubberObj, -0.04 + (i % 2) * 0.05, 0.21, -0.07 + Math.floor(i / 2) * 0.06, { rx: -0.25, inkMul: 0.4 })); return g; },
  paperTowel(K) { const M = K.M, g = new THREE.Group(); g.add(drum(0.08, 0.08, 0.015, M.steel, 0, 0, 0)); g.add(drum(0.065, 0.065, 0.28, M.furn('stock'), 0, 0.015, 0)); g.add(rod(0.008, 0.33, M.steel, 0, 0.015, 0)); return g; },
  dishRack(K, p) { const M = K.M, g = new THREE.Group(); g.add(slabB(p.w, 0.1, p.d, M.steel, 0, 0, 0)); for (let i = 0; i < 3; i++) g.add(drum(0.1, 0.1, 0.015, [M.furn('cyan'), M.furn('stock'), M.furn('magenta')][i], -0.12 + i * 0.1 + 0.0075, 0.12, 0, { rz: Math.PI / 2, inkMul: 0.5 }));
    g.add(slabB(0.12, 0.1, 0.12, M.oakWood, 0.14, 0, 0.05, { inkMul: 0.5 })); return g; },
  plant(K, p, r) { const M = K.M, g = new THREE.Group(); g.add(turned([[0, 0.14], [0.8, 0.17], [1, 0.19]], 0.3, M.furn(p.color || 'tangerine', { spec: 1, gloss: 30 }), 0, 0, 0, { pts: 4 }));
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; g.add(puff(0.16, M.hedge, Math.cos(a) * 0.12, 0.5 + rng(r, 0, 0.25), Math.sin(a) * 0.12, { ico: 0, rx: rng(r, -0.6, 0.6), rz: rng(r, -0.6, 0.6), squash: [0.5, 1.6, 0.25] })); } return g; },
  mat(K, p) { const g = new THREE.Group(); g.add(slabB(p.w, 0.015, p.d, K.M.coir, 0, 0.004, 0, { inkMul: 0.5 })); return g; },
  rug(K, p) { const g = new THREE.Group(); g.add(slabB(p.w, 0.008, p.d, p.pattern === 'runner' ? K.M.runner : K.M.rug, 0, 0.002, 0, { inkMul: 0.4 })); return g; },
  sneaker(K, p) { const g = new THREE.Group(); g.add(sneakerG(K.M, K.M.furn(p.color || 'magenta'), 0, 0, 0, 0)); return g; },
  leafBlower(K, p) {                                          // a tangerine leaf blower propped on the bed, nozzle toward the lawn
    // the nozzle rides on the body's flank (pass 2's centred-cylinder helper had floated it 12 cm above the body, and the trigger off to one side)
    const M = K.M, g = new THREE.Group(), b = M.furn(p.color || 'tangerine'); g.add(slabB(0.22, 0.24, 0.3, b, 0.1, 0.05, 0.05)); g.add(drum(0.05, 0.07, 0.42, b, -0.02, 0.17, -0.26, { rx: Math.PI / 2 }));
    g.add(drum(0.11, 0.11, 0.1, M.rubberObj, 0.1, 0.17, 0.15, { rx: Math.PI / 2 })); g.add(bent([[0.1, 0.29, 0.1], [0.12, 0.36, 0.0], [0.12, 0.3, -0.1]], 0.015, M.rubberObj, 8)); g.add(slab(0.04, 0.05, 0.03, M.rubberObj, 0.12, 0.315, 0.02)); return g; },
  sprinkler(K, p) {                                           // the lime head on its spike, and its whole sweep of water drawn at once, as a comic draws motion
    const M = K.M, g = new THREE.Group(); g.add(rod(0.02, 0.25, M.steel, 0, 0, 0)); const head = new THREE.Group(); head.position.y = 0.25; g.add(head); head.add(slab(0.36, 0.06, 0.08, M.wrong, 0, 0.03, 0)); head.add(drum(0.05, 0.05, 0.1, M.wrong, 0, -0.06, 0));
    g.add(PIECE.waterArcs(K, p)); g.userData.head = head; return g; },
  ladder(K, p) { const M = K.M, g = new THREE.Group(), L = p.w, W = p.d; for (const z of [-W / 2, W / 2]) g.add(slabB(L, 0.012, 0.055, M.wrong, 0, 0.013, z, { noInk: true }));
    const n = 9; for (let i = 0; i < n; i++) g.add(slabB(0.055, 0.014, W, M.wrong, -L / 2 + L * (i + 0.5) / n, 0.014, 0, { noInk: true })); return g; },
  crate(K, p) { const M = K.M, g = new THREE.Group(), w = p.w || 0.5, h = p.h || 0.35, d = p.d || 0.4, b = M.furn(p.color || 'oak'), post = 0.04, n = 3, gap = 0.025;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(slabB(post, h, post, b, sx * (w / 2 - post / 2), 0, sz * (d / 2 - post / 2)));
    const sh = (h - (n + 1) * gap) / n; for (let i = 0; i < n; i++) { const y = gap + i * (sh + gap);
      for (const sz of [-1, 1]) g.add(slabB(w - 2 * post, sh, 0.018, b, 0, y, sz * (d / 2 - 0.009), { inkMul: 0.8 })); for (const sx of [-1, 1]) g.add(slabB(0.018, sh, d - 2 * post, b, sx * (w / 2 - 0.009), y, 0, { inkMul: 0.8 })); }
    g.add(slabB(w - 0.02, 0.02, d - 0.02, b, 0, 0.005, 0)); return g; },

  /* NATURE */
  shrub(K, p, r) { return shrubG(K.M, r, p.s || 1); },
  hedge(K, p, r) { const g = new THREE.Group(); for (let i = 0; i < p.count; i++) { const s = shrubG(K.M, r, rng(r, 0.95, 1.2)); s.position.set(-p.w / 2 + p.w * (i + 0.5) / p.count + rng(r, -0.3, 0.3), 0, rng(r, -0.15, 0.15)); g.add(s); } return g; },
  oak(K, p, r) { const M = K.M, g = new THREE.Group(); g.add(bent([[0, 0, 0], [0.2, 2.2, 0], [0.1, 3.4, 0.2]], 0.32, M.bark, 8)); for (const [x, y, z] of [[-1.4, 3.8, 0.3], [1.5, 3.9, -0.2], [0, 4.4, 1.2]]) g.add(bent([[0.1, 2.6, 0.1], [x * 0.6, (2.6 + y) / 2, z * 0.6], [x, y, z]], 0.13, M.bark, 6));
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; g.add(puff(rng(r, 1.3, 2.0), M.oakLeaf, Math.cos(a) * rng(r, 1.2, 2.4), rng(r, 4.2, 5.8), Math.sin(a) * rng(r, 1.0, 2.0), { ico: 1, squash: [1, 0.72, 1] })); }
    g.add(puff(2.1, M.oakLeaf, 0, 6.2, 0, { ico: 1 })); return g; },
  palms(K, p, r) { const g = new THREE.Group(); const crowns = []; for (const [x, z, h, lean] of [[-2.6, 0.5, 9.5, 0.6], [0.6, -0.4, 8.2, -0.4], [3.0, 0.8, 7.0, 0.8]]) { const pl = palmG(K.M, r, h, lean); pl.scale.setScalar(1.3); pl.position.set(x, 0, z); g.add(pl); crowns.push(pl.userData.crown); } g.userData.crowns = crowns; return g; },
  rock(K, p, r) { const M = K.M, g = new THREE.Group(); for (const [x, z, s, sq] of [[-0.38, 0.05, 0.42, 0.7], [0.22, -0.12, 0.3, 0.8], [0.48, 0.22, 0.18, 0.75]]) g.add(crumple(s, M.stone, x, s * sq * 0.78, z, { seed: Math.round(s * 100), squash: [1, sq, 1], ry: rng(r, 0, TAU) })); return g; },
  pond(K, p, r) { const M = K.M, g = new THREE.Group(); const w = p.w || 4, d = p.d || 2.4; const e = cutout(new THREE.Shape().absellipse(0, 0, w / 2, d / 2, 0, TAU), 0, M.pond, 0, 0.01, 0, { rx: -Math.PI / 2, curve: 40 }); e.userData.noInk = true; g.add(e);
    g.add(PIECE.ripples(K, { w: w * 0.8, d: d * 0.8, n: 3 }, r)); return g; },
  cloud(K, p, r) { const g = new THREE.Group(); const c = cutout(cloudOutline(r), 0.8, K.M.cloud, 0, 0, 0); g.add(c); return g; },
  treeline(K, p, r) { const g = new THREE.Group(); const far = ridgeSilhouette(r, { width: 60, base: -2, bumps: 9, wMin: 5, wMax: 11, hMin: 4, hMax: 8 });
    const m = at(far, new ComicMaterial({ world: K.world, unlit: true, color: mix(K.pal.hedge, K.pal.sky || '#e4f2f7', 0.45), inkWeight: 0, fog: false })); m.userData.noInk = true; m.userData.shape = 'CUTOUT'; g.add(m); return g; },
  cardinal(K) { const M = K.M, g = new THREE.Group(), red = M.furn('red'); g.add(puff(0.05, red, 0, 0.05, 0, { squash: [0.8, 0.9, 1.4] })); const head = puff(0.035, red, 0, 0.1, 0.05); g.add(head);
    g.add(cone(0.018, 0.05, red, 0, 0.14, 0.04, { rx: -0.5 })); g.add(cone(0.012, 0.03, M.furn('tangerine'), 0, 0.095, 0.095, { rx: Math.PI / 2 })); g.add(slab(0.05, 0.012, 0.09, red, 0, 0.05, -0.1, { rx: 0.4 })); g.userData.head = head; return g; },

  /* EFFECTS */
  glarePane(K, p) { const M = K.M, g = new THREE.Group(), w = p.w || 0.9, h = p.h || 1.2, f = 0.05, fr = M.furn('stock');
    g.add(slabB(w, f, 0.06, fr, 0, 0, 0)); g.add(slabB(w, f, 0.06, fr, 0, h - f, 0)); g.add(slabB(f, h, 0.06, fr, -w / 2 + f / 2, 0, 0)); g.add(slabB(f, h, 0.06, fr, w / 2 - f / 2, 0, 0));
    const gl = glare(M, w - 0.1, h - 0.1, 3); gl.position.set(0, h / 2, 0.01); g.add(gl); return g; },
  windBox(K, p, r) { const g = new THREE.Group(); g.add(windDashes(K, Object.assign({ kind: 'push' }, p), r, 'catalogue')); return g; },
  steamPuffs(K) { const M = K.M, g = new THREE.Group(); const puffs = []; for (let i = 0; i < 4; i++) { const s = puff(0.05 + i * 0.015, M.steam, 0.04 + i * 0.03, 0.05 + i * 0.1, 0, { ico: 1 }); s.scale.setScalar(0.7 + i * 0.18); g.add(s); puffs.push(s); } g.userData.puffs = puffs; return g; },
  waterArcs(K, p) { const M = K.M, g = new THREE.Group(), n = 9; for (let i = 0; i < n; i++) { const t = -1 + 2 * i / (n - 1), x1 = t * (p.w || 2.4) / 2; const top = (p.h || 1.6) * (0.75 + 0.25 * (1 - Math.abs(t)));
      g.add(bent([[0, 0.3, 0], [x1 * 0.5, top, 0.05 * (i % 2 ? 1 : -1)], [x1, 0.04, 0.3]], 0.03, M.water, 14, { noInk: true }));
      g.add(puff(0.03, M.water, x1 * 0.62, top * 0.96, 0.08, { noInk: true })); } return g; },
  glowSet(K) { const M = K.M, g = new THREE.Group(); const disc = tag(at(new THREE.CircleGeometry(0.14, sides(0.14)), M.glow, -0.32, 0.2, 0), 'GLOW', null, { noInk: true }); g.add(disc);
    g.add(glowDrum(0.12, 0.15, 0.24, M, 0, 0.08, 0)); const bx = slab(0.16, 0.22, 0.1, M.glow, 0.32, 0.19, 0, { noInk: true }); bx.userData.shape = 'GLOW'; g.add(bx); return g; },
  motionDashes(K) { const M = K.M, g = new THREE.Group(); g.add(puff(0.03, M.dash, 0, 0.25, -0.2, { noInk: true }));
    for (let i = 0; i < 3; i++) g.add(dash(0.8 * (1 - i * 0.22), 0.032, M.dash, [0.12, -0.1, 0.02][i], 0.25 - 0.25 * i * 0.4, 0.05 + i * 0.35)); return g; },
  ripples(K, p, r) { const M = K.M, g = new THREE.Group(), n = p.n || 3; for (let i = 0; i < n; i++) g.add(ring(rng(r, 0.35, 0.9), 0.05, M.ripple, rng(r, -(p.w || 3) / 3, (p.w || 3) / 3), 0.02, rng(r, -(p.d || 2) / 4, (p.d || 2) / 4), { rx: -Math.PI / 2, noInk: true, arc: rng(r, 0.8, 1.6) }));
    return g; },
};

/** buildPiece(K, card | kind, params, rng): a catalogue card or a kind, built at its origin, every mesh tagged with its shape */
export function buildPiece(K, cardOrKind, params, r = mulberry32(7)) {
  const kind = typeof cardOrKind === 'string' ? cardOrKind : cardOrKind.kind, p = Object.assign({}, typeof cardOrKind === 'string' ? {} : cardOrKind.params, params || {});
  const make = PIECE[kind]; if (!make) throw new Error('no piece builder: ' + kind);
  const g = make(K, p, r); g.name = typeof cardOrKind === 'string' ? kind : cardOrKind.id; g.userData.kind = kind; return g;
}
/** shapeCount(group): how many meshes of each alphabet shape a piece is made of (the book's cards and the explode legend) */
export function shapeCount(g) { const c = {}; g.traverse(o => { if (o.isMesh && o.userData.shape && !o.userData.isHull) c[o.userData.shape] = (c[o.userData.shape] || 0) + 1; }); return c; }
