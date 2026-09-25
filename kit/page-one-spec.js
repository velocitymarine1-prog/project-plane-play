/* page-one-spec.js — PAGE ONE, the reference paper dart of the COMIC 3D house style · 23 September 2026
 *
 * Pure numbers and pure geometry: no Three.js, no DOM. The 3D build (kit/paper-plane.js), the flyable page
 * (paper-plane.html) and the reference sheet (page-one/sheet.html) all read this one file, so the model,
 * the picture and the documentation cannot drift apart. Change a number here and all three follow.
 *
 * Axes: x right (the plane's right wing), y up, nose toward −z. 1 u ≈ 4 cm of real paper.
 */

/* ───────────────────────── the eight numbers the whole model follows from ───────────────────────── */
export const PAGE_ONE = {
  length: 7.2,          // nose at z = −3.6, tail at z = +3.6
  halfSpan: 2.88,       // wing tip at the tail, before the winglet fold (span : length = 0.8)
  dihedralDeg: 8,       // wings rise outward
  keelDepth: 0.90,      // keel bottom below the wing root, at the tail
  keelGap: 0.16,        // the keel's V: layers this far apart at the root, touching at the bottom fold
  wingletAt: 2.20,      // winglet fold line at |x| = 2.2 (plan view, parallel to the centreline)
  wingletUpDeg: 74,     // winglet folded up from the wing plane
  thickness: 0.035,     // card stock; the shell is closed so the ink hull has something to wrap
};

/* ───────────────────────── palette: ≤ 7 base hues, ink derived, one wrong colour ───────────────────────── */
export const PALETTE = {
  stock:       '#fdf8ee',   // side A, the outside of the sheet
  page:        '#fffaf2',   // the drafting-table page (the world's ground)
  cyan:        '#2bb3e6',   // process cyan
  magenta:     '#ef4c95',   // process magenta (the folio "1")
  yellow:      '#ffd23f',   // process yellow (pencils)
  ultramarine: '#4a58b0',   // the darkest mid-value hue: the ink is derived from it
  wood:        '#e9b98a',
  steel:       '#8fa3b8',
  ink:         '#0d0d2b',   // = ink(ultramarine): shade(L −0.38, H +8°, S +0.12). Never #000.
  wrong:       '#c8ff2e',   // THE wrong colour: one fluorescent highlighter on the page
};

/* ───────────────────────── the reference world: the Drafting Table ───────────────────────── */
export const DESK_WORLD = {
  name: 'desk', ink: PALETTE.ink, horizon: '#e6f5fa',
  lightDir: [-0.42, 0.80, 0.42], lightCol: '#fff3dc', shadowTint: '#3b3f8f',
  fillDir: [0.1, -0.9, 0.3], fillCol: '#95d6ec', rimCol: '#bfe9ff',   // fill = the page's printed cyan bouncing up (a warm fill over the navy deep went to mud, proof r1)
  fogStart: 60, fogEnd: 340, fogMax: 0.85,
  sky: ['#5cc3ef', '#9fdaf5', '#cfeefa', '#e6f5fa'], skyEdges: [0.04, 0.14, 0.34],
  paper: '#fffaf2',
};

/* the hero material numbers (both sides of the sheet) */
export const HERO_MAT = { inkWeight: 1.0, hatch: 1, fillAmt: 0.45, rim: 0.5, keyMix: 0.35, spec: 0, fog: false };

/* motion: pose on twos comes from the kit's LAW.ship; these are PAGE ONE's own */
export const MOTION = {
  flutterDeg: 4, flutterBoostDeg: 9, flutterHz: 3,     // winglets waggle on twos
  gustNoseDeg: 6,                                      // boost lifts the nose
  lines: { count: 3, len: 0.8, lenBoost: 2.0, gap: 0.4, width: 0.032 },   // motion dashes behind each winglet tip
  restNoseDownDeg: 5,                                  // in flight the nose sits 5° down so the drone sees the back
};

/* ───────────────────────── the seven canonical angles ─────────────────────────
 * yaw: 0 = behind (+z), 90 = the plane's right, −90 = its left, 180 = in front. el: degrees above.
 * dist in u from the target, fov vertical degrees, aim = where the camera looks, offset from the plane's origin. CHASE is the drone law (kit LAW.camera), not a fixed camera. */
export const CANON_VIEWS = [
  { n: 1, key: 'chase', name: 'CHASE',     note: 'the drone: 10.5 back, 5 up, 62° FOV. What the player sees.' },
  { n: 2, key: 'judge', name: 'JUDGE 3/4', yaw: -40, el: 24, dist: 15, fov: 32, aim: [0.9, -0.2, 1.3], note: 'behind-left, above: the model-sheet hero' },
  { n: 3, key: 'side',  name: 'SIDE',      yaw: -90, el: 0,  dist: 23, fov: 18, note: 'from the left, level, telephoto (near-orthographic)' },
  { n: 4, key: 'front', name: 'FRONT',     yaw: 180, el: 4,  dist: 19, fov: 18, note: 'nose-on, a touch above' },
  { n: 5, key: 'top',   name: 'TOP',       yaw: 0,   el: 90, dist: 31, fov: 18, note: 'straight down, nose up the frame' },
  { n: 6, key: 'rear',  name: 'REAR',      yaw: 0,   el: 8,  dist: 19, fov: 18, note: 'tail-on, a touch above' },
  { n: 7, key: 'low',   name: 'LOW HERO',  yaw: 150, el: -18, dist: 8.5, fov: 50, aim: [0, 0, -0.6], note: 'below and ahead, looking up past the nose: the splash-page angle' },
];

/* ───────────────────────── geometry (pure) ───────────────────────── */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => mul(a, 1 / (len(a) || 1));
const lerp3 = (a, b, t) => add(a, mul(sub(b, a), t));
function rotAbout(p, a, k, th) {           // Rodrigues: rotate p about the axis through a along unit k
  const v = sub(p, a), c = Math.cos(th), s = Math.sin(th);
  return add(a, add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c))));
}

/** pageOnePoints(spec) → the eleven named vertices. N nose, K keel bottom (tail), R root, Fle/Ft winglet fold
 *  at the leading and trailing edge, T winglet tip; suffix L/R for the left/right side. */
export function pageOnePoints(S = PAGE_ONE) {
  const zt = S.length / 2, g = S.keelGap / 2, td = Math.tan(S.dihedralDeg * Math.PI / 180);
  const P = { N: [0, 0, -zt], K: [0, -S.keelDepth, zt] };
  for (const [sd, sx] of [['L', -1], ['R', 1]]) {
    const R = [sx * g, 0, zt];
    const T0 = [sx * S.halfSpan, (S.halfSpan - g) * td, zt];              // tip before the winglet fold
    const Ft = [sx * S.wingletAt, (S.wingletAt - g) * td, zt];
    const Fle = lerp3(P.N, T0, S.wingletAt / S.halfSpan);                 // where the fold line meets the leading edge
    const k = norm(sub(Ft, Fle)); const th = S.wingletUpDeg * Math.PI / 180;
    const up = rotAbout(T0, Fle, k, th), dn = rotAbout(T0, Fle, k, -th);
    P['R' + sd] = R; P['Ft' + sd] = Ft; P['Fle' + sd] = Fle; P['T' + sd] = up[1] > dn[1] ? up : dn;
  }
  for (const k in P) P[k] = P[k].map(v => Math.round(v * 1e5) / 1e5);
  return P;
}

/** the panels of the sheet. Each is a list of vertex names; `a` is the direction side A (the plain outside of
 *  the page) faces, used to wind every triangle so its normal points out of side A. `part` groups panels into
 *  the three rigid pieces (body, winglet L, winglet R) so the winglets can flutter. */
export const PANELS = [
  { name: 'wing L',    part: 'body',     v: ['N', 'RL', 'FtL', 'FleL'], a: [0, 1, 0] },
  { name: 'wing R',    part: 'body',     v: ['N', 'RR', 'FtR', 'FleR'], a: [0, 1, 0] },
  { name: 'keel L',    part: 'body',     v: ['N', 'K', 'RL'],           a: [1, 0, 0] },
  { name: 'keel R',    part: 'body',     v: ['N', 'K', 'RR'],           a: [-1, 0, 0] },
  { name: 'winglet L', part: 'wingletL', v: ['FleL', 'FtL', 'TL'],      a: [1, 0, 0] },
  { name: 'winglet R', part: 'wingletR', v: ['FleR', 'FtR', 'TR'],      a: [-1, 0, 0] },
];
/** the fold lines, with the angle between the neighbouring panels' normals (inked if ≥ 50°, the hero crease law) */
export const FOLDS = [
  { name: 'wing root L', a: 'N', b: 'RL', panels: ['wing L', 'keel L'] },
  { name: 'wing root R', a: 'N', b: 'RR', panels: ['wing R', 'keel R'] },
  { name: 'keel fold',   a: 'N', b: 'K',  panels: ['keel L', 'keel R'] },
  { name: 'winglet L',   a: 'FleL', b: 'FtL', panels: ['wing L', 'winglet L'] },
  { name: 'winglet R',   a: 'FleR', b: 'FtR', panels: ['wing R', 'winglet R'] },
];

/** the exploded view (24 Sep 2026, the style book): each panel floated off along its own direction, in u, at explode = 1
 *  (left panels left, right panels right, wings up, keels down, winglets above their wings). Found by a layout search at
 *  the JUDGE angle (1000 × 1000, the exploded distance): every panel clears the others by ≥ 18 px and every name label
 *  clears the other labels and panels. */
export const EXPLODE = {
  'wing L': [-1.45, 0.8, 0], 'wing R': [1.0, 1.0, 0], 'keel L': [-1.05, -1.65, 0], 'keel R': [1.75, -1.15, 1.45],
  'winglet L': [-1.6, 2.85, 0.4], 'winglet R': [1.65, 3.1, -0.85],
};

/** triangles wound so the normal points out of side A. Returns [{panel, part, tri:[names], n:[x,y,z]}] */
export function pageOneTriangles(P = pageOnePoints()) {
  const out = [];
  for (const pn of PANELS) {
    const v = pn.v, tris = v.length === 3 ? [[v[0], v[1], v[2]]] : [[v[0], v[1], v[2]], [v[0], v[2], v[3]]];
    for (let t of tris) {
      let n = norm(cross(sub(P[t[1]], P[t[0]]), sub(P[t[2]], P[t[0]])));
      if (dot(n, pn.a) < 0) { t = [t[0], t[2], t[1]]; n = mul(n, -1); }
      out.push({ panel: pn.name, part: pn.part, tri: t, n });
    }
  }
  return out;
}
export function panelNormal(name, P = pageOnePoints()) { return pageOneTriangles(P).find(t => t.panel === name).n; }
export function foldAngles(P = pageOnePoints()) {
  return FOLDS.map(f => { const a = panelNormal(f.panels[0], P), b = panelNormal(f.panels[1], P);
    return Object.assign({}, f, { deg: Math.round(Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 180 / Math.PI) }); });
}

/** the unfolded sheet: 2D (u across, v from the nose toward the tail) for every vertex, per side. The keel fold is
 *  the page's centre line (u = 0). Used for the texture UVs and for the fold diagram. */
export function pageOneNet(P = pageOnePoints()) {
  const d = (a, b) => len(sub(P[a], P[b]));
  const place = (A, B, dA, dB, C) => {                  // the point at dA from A and dB from B, on the far side of AB from C
    const ab = [B[0] - A[0], B[1] - A[1]], L = Math.hypot(ab[0], ab[1]); const ex = [ab[0] / L, ab[1] / L], ey = [-ex[1], ex[0]];
    const x = (dA * dA - dB * dB + L * L) / (2 * L), y = Math.sqrt(Math.max(0, dA * dA - x * x));
    const c = [C[0] - A[0], C[1] - A[1]]; const sideC = Math.sign(c[0] * ey[0] + c[1] * ey[1]) || 1;
    return [A[0] + ex[0] * x - ey[0] * y * sideC, A[1] + ex[1] * x - ey[1] * y * sideC];
  };
  const U = { N: [0, 0], K: [0, d('N', 'K')] };
  for (const [sd, sx] of [['L', -1], ['R', 1]]) {
    const R = place(U.N, U.K, d('N', 'R' + sd), d('K', 'R' + sd), [-sx, 0]);   // keel on its own side of the centre line
    const Ft = place(U.N, R, d('N', 'Ft' + sd), d('R' + sd, 'Ft' + sd), U.K);
    const Fle = place(U.N, Ft, d('N', 'Fle' + sd), d('Ft' + sd, 'Fle' + sd), R);
    const T = place(Fle, Ft, d('Fle' + sd, 'T' + sd), d('Ft' + sd, 'T' + sd), U.N);
    Object.assign(U, { ['R' + sd]: R, ['Ft' + sd]: Ft, ['Fle' + sd]: Fle, ['T' + sd]: T });
  }
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (const k in U) { u0 = Math.min(u0, U[k][0]); u1 = Math.max(u1, U[k][0]); v0 = Math.min(v0, U[k][1]); v1 = Math.max(v1, U[k][1]); }
  for (const k in U) U[k] = U[k].map(v => Math.round(v * 1e5) / 1e5);
  return { pts: U, box: { u0, u1, v0, v1 } };
}

/** where a camera sits for a canonical view, relative to a target point */
export function viewCamera(view, origin = [0, 0, 0]) {
  const a = view.aim || [0, 0, 0], target = [origin[0] + a[0], origin[1] + a[1], origin[2] + a[2]];
  const y = view.yaw * Math.PI / 180, e = view.el * Math.PI / 180;
  const pos = [target[0] + view.dist * Math.sin(y) * Math.cos(e), target[1] + view.dist * Math.sin(e), target[2] + view.dist * Math.cos(y) * Math.cos(e)];
  const up = Math.abs(view.el) > 85 ? [0, 0, -1] : [0, 1, 0];
  return { pos, up, fov: view.fov, target };
}
