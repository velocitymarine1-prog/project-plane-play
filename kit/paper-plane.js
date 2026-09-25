/* paper-plane.js — builds PAGE ONE, the reference paper dart, from kit/page-one-spec.js · 23 September 2026
 *
 * buildPaperPlane(world, { hullMat, smooth, seed, explode }) → THREE.Group, nose toward −z, with
 *   userData.update(t, t12, boost, stepped)   flutter + motion dashes (call every frame)
 *   userData.parts                           { body, wingletL, wingletR } rigid pieces
 *   userData.materials                       { stock, print }
 *   userData.textures                        { a, b } the two printed sides (canvas textures)
 *
 * The sheet is a closed shell: side A (+normal) is the plain outside of the page, side B (−normal) the comic
 * page, and a rim of cut edge joins them, so the ink hull (kit hullGeometry) wraps a real solid.
 * Load the display font before building (document.fonts.load('100px Bangers')) or the print falls back to Impact.
 *
 * Flat stays flat (24 Sep 2026): both printed sides carry one normal per face, so the realism dial (which rounds normals)
 * never bends the folded sheet; `smooth: true` keeps the shared normals as the don't. `explode: k` builds the six panels
 * apart (EXPLODE in the spec × k) with the five folds as magenta dashes between them: the style book's piece-by-piece view.
 */
import { THREE, ComicMaterial, HullMaterial, hullGeometry, canvasTexture } from './comic3d.js';
import { PAGE_ONE, PALETTE, HERO_MAT, MOTION, PANELS, FOLDS, EXPLODE, pageOnePoints, pageOneTriangles, pageOneNet } from './page-one-spec.js';

const TEX = 2048;                                   // texture size, px (square; the net is 7.41 × 7.26 u)

/* ───────────────────────── the shell of one rigid part ───────────────────────── */
function shellGeometries(tris, P, uvOf, t, origin, flat = true) {
  const names = [...new Set(tris.flatMap(x => x.tri))];
  const vn = {}; for (const k of names) vn[k] = [0, 0, 0];
  for (const x of tris) for (const k of x.tri) { vn[k][0] += x.n[0]; vn[k][1] += x.n[1]; vn[k][2] += x.n[2]; }
  for (const k of names) { const l = Math.hypot(...vn[k]) || 1; vn[k] = vn[k].map(v => v / l); }
  const at = (k, s) => [P[k][0] + vn[k][0] * s - origin[0], P[k][1] + vn[k][1] * s - origin[1], P[k][2] + vn[k][2] * s - origin[2]];
  const idx = {}; names.forEach((k, i) => idx[k] = i);
  const mk = (sign, flip) => {                       // indexed side (shared verts → smooth normals exist for the 'smooth' don't)
    const pos = [], uv = [], ix = [];
    for (const k of names) { pos.push(...at(k, sign * t / 2)); uv.push(...uvOf(k)); }
    for (const x of tris) { const [a, b, c] = x.tri.map(k => idx[k]); flip ? ix.push(a, c, b) : ix.push(a, b, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals(); return g;
  };
  const faceted = g => { const h = g.toNonIndexed(); h.computeVertexNormals(); return h; };   // one normal per face: paper has no curve
  const A = flat ? faceted(mk(1, false)) : mk(1, false), B = flat ? faceted(mk(-1, true)) : mk(-1, true);
  // rim: every boundary edge (used by one triangle of this part), in its A winding a→b, closed with a quad
  const count = new Map(); const key = (a, b) => a < b ? a + '|' + b : b + '|' + a;
  for (const x of tris) for (let i = 0; i < 3; i++) { const k = key(x.tri[i], x.tri[(i + 1) % 3]); count.set(k, (count.get(k) || 0) + 1); }
  const rp = [], ru = [];
  for (const x of tris) for (let i = 0; i < 3; i++) {
    const a = x.tri[i], b = x.tri[(i + 1) % 3]; if (count.get(key(a, b)) !== 1) continue;
    const aT = at(a, t / 2), aB = at(a, -t / 2), bT = at(b, t / 2), bB = at(b, -t / 2);
    rp.push(...aT, ...aB, ...bB, ...aT, ...bB, ...bT); for (let j = 0; j < 6; j++) ru.push(...uvOf(j < 2 || j === 3 ? a : b));
  }
  const R = new THREE.BufferGeometry(); R.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); R.setAttribute('uv', new THREE.Float32BufferAttribute(ru, 2)); R.computeVertexNormals();
  // the hull source: all three, merged by position inside hullGeometry
  const all = [A, B, R].map(g => g.index ? g.toNonIndexed() : g); const hp = []; for (const g of all) hp.push(...g.attributes.position.array);
  const H = new THREE.BufferGeometry(); H.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3));
  return { A, B, R, H };
}

/* ───────────────────────── the two printed sides ───────────────────────── */
function netFrame(net) {
  const b = net.box, pad = 0.12; const u0 = b.u0 - pad, v0 = b.v0 - pad, su = TEX / (b.u1 - b.u0 + 2 * pad), sv = TEX / (b.v1 - b.v0 + 2 * pad);
  return { toPx: (u, v) => [(u - u0) * su, (v - v0) * sv], s: Math.min(su, sv), su, sv, u0, v0,
    uv: (u, v) => [(u - u0) * su / TEX, 1 - (v - v0) * sv / TEX] };
}
/** is the canvas, as drawn in net coordinates, seen from side A? (decides which side's lettering is mirrored) */
function canvasSeesA(P, net, tris) {
  const t = tris.find(x => x.panel === 'wing L'); const p = t.tri.map(k => net.pts[k]);
  const cz = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]);
  return cz < 0;                                    // y-down canvas: negative = visually counter-clockwise = the A winding
}
const FONT = '"Bangers", Impact, "Arial Black", sans-serif';
function sideATexture(net, F, mirror) {
  const U = net.pts, ink = PALETTE.ink;
  return canvasTexture(TEX, TEX, (ctx) => {
    ctx.fillStyle = PALETTE.stock; ctx.fillRect(0, 0, TEX, TEX);
    const px = (u, v) => F.toPx(u, v), S = F.s;
    // crease memory: two old folds per wing, radiating from the nose, 35 % ink
    ctx.strokeStyle = ink; ctx.globalAlpha = 0.35; ctx.lineWidth = 0.025 * S; ctx.lineCap = 'round';
    for (const sd of ['L', 'R']) for (const f of [0.34, 0.68]) {
      const R = U['R' + sd], Ft = U['Ft' + sd]; const e = [R[0] + (Ft[0] - R[0]) * f, R[1] + (Ft[1] - R[1]) * f];
      const a = px(e[0] * 0.10, e[1] * 0.10), b = px(e[0] * 0.965, e[1] * 0.965); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // the folio roundel on the left wing: magenta disc, ink ring, a stock "1" outlined in ink
    const cen = px(U.RL[0] < 0 ? -1.72 : 1.72, 5.6), r = 0.66 * S;   // net u < 0 is the left side (pageOneNet)
    ctx.fillStyle = PALETTE.magenta; ctx.beginPath(); ctx.arc(cen[0], cen[1], r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 0.07 * S; ctx.strokeStyle = ink; ctx.stroke();
    ctx.save(); ctx.translate(cen[0], cen[1]); if (mirror) ctx.scale(-1, 1);
    ctx.font = `${Math.round(1.05 * S)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 0.09 * S; ctx.strokeStyle = ink; ctx.strokeText('1', 0, 0.04 * S); ctx.fillStyle = PALETTE.stock; ctx.fillText('1', 0, 0.04 * S);
    ctx.restore();
    // registration target on the right wing: circle and cross, ink
    const rc = px(U.RR[0] > 0 ? 1.58 : -1.58, 6.35), rr = 0.26 * S; ctx.lineWidth = 0.035 * S; ctx.strokeStyle = ink;
    ctx.beginPath(); ctx.arc(rc[0], rc[1], rr, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rc[0] - rr * 1.5, rc[1]); ctx.lineTo(rc[0] + rr * 1.5, rc[1]); ctx.moveTo(rc[0], rc[1] - rr * 1.5); ctx.lineTo(rc[0], rc[1] + rr * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(rc[0], rc[1], rr * 0.45, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill();
  });
}
function sideBTexture(net, F, mirror) {
  const ink = PALETTE.ink, C = PALETTE;
  return canvasTexture(TEX, TEX, (ctx) => {
    const S = F.s, px = (u, v) => F.toPx(u, v);
    ctx.fillStyle = C.stock; ctx.fillRect(0, 0, TEX, TEX);
    const g = 0.11;                                  // gutter, u
    // the page is laid out by what each region becomes when folded (see the net): winglet | wing underside | keel || keel | wing underside | winglet
    const COLS = [
      { u: [-4.2, -2.75], tiers: [[4.4, 7.6, C.yellow, 'starL']] },
      { u: [-2.75, -0.95], tiers: [[-0.2, 4.2, C.yellow, 'burst'], [4.2, 7.6, C.cyan, 'balloon']] },
      { u: [-0.95, 0], tiers: [[-0.2, 2.55, C.cyan, ''], [2.55, 5.0, C.yellow, ''], [5.0, 7.6, C.magenta, 'zoom']] },
      { u: [0, 0.95], tiers: [[-0.2, 2.55, C.yellow, ''], [2.55, 5.0, C.magenta, ''], [5.0, 7.6, C.cyan, 'pow']] },
      { u: [0.95, 2.75], tiers: [[-0.2, 4.2, C.magenta, 'speed'], [4.2, 7.6, C.ultramarine, 'moon']] },
      { u: [2.75, 4.2], tiers: [[4.4, 7.6, C.cyan, 'starR']] },
    ];
    const lettering = (text, u, v, size, fill, rot = 0) => { const p = px(u, v); ctx.save(); ctx.translate(p[0], p[1]); if (mirror) ctx.scale(-1, 1); ctx.rotate(rot);
      ctx.font = `${Math.round(size * S)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.18 * S; ctx.strokeStyle = ink; ctx.strokeText(text, 0, 0); ctx.fillStyle = fill; ctx.fillText(text, 0, 0); ctx.restore(); };
    const star = (u, v, r0, r1, n, fill) => { ctx.beginPath(); const p = px(u, v); for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, r = (i % 2 ? r0 : r1) * S; ctx.lineTo(p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r); } ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 0.045 * S; ctx.strokeStyle = ink; ctx.stroke(); };
    const art = {
      starL: () => star(-3.2, 6.3, 0.12, 0.3, 5, C.stock),
      starR: () => star(3.2, 6.3, 0.12, 0.3, 5, C.stock),
      burst: () => star(-1.5, 3.65, 0.24, 0.5, 11, C.stock),
      balloon: () => { const b = px(-1.85, 6.0); ctx.fillStyle = C.stock; ctx.strokeStyle = ink; ctx.lineWidth = 0.045 * S;
        ctx.beginPath(); ctx.ellipse(b[0], b[1], 0.78 * S, 0.44 * S, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b[0] + 0.1 * S, b[1] + 0.4 * S); ctx.lineTo(b[0] + 0.42 * S, b[1] + 0.8 * S); ctx.lineTo(b[0] + 0.36 * S, b[1] + 0.36 * S); ctx.fill(); ctx.stroke();
        ctx.fillRect(b[0] + 0.05 * S, b[1] + 0.3 * S, 0.34 * S, 0.1 * S); lettering('FLY!', -1.85, 6.0, 0.42, C.magenta); },
      zoom: () => lettering('ZOOM!', -0.37, 6.05, 0.46, C.stock, Math.PI / 2),
      pow: () => lettering('POW!', 0.37, 6.05, 0.46, C.yellow, -Math.PI / 2),
      speed: () => { const o = px(1.5, 3.6); ctx.strokeStyle = C.stock; ctx.lineCap = 'round';
        for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, r0 = 0.3 * S, r1 = (1.1 + (i % 3) * 0.4) * S; ctx.lineWidth = (0.04 + (i % 2) * 0.04) * S; ctx.beginPath(); ctx.moveTo(o[0] + Math.cos(a) * r0, o[1] + Math.sin(a) * r0); ctx.lineTo(o[0] + Math.cos(a) * r1, o[1] + Math.sin(a) * r1); ctx.stroke(); } },
      moon: () => { const m = px(1.85, 6.0); ctx.fillStyle = C.yellow; ctx.strokeStyle = ink; ctx.lineWidth = 0.045 * S;
        ctx.beginPath(); ctx.arc(m[0], m[1], 0.45 * S, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.ultramarine; ctx.beginPath(); ctx.arc(m[0] + 0.22 * S, m[1] - 0.1 * S, 0.4 * S, 0, Math.PI * 2); ctx.fill();
        for (const [du, dv] of [[0.55, 0.45], [-0.55, -0.4], [-0.4, 0.55]]) star(1.85 + du, 6.0 + dv, 0.05, 0.13, 5, C.yellow); },
    };
    for (const col of COLS) for (const [v0, v1, fill, what] of col.tiers) {
      const a = px(col.u[0] + g / 2, v0 + g / 2), b = px(col.u[1] - g / 2, v1 - g / 2); const [x, y, w, h] = [a[0], a[1], b[0] - a[0], b[1] - a[1]];
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); if (art[what]) art[what](); ctx.restore();
      ctx.lineWidth = 0.05 * S; ctx.strokeStyle = ink; ctx.strokeRect(x, y, w, h);
    }
  });
}

/* ───────────────────────── the plane ───────────────────────── */
export function buildPaperPlane(world, o = {}) {
  const P = pageOnePoints(), TR = pageOneTriangles(P), NET = pageOneNet(P), F = netFrame(NET);
  const seesA = canvasSeesA(P, NET, TR);
  const texA = sideATexture(NET, F, !seesA), texB = sideBTexture(NET, F, seesA);
  for (const t of [texA, texB]) { t.anisotropy = 8; t.needsUpdate = true; }
  const flat = !o.smooth;
  const stock = new ComicMaterial(Object.assign({ world, color: PALETTE.stock, map: texA, flat }, HERO_MAT));
  const print = new ComicMaterial(Object.assign({ world, color: PALETTE.stock, map: texB, flat }, HERO_MAT));
  const hullMat = o.hullMat || new HullMaterial({ world, fog: false });
  const uvOf = k => F.uv(NET.pts[k][0], NET.pts[k][1]);

  const g = new THREE.Group(); g.name = 'page-one';
  const parts = {};
  let seed = o.seed ?? 21;
  const E = o.explode === true ? 1 : (o.explode || 0);
  if (E) {                                            // piece by piece: the six panels apart, each a closed shell with its own hull
    const panels = [], off = n => EXPLODE[n].map(v => v * E);
    for (const pn of PANELS) {
      const sh = shellGeometries(TR.filter(x => x.panel === pn.name), P, uvOf, PAGE_ONE.thickness, [0, 0, 0], flat);
      const holder = new THREE.Group(); holder.name = pn.name; holder.position.fromArray(off(pn.name));
      const a = new THREE.Mesh(sh.A, stock), b = new THREE.Mesh(sh.B, print), r = new THREE.Mesh(sh.R, stock);
      const hull = new THREE.Mesh(hullGeometry(sh.H, seed++), hullMat); hull.name = pn.name + '-ink'; hull.userData.isHull = true;
      holder.add(a, b, r, hull); g.add(holder);
      const c = pn.v.reduce((s, k) => s.map((v, i) => v + P[k][i] / pn.v.length), [0, 0, 0]).map((v, i) => v + off(pn.name)[i]);
      panels.push({ name: pn.name, holder, centroid: c });
    }
    const foldMat = new ComicMaterial({ world, unlit: true, color: PALETTE.magenta, inkWeight: 0, fog: false });
    const folds = [];
    for (const f of FOLDS) {                          // a fold: dashes from its edge on one panel to the same edge on the other
      const mid = P[f.a].map((v, i) => (v + P[f.b][i]) / 2), m1 = mid.map((v, i) => v + off(f.panels[0])[i]), m2 = mid.map((v, i) => v + off(f.panels[1])[i]);
      const A = new THREE.Vector3(...m1), B = new THREE.Vector3(...m2), L = A.distanceTo(B), n = Math.max(3, Math.round(L / 0.34));
      for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 0.55) / n; const d = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, L * (t1 - t0)), foldMat);
        d.position.lerpVectors(A, B, (t0 + t1) / 2); d.lookAt(B); d.userData.noInk = true; d.name = 'fold-dash'; g.add(d); }
      folds.push({ name: f.name, a: m1, b: m2, mid: m1.map((v, i) => (v + m2[i]) / 2) });
    }
    g.userData = { panels, folds, materials: { stock, print }, textures: { a: texA, b: texB }, points: P, net: NET, frame: F, seesA, dashes: [], parts: {}, update() {} };
    return g;
  }
  for (const part of ['body', 'wingletL', 'wingletR']) {
    const tris = TR.filter(x => x.part === part);
    const pivot = part === 'body' ? [0, 0, 0] : P['Fle' + part.slice(-1)];
    const sh = shellGeometries(tris, P, uvOf, PAGE_ONE.thickness, pivot, flat);
    const holder = new THREE.Group(); holder.name = part; holder.position.fromArray(pivot);
    const a = new THREE.Mesh(sh.A, stock), b = new THREE.Mesh(sh.B, print), r = new THREE.Mesh(sh.R, stock);
    a.name = part + '-A'; b.name = part + '-B'; r.name = part + '-rim';
    const hull = new THREE.Mesh(hullGeometry(sh.H, seed++), hullMat); hull.name = part + '-ink'; hull.userData.isHull = true;
    holder.add(a, b, r, hull);
    if (part !== 'body') { const sd = part.slice(-1); const ax = new THREE.Vector3().fromArray(P['Ft' + sd]).sub(new THREE.Vector3().fromArray(P['Fle' + sd])).normalize(); holder.userData.axis = ax; holder.userData.sign = sd === 'L' ? 1 : -1; }
    g.add(holder); parts[part] = holder;
  }

  // motion dashes: three unlit ink strokes trailing each winglet tip
  const dashMat = new ComicMaterial({ world, unlit: true, color: PALETTE.ink, inkWeight: 0, fog: false });
  const dashGeo = new THREE.BoxGeometry(MOTION.lines.width, MOTION.lines.width, 1).translate(0, 0, 0.5);
  const dashes = [];
  for (const sd of ['L', 'R']) for (let i = 0; i < MOTION.lines.count; i++) {
    const m = new THREE.Mesh(dashGeo, dashMat); m.name = 'dash'; m.userData.noInk = true; m.userData.sd = sd; m.userData.i = i;
    m.userData.base = new THREE.Vector3().fromArray(P['T' + sd]); g.add(m); dashes.push(m);
  }

  const q = new THREE.Quaternion();
  g.userData = {
    parts, dashes, materials: { stock, print }, textures: { a: texA, b: texB }, points: P, net: NET, frame: F, seesA,
    /** t seconds, t12 on twos, boost 0..1 */
    update(t, t12, boost = 0) {
      const amp = (MOTION.flutterDeg + (MOTION.flutterBoostDeg - MOTION.flutterDeg) * boost) * Math.PI / 180;
      for (const k of ['wingletL', 'wingletR']) { const h = parts[k]; const ph = k === 'wingletL' ? 0 : 1.7;
        const a = amp * Math.sin(t12 * MOTION.flutterHz * Math.PI * 2 + ph); h.quaternion.copy(q.setFromAxisAngle(h.userData.axis, a * h.userData.sign)); }
      const L = MOTION.lines.len + (MOTION.lines.lenBoost - MOTION.lines.len) * boost;
      for (const d of dashes) { const i = d.userData.i, j = Math.floor(t12 * 12 + i * 5 + (d.userData.sd === 'L' ? 0 : 3)) % 4;
        const off = [[0.12, 0.05], [-0.1, -0.08], [0.02, 0.14], [-0.05, -0.02]][(j + i) % 4];
        d.position.copy(d.userData.base).add(new THREE.Vector3(off[0] * (d.userData.sd === 'L' ? -1 : 1), -0.25 * i + off[1], 0.35 + i * (L * 0.35 + MOTION.lines.gap)));
        d.scale.set(1, 1, L * (1 - i * 0.22) * (0.85 + 0.15 * ((j + i) % 2))); }
    },
  };
  g.userData.update(0, 0, 0);
  return g;
}
export { PAGE_ONE };
