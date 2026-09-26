/* game/pieces.js — the pieces the kit does not have, built from its alphabet under the shape law · design passes 1–3, built in pass 4
 *
 * THE HAND · TOASTER · TOAST · the open OVEN DOOR and the OVEN SMOKE · SMOKE ALARM · TRAMPOLINE · SWING SET · SHED · GRILL · THE POOL ·
 * THE PENNANT · BONK MARKS · the LOFT FAN · puff bursts (crumbs, drips, soot). Every piece is built at its own origin (base on y = 0,
 * front toward +z) like the kit's, from kit/parts.js shapes only, with materials by role from the room's kit (K). Motion hooks live on
 * userData: dynamic (never merged), tick(f, t12) on twos, and the piece's own verbs (arm, pop, boing, hop, show, set, burst).
 * Nothing in kit/ is edited: EXTRA is the game's own table beside PIECE.
 */
import { THREE, ComicMaterial, canvasTexture, mix, shade, rng, mulberry32 } from '../kit/comic3d.js';
import { slab, slabB, cushion, cushionB, rod, drum, ring, puff, cutout, dash, glowDrum, glare, bent, PIECE } from '../kit/parts.js';

const TAU = Math.PI * 2;
const unlit = (K, color) => new ComicMaterial({ world: K.world, unlit: true, color, inkWeight: 0, fog: false });
const smokeMat = K => (K._smoke ||= new ComicMaterial({ world: K.world, color: mix(K.pal.ink, K.pal.stock, 0.7), inkWeight: 0.35, hatch: 0, keyMix: 0.7, shadowMul: 0.9, shadowMix: 0.15, fillAmt: 0.1, flat: false }));
const sootMat = K => (K._soot ||= new ComicMaterial({ world: K.world, color: mix(K.pal.ink, K.pal.stock, 0.45), inkWeight: 0.3, hatch: 0, keyMix: 0.5, shadowMul: 0.85, flat: false }));
const glowWarm = K => (K._glowWarm ||= unlit(K, mix(K.pal.tangerine, K.pal.yellow, 0.45)));

/* ───────────── design pass 9: THE PRINTS on the walls, drawn on a canvas with the room's palette (one texture per art and size, cached on the kit) ───────────── */
const FONT = '"Bangers", Impact, "Arial Black", sans-serif';
const A = {   // the 2D helpers: every fill gets its ink line, every letter its ink stroke
  ink(x, P, w) { x.strokeStyle = P.ink; x.lineWidth = w; x.lineJoin = 'round'; x.lineCap = 'round'; },
  poly(x, P, pts, fill, lw = 6) { x.beginPath(); pts.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (lw) { A.ink(x, P, lw); x.stroke(); } },
  disc(x, P, cx, cy, r, fill, lw = 6) { x.beginPath(); x.arc(cx, cy, r, 0, TAU); if (fill) { x.fillStyle = fill; x.fill(); } if (lw) { A.ink(x, P, lw); x.stroke(); } },
  line(x, P, pts, lw = 5, col) { x.beginPath(); pts.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); A.ink(x, P, lw); if (col) x.strokeStyle = col; x.stroke(); },
  letter(x, P, text, cx, cy, px, fill, sw = 0.12, rot = 0) { x.save(); x.translate(cx, cy); x.rotate(rot); x.font = `400 ${px}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = px * sw; x.strokeStyle = P.ink; x.strokeText(text, 0, px * 0.06); x.fillStyle = fill; x.fillText(text, 0, px * 0.06); x.restore(); },
  ground(x, W, H, fill) { x.fillStyle = fill; x.fillRect(0, 0, W, H); },
  sun(x, P, cx, cy, r, rays = 12) { for (let i = 0; i < rays; i++) { const a = i / rays * TAU; A.poly(x, P, [[cx + Math.cos(a - 0.12) * r * 1.15, cy + Math.sin(a - 0.12) * r * 1.15], [cx + Math.cos(a) * r * 1.75, cy + Math.sin(a) * r * 1.75], [cx + Math.cos(a + 0.12) * r * 1.15, cy + Math.sin(a + 0.12) * r * 1.15]], P.yellow, 4); } A.disc(x, P, cx, cy, r, P.yellow); },
  dart(x, P, cx, cy, L, ang, col) { x.save(); x.translate(cx, cy); x.rotate(ang); const n = L / 2; A.poly(x, P, [[n, 0], [-n, -L * 0.34], [-n * 0.55, 0], [-n, L * 0.34]], col || P.stock, 6); A.line(x, P, [[n, 0], [-n * 0.55, 0]], 4); A.poly(x, P, [[-n * 0.55, 0], [-n, L * 0.34], [-n * 0.9, L * 0.06]], P.magenta, 4); x.restore(); },
  speed(x, P, cx, cy, L, ang, n = 3) { for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * L * 0.16; A.line(x, P, [[cx - Math.cos(ang) * L * 0.2 - Math.sin(ang) * o, cy - Math.sin(ang) * L * 0.2 + Math.cos(ang) * o], [cx - Math.cos(ang) * L * (0.55 + (i % 2) * 0.2) - Math.sin(ang) * o, cy - Math.sin(ang) * L * (0.55 + (i % 2) * 0.2) + Math.cos(ang) * o]], 5); } },
  palm(x, P, cx, by, h, col) { A.line(x, P, [[cx, by], [cx + h * 0.06, by - h * 0.5], [cx + h * 0.04, by - h]], h * 0.09, col || P.bark); for (let i = 0; i < 5; i++) { const a = -Math.PI * 0.95 + i * Math.PI * 0.22; A.poly(x, P, [[cx + h * 0.04, by - h], [cx + h * 0.04 + Math.cos(a) * h * 0.42, by - h + Math.sin(a) * h * 0.42 + h * 0.08], [cx + h * 0.04 + Math.cos(a + 0.35) * h * 0.4, by - h + Math.sin(a + 0.35) * h * 0.4 + h * 0.1]], P.hedge, 4); } },
  cloud(x, P, cx, cy, r) { for (const [dx, dy, k] of [[-1, 0.15, 0.8], [0, -0.2, 1], [1, 0.1, 0.85]]) { x.beginPath(); x.arc(cx + dx * r, cy + dy * r, r * k, 0, TAU); x.fillStyle = P.stock; x.fill(); } A.ink(x, P, 5); x.beginPath(); x.arc(cx - r, cy + r * 0.15, r * 0.8, Math.PI * 0.5, Math.PI * 1.55); x.arc(cx, cy - r * 0.2, r, Math.PI * 1.15, Math.PI * 1.85); x.arc(cx + r, cy + r * 0.1, r * 0.85, Math.PI * 1.45, Math.PI * 0.5); x.closePath(); x.stroke(); },
  crayon(x, col, pts, lw, r) { x.save(); x.globalAlpha = 0.8; x.strokeStyle = col; x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); pts.forEach((q, i) => { const j = [q[0] + rng(r, -4, 4), q[1] + rng(r, -4, 4)]; i ? x.lineTo(j[0], j[1]) : x.moveTo(j[0], j[1]); }); x.stroke(); x.restore(); },
  heart(x, P, cx, cy, r, fill) { x.beginPath(); x.moveTo(cx, cy + r); x.bezierCurveTo(cx - r * 1.6, cy - r * 0.2, cx - r * 0.7, cy - r * 1.3, cx, cy - r * 0.45); x.bezierCurveTo(cx + r * 0.7, cy - r * 1.3, cx + r * 1.6, cy - r * 0.2, cx, cy + r); x.closePath(); x.fillStyle = fill; x.fill(); A.ink(x, P, 3); x.stroke(); },
  leafShape(x, P, cx, cy, L, ang, fill) { x.save(); x.translate(cx, cy); x.rotate(ang); x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(L * 0.45, -L * 0.42, L * 0.95, -L * 0.25, L, 0); x.bezierCurveTo(L * 0.95, L * 0.25, L * 0.45, L * 0.42, 0, 0); x.closePath(); x.fillStyle = fill; x.fill(); A.ink(x, P, 4); x.stroke(); A.line(x, P, [[L * 0.08, 0], [L * 0.9, 0]], 3); x.restore(); },
  paper(x, P, W, H) { A.ground(x, W, H, '#fbfcf7'); x.strokeStyle = mix(P.cyan, '#ffffff', 0.55); x.lineWidth = 3; for (let y = H * 0.14; y < H; y += H * 0.12) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); } x.strokeStyle = mix(P.magenta, '#ffffff', 0.35); x.lineWidth = 4; x.beginPath(); x.moveTo(W * 0.12, 0); x.lineTo(W * 0.12, H); x.stroke(); },
};
const ARTS = {   // (x, W, H, P): the context, the canvas, the palette. Each art is one motif in flat colour and ink line, no dots (the surfaces rule)
  plane(x, W, H, P) { A.ground(x, W, H, mix(P.cyan, P.stock, 0.4)); A.sun(x, P, W * 0.8, H * 0.22, W * 0.1); A.cloud(x, P, W * 0.25, H * 0.25, W * 0.07); A.speed(x, P, W * 0.45, H * 0.6, W * 0.5, -0.35); A.dart(x, P, W * 0.5, H * 0.58, W * 0.42, -0.35); },
  house(x, W, H, P) { A.ground(x, W, H, mix(P.cyan, P.stock, 0.45)); x.fillStyle = P.lawn; x.fillRect(0, H * 0.72, W, H * 0.28); A.line(x, P, [[0, H * 0.72], [W, H * 0.72]], 5); A.sun(x, P, W * 0.15, H * 0.18, W * 0.07, 10);
    A.poly(x, P, [[W * 0.32, H * 0.72], [W * 0.32, H * 0.42], [W * 0.82, H * 0.42], [W * 0.82, H * 0.72]], P.stucco); A.poly(x, P, [[W * 0.28, H * 0.42], [W * 0.57, H * 0.24], [W * 0.86, H * 0.42]], P.paver);
    A.poly(x, P, [[W * 0.51, H * 0.72], [W * 0.51, H * 0.52], [W * 0.63, H * 0.52], [W * 0.63, H * 0.72]], P.cobalt, 5); A.poly(x, P, [[W * 0.37, H * 0.5], [W * 0.46, H * 0.5], [W * 0.46, H * 0.6], [W * 0.37, H * 0.6]], P.cyan, 4); A.poly(x, P, [[W * 0.68, H * 0.5], [W * 0.77, H * 0.5], [W * 0.77, H * 0.6], [W * 0.68, H * 0.6]], P.cyan, 4);
    A.palm(x, P, W * 0.14, H * 0.74, H * 0.36); },
  sun(x, W, H, P) { A.ground(x, W, H, P.cyan); A.sun(x, P, W / 2, H / 2, Math.min(W, H) * 0.24, 14); A.disc(x, P, W * 0.44, H * 0.47, W * 0.02, P.ink, 0); A.disc(x, P, W * 0.56, H * 0.47, W * 0.02, P.ink, 0); x.beginPath(); x.arc(W / 2, H * 0.5, W * 0.09, 0.3, Math.PI - 0.3); A.ink(x, P, 5); x.stroke(); },
  cover(x, W, H, P) { A.ground(x, W, H, P.cobalt); const cx = W / 2, cy = H * 0.58, R = W * 0.44; x.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = i % 2 ? R * 0.62 : R; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9); } x.closePath(); x.fillStyle = P.yellow; x.fill(); A.ink(x, P, 6); x.stroke();
    A.speed(x, P, cx, cy + H * 0.02, W * 0.5, -0.5); A.dart(x, P, cx, cy, W * 0.4, -0.5); A.letter(x, P, 'PAGE ONE', cx, H * 0.15, W * 0.2, P.stock); A.disc(x, P, W * 0.12, H * 0.9, W * 0.07, P.magenta, 5); A.letter(x, P, '1', W * 0.12, H * 0.9, W * 0.09, P.stock, 0.14); A.letter(x, P, 'THE HOUSE IN ONE!', W * 0.6, H * 0.9, W * 0.09, P.yellow); },
  cardinal(x, W, H, P) { A.ground(x, W, H, P.stock); A.line(x, P, [[0, H * 0.7], [W * 0.5, H * 0.62], [W, H * 0.68]], 12, P.bark); for (const [u, v] of [[0.2, 0.62], [0.75, 0.6]]) A.poly(x, P, [[W * u, H * v], [W * (u + 0.08), H * (v - 0.12)], [W * (u + 0.16), H * v]], P.hedge, 4);
    A.disc(x, P, W * 0.5, H * 0.45, W * 0.15, P.red); A.poly(x, P, [[W * 0.62, H * 0.35], [W * 0.66, H * 0.2], [W * 0.56, H * 0.32]], P.red, 5); A.poly(x, P, [[W * 0.62, H * 0.45], [W * 0.72, H * 0.47], [W * 0.62, H * 0.5]], P.tangerine, 4); A.disc(x, P, W * 0.58, H * 0.42, W * 0.02, P.ink, 0); A.poly(x, P, [[W * 0.36, H * 0.5], [W * 0.2, H * 0.44], [W * 0.38, H * 0.4]], P.red, 5); },
  boat(x, W, H, P) { A.ground(x, W, H, mix(P.cyan, P.stock, 0.5)); x.fillStyle = P.cyan; x.fillRect(0, H * 0.62, W, H * 0.38); A.line(x, P, [[0, H * 0.62], [W, H * 0.62]], 5); for (const u of [0.15, 0.45, 0.75]) A.line(x, P, [[W * u, H * 0.8], [W * (u + 0.05), H * 0.76], [W * (u + 0.1), H * 0.8]], 5, P.stock);
    A.poly(x, P, [[W * 0.2, H * 0.58], [W * 0.8, H * 0.58], [W * 0.68, H * 0.72], [W * 0.32, H * 0.72]], P.stock); A.poly(x, P, [[W * 0.35, H * 0.58], [W * 0.5, H * 0.3], [W * 0.65, H * 0.58]], P.stock); A.line(x, P, [[W * 0.5, H * 0.3], [W * 0.5, H * 0.58]], 4); A.sun(x, P, W * 0.82, H * 0.2, W * 0.08, 10); },
  palm(x, W, H, P) { A.ground(x, W, H, P.tangerine); x.fillStyle = P.yellow; x.fillRect(0, H * 0.45, W, H * 0.25); A.line(x, P, [[0, H * 0.45], [W, H * 0.45]], 4); A.disc(x, P, W * 0.62, H * 0.7, W * 0.16, P.yellow, 6); x.fillStyle = P.cyan; x.fillRect(0, H * 0.7, W, H * 0.3); A.line(x, P, [[0, H * 0.7], [W, H * 0.7]], 6); A.palm(x, P, W * 0.25, H * 0.72, H * 0.6, P.ink); },
  pie(x, W, H, P) { A.ground(x, W, H, P.magenta); x.save(); x.translate(W / 2, H * 0.6); x.scale(1, 0.55); A.disc(x, P, 0, H * 0.12, W * 0.42, P.stock); x.restore(); x.save(); x.translate(W / 2, H * 0.52); x.scale(1, 0.6); A.disc(x, P, 0, 0, W * 0.34, P.tangerine); x.restore();
    for (let i = -2; i <= 2; i++) { A.line(x, P, [[W / 2 + i * W * 0.11, H * 0.32], [W / 2 + i * W * 0.11, H * 0.72]], 4); A.line(x, P, [[W * 0.16, H * 0.52 + i * H * 0.07], [W * 0.84, H * 0.52 + i * H * 0.07]], 4); } for (const u of [0.38, 0.5, 0.62]) A.line(x, P, [[W * u, H * 0.3], [W * (u + 0.03), H * 0.22], [W * (u - 0.02), H * 0.14], [W * (u + 0.02), H * 0.07]], 5, P.stock); },
  toast(x, W, H, P) { A.ground(x, W, H, P.cyan); const c = mix(P.yellow, P.ink, 0.3); x.beginPath(); x.moveTo(W * 0.24, H * 0.42); x.arc(W * 0.38, H * 0.38, W * 0.15, Math.PI, Math.PI * 1.7); x.arc(W * 0.62, H * 0.38, W * 0.15, Math.PI * 1.3, TAU); x.lineTo(W * 0.76, H * 0.82); x.lineTo(W * 0.24, H * 0.82); x.closePath(); x.fillStyle = c; x.fill(); A.ink(x, P, 7); x.stroke();
    A.disc(x, P, W * 0.4, H * 0.52, W * 0.025, P.ink, 0); A.disc(x, P, W * 0.6, H * 0.52, W * 0.025, P.ink, 0); x.beginPath(); x.arc(W * 0.5, H * 0.58, W * 0.1, 0.3, Math.PI - 0.3); A.ink(x, P, 6); x.stroke(); A.letter(x, P, 'POP!', W * 0.78, H * 0.16, W * 0.18, P.stock, 0.12, 0.15); for (const u of [0.35, 0.5, 0.65]) A.line(x, P, [[W * u, H * 0.86], [W * u, H * 0.95]], 5); },
  menu(x, W, H, P) { A.ground(x, W, H, P.rubber); x.strokeStyle = P.oak; x.lineWidth = 16; x.strokeRect(8, 8, W - 16, H - 16); A.letter(x, P, 'TODAY:', W / 2, H * 0.26, W * 0.16, P.stock, 0.02); A.letter(x, P, 'PIE!', W / 2, H * 0.52, W * 0.3, P.yellow, 0.03);
    x.strokeStyle = P.stock; x.lineWidth = 5; x.beginPath(); x.ellipse(W / 2, H * 0.8, W * 0.2, H * 0.07, 0, 0, TAU); x.stroke(); for (const u of [0.42, 0.5, 0.58]) { x.beginPath(); x.moveTo(W * u, H * 0.72); x.quadraticCurveTo(W * (u + 0.03), H * 0.66, W * u, H * 0.6); x.stroke(); } },
  calendar(x, W, H, P) { A.ground(x, W, H, P.stock); x.fillStyle = mix(P.cyan, P.stock, 0.4); x.fillRect(0, 0, W, H * 0.5); A.line(x, P, [[0, H * 0.5], [W, H * 0.5]], 5); A.sun(x, P, W * 0.7, H * 0.18, W * 0.08, 10); A.palm(x, P, W * 0.22, H * 0.5, H * 0.34);
    x.fillStyle = P.red; x.fillRect(0, H * 0.5, W, H * 0.1); A.letter(x, P, 'SEPTEMBER', W / 2, H * 0.55, W * 0.11, P.stock, 0.08); A.ink(x, P, 3); for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) x.strokeRect(W * 0.06 + c * W * 0.126, H * 0.64 + r * H * 0.085, W * 0.126, H * 0.085); x.strokeStyle = P.red; x.lineWidth = 6; x.beginPath(); x.ellipse(W * 0.06 + 4.5 * W * 0.126, H * 0.64 + 1.5 * H * 0.085, W * 0.075, H * 0.05, 0, 0, TAU); x.stroke(); },
  wash(x, W, H, P) { A.ground(x, W, H, P.cyan); ['WASH', 'DRY', 'FLY!'].forEach((t, i) => A.letter(x, P, t, W / 2, H * (0.2 + i * 0.26), W * 0.3, [P.stock, P.yellow, P.magenta][i], 0.1, (i - 1) * 0.06)); A.poly(x, P, [[W * 0.1, H * 0.86], [W * 0.18, H * 0.78], [W * 0.26, H * 0.86], [W * 0.24, H * 0.96], [W * 0.12, H * 0.96]], P.magenta, 4); },
  clouds(x, W, H, P) { A.ground(x, W, H, P.cyan); A.sun(x, P, W * 0.78, H * 0.22, W * 0.09, 12); A.cloud(x, P, W * 0.3, H * 0.32, W * 0.1); A.cloud(x, P, W * 0.62, H * 0.62, W * 0.12); A.cloud(x, P, W * 0.22, H * 0.78, W * 0.07); },
  stretch(x, W, H, P) { A.ground(x, W, H, P.yellow); A.disc(x, P, W * 0.5, H * 0.2, W * 0.09, P.stock); A.line(x, P, [[W * 0.5, H * 0.29], [W * 0.5, H * 0.55]], 9); A.line(x, P, [[W * 0.5, H * 0.34], [W * 0.28, H * 0.12]], 9); A.line(x, P, [[W * 0.5, H * 0.34], [W * 0.72, H * 0.12]], 9); A.line(x, P, [[W * 0.5, H * 0.55], [W * 0.32, H * 0.76]], 9); A.line(x, P, [[W * 0.5, H * 0.55], [W * 0.76, H * 0.66]], 9);
    A.letter(x, P, 'STRETCH!', W / 2, H * 0.88, W * 0.2, P.magenta, 0.1, -0.04); },
  pool(x, W, H, P) { A.ground(x, W, H, P.paver); x.fillStyle = P.cyan; x.fillRect(W * 0.1, H * 0.16, W * 0.8, H * 0.68); A.line(x, P, [[W * 0.1, H * 0.16], [W * 0.9, H * 0.16], [W * 0.9, H * 0.84], [W * 0.1, H * 0.84], [W * 0.1, H * 0.16]], 6); for (const [u, v] of [[0.25, 0.3], [0.6, 0.5], [0.3, 0.7]]) A.line(x, P, [[W * u, H * v], [W * (u + 0.06), H * (v - 0.03)], [W * (u + 0.12), H * v]], 5, P.stock);
    x.beginPath(); x.arc(W * 0.6, H * 0.36, W * 0.13, 0, TAU); x.arc(W * 0.6, H * 0.36, W * 0.06, 0, TAU, true); x.fillStyle = P.magenta; x.fill('evenodd'); A.disc(x, P, W * 0.6, H * 0.36, W * 0.13, null, 5); A.disc(x, P, W * 0.6, H * 0.36, W * 0.06, null, 5); A.sun(x, P, W * 0.85, H * 0.1, W * 0.05, 8); },
  rosette(x, W, H, P) { A.ground(x, W, H, P.stock); for (const s of [-1, 1]) A.poly(x, P, [[W * 0.5, H * 0.55], [W * (0.5 + s * 0.2), H * 0.92], [W * (0.5 + s * 0.08), H * 0.86]], P.yellow, 5); const cx = W / 2, cy = H * 0.42, R = W * 0.3; x.beginPath(); for (let i = 0; i < 32; i++) { const a = i / 32 * TAU, r = i % 2 ? R * 0.84 : R; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.fillStyle = P.magenta; x.fill(); A.ink(x, P, 5); x.stroke(); A.disc(x, P, cx, cy, R * 0.6, P.stock); A.letter(x, P, '1st', cx, cy, W * 0.2, P.cobalt, 0.08); },
  /* ── design pass 10: what a real house hangs (docs/design/10-real-house.md §4.5); the same rules: one motif, flat colour, ink line, no dots ── */
  beach(x, W, H, P) { A.ground(x, W, H, mix(P.cyan, '#ffffff', 0.55)); x.fillStyle = P.cyan; x.fillRect(0, H * 0.5, W, H * 0.24); A.line(x, P, [[0, H * 0.5], [W, H * 0.5]], 4); x.fillStyle = mix(P.yellow, P.stock, 0.6); x.fillRect(0, H * 0.72, W, H * 0.28); A.line(x, P, [[0, H * 0.72], [W * 0.3, H * 0.7], [W * 0.6, H * 0.74], [W, H * 0.72]], 4);
    A.sun(x, P, W * 0.78, H * 0.22, W * 0.07, 10); A.cloud(x, P, W * 0.3, H * 0.2, W * 0.06); for (const u of [0.45, 0.7]) A.line(x, P, [[W * u, H * 0.62], [W * (u + 0.05), H * 0.6], [W * (u + 0.1), H * 0.62]], 3, P.stock); A.palm(x, P, W * 0.2, H * 0.8, H * 0.52, P.bark); },
  home(x, W, H, P) { A.ground(x, W, H, P.stock); x.strokeStyle = P.oak; x.lineWidth = 10; x.strokeRect(6, 6, W - 12, H - 12); A.letter(x, P, 'HOME', W / 2, H * 0.36, H * 0.44, P.ink, 0.03); A.letter(x, P, 'SWEET HOME', W / 2, H * 0.72, H * 0.2, P.ink, 0.03); A.heart(x, P, W * 0.88, H * 0.3, H * 0.07, P.red); },
  florida(x, W, H, P) { A.ground(x, W, H, P.stock); const pts = [[0.06, 0.2], [0.55, 0.16], [0.62, 0.2], [0.66, 0.32], [0.7, 0.46], [0.72, 0.6], [0.71, 0.74], [0.64, 0.86], [0.52, 0.92], [0.55, 0.84], [0.5, 0.72], [0.44, 0.6], [0.4, 0.48], [0.33, 0.36], [0.22, 0.32], [0.1, 0.3], [0.04, 0.26]].map(([u, v]) => [W * u, H * v]);
    A.poly(x, P, pts, mix(P.lawn, P.stock, 0.4), 5); A.disc(x, P, W * 0.5, H * 0.55, W * 0.035, P.cobalt, 3); A.letter(x, P, 'FLORIDA', W * 0.5, H * 0.1, H * 0.11, P.ink, 0.02); },
  list(x, W, H, P) { A.ground(x, W, H, P.rubber); x.strokeStyle = P.oak; x.lineWidth = 14; x.strokeRect(7, 7, W - 14, H - 14); const chalk = '#f4f1ea'; ['milk', 'eggs', 'bread', 'paper'].forEach((t, i) => { A.letter(x, P, t, W * 0.5, H * (0.2 + i * 0.2), H * 0.16, chalk, 0.01, (i % 2 ? 0.03 : -0.025)); A.line(x, P, [[W * 0.16, H * (0.2 + i * 0.2)], [W * 0.24, H * (0.24 + i * 0.2)], [W * 0.3, H * (0.14 + i * 0.2)]], 3, chalk); }); },
  lemons(x, W, H, P) { A.ground(x, W, H, P.stock); for (const [u, v, r] of [[0.3, 0.58, 0.16], [0.64, 0.64, 0.15], [0.48, 0.34, 0.13]]) { A.leafShape(x, P, W * u + r * W * 0.5, H * v - r * H * 0.9, W * r * 1.1, -0.9, P.hedge); x.save(); x.translate(W * u, H * v); x.scale(1.15, 0.9); A.disc(x, P, 0, 0, r * W, P.yellow, 5); x.restore(); } },
  coffee(x, W, H, P) { A.ground(x, W, H, mix(P.oak, P.stock, 0.72)); A.letter(x, P, 'COFFEE', W / 2, H * 0.28, W * 0.24, P.ink, 0.03); const cx = W * 0.5, cy = H * 0.7; A.poly(x, P, [[cx - W * 0.16, cy - H * 0.08], [cx + W * 0.16, cy - H * 0.08], [cx + W * 0.12, cy + H * 0.16], [cx - W * 0.12, cy + H * 0.16]], P.stock, 5); x.beginPath(); x.arc(cx + W * 0.19, cy + H * 0.02, W * 0.06, -1.2, 1.2); A.ink(x, P, 5); x.stroke(); for (const dx of [-0.05, 0, 0.05]) A.line(x, P, [[cx + W * dx, cy - H * 0.14], [cx + W * dx + 6, cy - H * 0.22], [cx + W * dx - 4, cy - H * 0.3]], 3); },
  laundry(x, W, H, P) { A.ground(x, W, H, P.stock); x.strokeStyle = P.ink; x.lineWidth = 6; x.strokeRect(5, 5, W - 10, H - 10); A.letter(x, P, 'LAUNDRY', W * 0.5, H * 0.44, Math.min(W * 0.2, H * 0.5), P.ink, 0.02); A.line(x, P, [[W * 0.12, H * 0.78], [W * 0.88, H * 0.78]], 3); A.poly(x, P, [[W * 0.42, H * 0.78], [W * 0.46, H * 0.7], [W * 0.54, H * 0.7], [W * 0.58, H * 0.78], [W * 0.57, H * 0.95], [W * 0.43, H * 0.95]], P.cyan, 3); },
  leaf(x, W, H, P) { A.ground(x, W, H, P.stock); const cx = W * 0.5, by = H * 0.92; for (const [ang, L, dx] of [[-2.2, 0.5, -0.02], [-1.57, 0.58, 0], [-0.95, 0.5, 0.02]]) { A.line(x, P, [[cx + W * dx, by - H * 0.1], [cx + W * dx + Math.cos(ang) * H * L * 0.5, by - H * 0.1 + Math.sin(ang) * H * L * 0.5]], 4, P.hedge); A.leafShape(x, P, cx + W * dx + Math.cos(ang) * H * L * 0.45, by - H * 0.1 + Math.sin(ang) * H * L * 0.45, H * L * 0.55, ang, P.hedge); }
    A.poly(x, P, [[cx - W * 0.17, by - H * 0.16], [cx + W * 0.17, by - H * 0.16], [cx + W * 0.13, by], [cx - W * 0.13, by]], P.tangerine, 4); },
  crayonPlane(x, W, H, P) { A.paper(x, P, W, H); const r = mulberry32(9); A.crayon(x, P.cobalt, [[W * 0.2, H * 0.55], [W * 0.8, H * 0.35], [W * 0.5, H * 0.5], [W * 0.62, H * 0.7], [W * 0.2, H * 0.55]], 9, r); A.crayon(x, P.yellow, [[W * 0.8, H * 0.15], [W * 0.86, H * 0.2], [W * 0.78, H * 0.25], [W * 0.84, H * 0.1], [W * 0.9, H * 0.22]], 12, r); for (let i = 0; i < 3; i++) A.crayon(x, P.cobalt, [[W * 0.05, H * (0.5 + i * 0.1)], [W * 0.16, H * (0.48 + i * 0.1)]], 6, r); A.crayon(x, P.red, [[W * 0.25, H * 0.85], [W * 0.5, H * 0.8], [W * 0.75, H * 0.88]], 8, r); },
  crayonHouse(x, W, H, P) { A.paper(x, P, W, H); const r = mulberry32(13); A.crayon(x, P.red, [[W * 0.3, H * 0.7], [W * 0.3, H * 0.4], [W * 0.5, H * 0.22], [W * 0.7, H * 0.4], [W * 0.7, H * 0.7], [W * 0.3, H * 0.7]], 9, r); A.crayon(x, P.cobalt, [[W * 0.45, H * 0.7], [W * 0.45, H * 0.52], [W * 0.55, H * 0.52], [W * 0.55, H * 0.7]], 8, r);
    A.crayon(x, P.lawn, [[W * 0.05, H * 0.72], [W * 0.95, H * 0.74]], 12, r); for (let i = 0; i < 3; i++) { const cx = W * (0.78 + i * 0.07); A.crayon(x, P.magenta, [[cx, H * 0.5], [cx, H * 0.68]], 5, r); A.crayon(x, P.magenta, [[cx - 8, H * 0.55], [cx + 8, H * 0.55]], 5, r); x.beginPath(); x.arc(cx, H * 0.45, 8, 0, TAU); x.strokeStyle = P.magenta; x.lineWidth = 5; x.stroke(); } A.crayon(x, P.yellow, [[W * 0.12, H * 0.15], [W * 0.2, H * 0.12], [W * 0.14, H * 0.22], [W * 0.22, H * 0.2]], 12, r); },
};
/** artTex(K, key, w, h): the print as a texture at the print's aspect (384 px wide), cached per art and size */
function artTex(K, key, w, h) {
  const P = K.pal, W = 384, H = Math.max(96, Math.round(W * h / w)), k = key + '|' + H; (K._arts ||= {});
  return K._arts[k] ||= (() => { const t = canvasTexture(W, H, x => (ARTS[key] || ARTS.beach)(x, W, H, P)); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8; t.needsUpdate = true; return t; })();
}
/** artMat(K, key, w, h): the print's material: the texture lit flat like a printed page (a little of the room's light, no key wash, no hatching), one per art and size */
function artMat(K, key, w, h) {
  const k = 'm|' + key + '|' + Math.max(96, Math.round(384 * h / w)); (K._artMats ||= {});
  return K._artMats[k] ||= new ComicMaterial({ world: K.world, color: '#ffffff', map: artTex(K, key, w, h), inkWeight: 0.55, hatch: 0, keyMix: 0.05, shadowMul: 0.82, shadowMix: 0.08, fillAmt: 0.08, bias: 0.55 });
}

export const EXTRA = {
  /** THE HAND (hero 1.0): a palm CUSHION, four fingers and a thumb as RODs (6 sides), a cobalt cuff; three poses on twos */
  hand(K) {
    const M = K.M, pal = K.pal, g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const skin = M.furn(mix(pal.stock, pal.tangerine, 0.35), { hatch: 0.3, keyMix: 0.4 });
    body.add(cushion(0.03, 0.085, 0.075, skin, 0.046, -0.028, 0.02));                                                          // the palm standing on the keel's right
    for (let i = 0; i < 4; i++) { const z = 0.05 - i * 0.02; body.add(bent([[0.046, -0.066, z], [0.012, -0.086, z], [-0.028, -0.078, z], [-0.046, -0.05, z + 0.003]], 0.011, skin, 8)); }   // four fingers under the keel, curling up its left
    body.add(bent([[0.052, 0.002, 0.034], [0.024, 0.016, 0.006], [-0.006, 0.014, -0.022]], 0.012, skin, 8));                    // the thumb over the right wing root
    body.add(bent([[0.05, -0.05, 0.05], [0.085, -0.095, 0.105], [0.125, -0.15, 0.17]], 0.032, skin, 8));                         // the wrist, down and right toward the frame's edge
    const cuff = cushion(0.09, 0.08, 0.09, M.furn('cobalt'), 0.13, -0.158, 0.178); cuff.rotation.set(0.6, 0, -0.55); body.add(cuff);   // the sleeve
    body.traverse(o => { if (o.isMesh) o.userData.inkMul = 1.3; });
    const poses = [{ rx: 0.12, y: 0, z: 0 }, { rx: -0.55, y: 0.015, z: -0.05 }, { rx: -0.95, y: -0.12, z: -0.02 }];
    g.userData = { dynamic: true, pose: 0, set(k) { g.userData.pose = k; const p = poses[k]; body.rotation.x = p.rx; body.position.set(0, p.y, p.z); } };
    g.userData.set(0); return g;
  },
  /** TOASTER (clutter 0.6): a steel SLAB with two slots, a lever ROD, the cord as coloured ink; the slots GLOW once armed, the lever snaps up at the pop */
  toaster(K) {
    const M = K.M, g = new THREE.Group(), w = 0.28, h = 0.2, d = 0.18;
    g.add(slabB(w, h, d, M.steel, 0, 0, 0));
    const glows = [];
    for (const x of [-0.045, 0.045]) { g.add(slab(0.024, 0.006, 0.13, M.rubberObj, x, h, 0, { noInk: true }));
      const gl = slab(0.018, 0.004, 0.12, glowWarm(K), x, h + 0.003, 0, { noInk: true }); gl.userData.shape = 'GLOW'; gl.visible = false; g.add(gl); glows.push(gl); }
    const lever = new THREE.Group(); lever.position.set(w / 2 + 0.004, 0.06, 0.03);
    lever.add(rod(0.006, 0.05, M.rubberObj, 0, 0, 0, { noInk: true })); lever.add(puff(0.013, M.rubberObj, 0, 0.055, 0, { noInk: true })); g.add(lever);
    g.add(bent([[-w / 2, 0.02, -0.02], [-w / 2 - 0.06, 0.006, -0.05], [-w / 2 - 0.03, 0.004, -0.13]], 0.005, M.rubberObj, 6, { noInk: true }));
    g.userData = { dynamic: true, lever, popT: -9, arm(on) { for (const gl of glows) gl.visible = on; }, pop(t12) { g.userData.popT = t12; },
      tick(f, t12) { lever.position.y = (t12 - g.userData.popT >= 0 && t12 - g.userData.popT < 0.6) ? 0.15 : 0.06; } };
    return g;
  },
  /** TOAST (clutter 0.6): a SLAB slice in a golden brown derived from the process yellow; the crust is the ink line; tumbles on twos */
  toast(K) {
    const M = K.M, pal = K.pal, g = new THREE.Group();
    g.add(slab(0.11, 0.10, 0.012, M.furn(mix(pal.yellow, pal.ink, 0.35), { hatch: 0.4 }), 0, 0, 0));
    g.userData = { dynamic: true, spin: 0, tick(f) { g.rotation.x = f * g.userData.spin; g.rotation.z = f * g.userData.spin * 0.6; } };
    return g;
  },
  /** the RANGE's open oven (placed at the range's origin): the door SLAB hinged at the bottom lying at 20°, a warm GLOW in the mouth, the pie */
  ovenDoor(K, p) {
    const M = K.M, pal = K.pal, g = new THREE.Group(), w = p.w, d = p.d, y0 = 0.2, len = 0.55;
    const hinge = new THREE.Group(); hinge.position.set(0, y0, d / 2 + 0.012); hinge.rotation.x = Math.PI / 2 - 20 * Math.PI / 180;
    hinge.add(slab(w - 0.12, len, 0.02, M.blackGlass, 0, len / 2, 0)); const gl = glare(M, w - 0.2, len - 0.2, 2); gl.position.set(0, len / 2, 0.012); hinge.add(gl);
    hinge.add(slab(w - 0.16, 0.03, 0.03, M.steel, 0, len - 0.03, -0.02, { inkMul: 0.5 })); g.add(hinge);
    const mouth = slab(w - 0.14, 0.4, 0.01, glowWarm(K), 0, 0.42, d / 2 - 0.005, { noInk: true }); mouth.userData.shape = 'GLOW'; g.add(mouth);
    g.add(drum(0.11, 0.09, 0.05, M.furn(mix(pal.yellow, pal.ink, 0.35)), 0, 0.28, d / 2 - 0.16));                                   // the pie
    const flames = []; for (let i = 0; i < 3; i++) { const fl = puff(0.035 + i * 0.01, unlit(K, i % 2 ? pal.yellow : pal.tangerine), -0.06 + i * 0.06, 0.4, d / 2 - 0.14, { ico: 1, noInk: true }); fl.userData.shape = 'GLOW'; g.add(fl); flames.push(fl); }
    g.userData = { dynamic: true, tick(f) { flames.forEach((fl, i) => { const k = (f + i * 2) % 4; fl.position.y = 0.38 + k * 0.03; fl.scale.setScalar(0.8 + k * 0.15); }); } };
    return g;
  },
  /** the OVEN SMOKE (effect 0): seven PUFFs in a warm grey climbing the range front, mushrooming under the ceiling, rolling right toward the gym door, on twos */
  ovenSmoke(K, p, r) {
    const g = new THREE.Group(), m = smokeMat(K);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.62, -0.62, 0.05), new THREE.Vector3(-0.5, 0.35, -0.05), new THREE.Vector3(0.3, 0.75, -0.25), new THREE.Vector3(2.2, 0.72, -0.5), new THREE.Vector3(4.6, 0.6, -0.85), new THREE.Vector3(7.2, 0.45, -1.2)]);
    const puffs = []; const N = 12;
    for (let i = 0; i < N; i++) { const s = puff(0.09, m, 0, 0, 0, { ico: 1 }); s.userData.u = i / N; s.userData.jx = rng(r, -0.1, 0.1); s.userData.jz = rng(r, -0.1, 0.1); g.add(s); puffs.push(s); }
    g.userData = { dynamic: true, tick(f) { for (const s of puffs) { const k = (s.userData.u + f * 0.009) % 1; curve.getPointAt(k, s.position); s.position.x += s.userData.jx; s.position.z += s.userData.jz; s.scale.setScalar(0.5 + k * 1.6); s.rotation.y = f * 0.15 + s.userData.u * 6; } } };
    g.userData.tick(0); return g;
  },
  /** SMOKE ALARM: a DRUM on the ceiling with a GLOW dot that blinks on twos */
  smokeAlarm(K) {
    const M = K.M, g = new THREE.Group(); g.add(drum(0.07, 0.07, 0.025, M.furn('stock'), 0, -0.025, 0));
    const dot = puff(0.012, unlit(K, K.pal.red), 0.03, -0.03, 0.03, { noInk: true }); dot.userData.shape = 'GLOW'; g.add(dot);
    g.userData = { dynamic: true, tick(f) { dot.visible = (f % 24) < 4; } }; return g;
  },
  /** TRAMPOLINE (furniture 0.7): a cobalt DRUM mat on six ROD legs with a steel RING rim; the mat dips on BOING */
  trampoline(K, p) {
    const M = K.M, g = new THREE.Group(), R0 = 1.5, H = p.h;
    const mat = drum(R0 - 0.06, R0 - 0.06, 0.05, M.furn(p.color || 'cobalt', { keyMix: 0.4 }), 0, H - 0.05, 0); g.add(mat);
    g.add(ring(R0 - 0.03, 0.03, M.steel, 0, H - 0.02, 0, { rx: Math.PI / 2 }));
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; g.add(rod(0.025, H - 0.04, M.steel, Math.cos(a) * (R0 - 0.12), 0, Math.sin(a) * (R0 - 0.12))); }
    g.userData = { dynamic: true, dipT: -9, boing(t12) { g.userData.dipT = t12; }, tick(f, t12) { const dt = t12 - g.userData.dipT; mat.position.y = H - 0.05 - ((dt >= 0 && dt < 0.25) ? 0.18 : 0); mat.scale.set(1, 1, 1); } };
    return g;
  },
  /** SWING SET (furniture 0.7): two A-frames of RODs and a bar in red, two yellow SLAB seats on ROD ropes; the seats swing on twos */
  swingSet(K, p) {
    const M = K.M, g = new THREE.Group(), red = M.furn(p.color || 'red'), H = p.h, W = p.w;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = rod(0.04, Math.hypot(H, 0.7), red, sx * W / 2, 0, sz * 0.7); leg.rotation.x = -sz * Math.atan2(0.7, H); g.add(leg); }
    const bar = rod(0.04, W + 0.1, red, W / 2 + 0.05, H, 0); bar.rotation.z = Math.PI / 2; g.add(bar);
    const seats = []; for (const sx of [-0.75, 0.75]) { const piv = new THREE.Group(); piv.position.set(sx, H, 0); const drop = H - 0.45;
      for (const dx of [-0.2, 0.2]) piv.add(rod(0.008, drop, M.furn('stock'), dx, -drop, 0, { noInk: true }));
      piv.add(slab(0.5, 0.04, 0.2, M.furn('yellow'), 0, -drop, 0)); g.add(piv); seats.push(piv); }
    g.userData = { dynamic: true, tick(f, t12) { seats.forEach((s, i) => { s.rotation.x = Math.sin(t12 * 1.3 + i * 1.5) * 0.14; }); } }; return g;
  },
  /** SHED (architecture 0.45 as a garden building: furniture ink): a tangerine SLAB box, a darker SLAB door, a CUTOUT prism roof in stock */
  shed(K, p) {
    const M = K.M, pal = K.pal, g = new THREE.Group(), w = p.w, h = 2.2, d = p.d, hue = p.color || 'tangerine';
    g.add(slabB(w, h, d, M.furn(hue), 0, 0, 0));
    g.add(slab(0.9, 1.9, 0.03, M.furn(shade(pal[hue], -0.16, 0, 0)), 0.3, 0.95, d / 2 + 0.016));
    g.add(puff(0.022, M.steel, 0.62, 0.95, d / 2 + 0.04, { inkMul: 0.5 }));
    g.add(cutout([[-w / 2 - 0.15, h - 0.02], [w / 2 + 0.15, h - 0.02], [0, h + 0.7]], d + 0.3, M.furn('stock'), 0, 0, -d / 2 - 0.15));
    return g;
  },
  /** GRILL (clutter 0.6): a DRUM kettle in rubber on three RODs, the lid up, a GLOW of coals, three smoke PUFFs rising on twos: a picture, not a push */
  grill(K, p, r) {
    const M = K.M, g = new THREE.Group(), body = M.rubberObj;
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; g.add(rod(0.012, 0.58, M.steel, Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2)); }
    g.add(drum(0.3, 0.2, 0.3, body, 0, 0.55, 0)); g.add(drum(0.31, 0.31, 0.02, M.steel, 0, 0.85, 0));
    const lid = new THREE.Group(); lid.position.set(0, 0.87, -0.3); lid.rotation.x = -1.15; lid.add(drum(0.05, 0.31, 0.16, body, 0, 0, 0.3)); lid.add(puff(0.025, M.steel, 0, 0.17, 0.3, { inkMul: 0.5 })); g.add(lid);
    const coals = drum(0.25, 0.25, 0.03, glowWarm(K), 0, 0.82, 0, { noInk: true }); coals.userData.shape = 'GLOW'; g.add(coals);
    const puffs = []; for (let i = 0; i < 3; i++) { const s = puff(0.09 + i * 0.03, smokeMat(K), rng(r, -0.08, 0.08), 1.0 + i * 0.26, rng(r, -0.08, 0.08), { ico: 1 }); g.add(s); puffs.push(s); }
    g.userData = { dynamic: true, tick(f) { puffs.forEach((s, i) => { const k = (f + i * 3) % 9; s.position.y = 0.98 + i * 0.26 + k * 0.03; s.scale.setScalar(0.8 + k * 0.05 + i * 0.2); }); } };
    return g;
  },
  /** THE POOL (ground 0.35 · mark 0): a rectangle of water in the paver deck with a stock coping, GLARE strokes and RING ripples on twos. f = the pool floor's spec */
  pool(K, f, r) {
    const M = K.M, g = new THREE.Group(), w = f.x[1] - f.x[0], d = f.z[1] - f.z[0], cx = (f.x[0] + f.x[1]) / 2, cz = (f.z[0] + f.z[1]) / 2;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.pond); water.rotation.x = -Math.PI / 2; water.position.set(cx, -0.045, cz); water.userData.noInk = true; water.userData.shape = 'CUTOUT'; g.add(water);
    for (const [x, z, L] of [[cx - 0.9, cz - 0.5, 1.5], [cx + 1.0, cz + 0.5, 0.9]]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.07, L), M.glare); s.rotation.x = -Math.PI / 2; s.rotation.z = 0.62; s.position.set(x, -0.04, z); s.userData.noInk = true; g.add(s); }
    const c = 0.28, t = 0.05, cop = M.furn('stock');
    g.add(slabB(w + 2 * c, t, c, cop, cx, -0.05, cz - d / 2 - c / 2)); g.add(slabB(w + 2 * c, t, c, cop, cx, -0.05, cz + d / 2 + c / 2));
    g.add(slabB(c, t, d, cop, cx - w / 2 - c / 2, -0.05, cz)); g.add(slabB(c, t, d, cop, cx + w / 2 + c / 2, -0.05, cz));
    const rip = []; for (let i = 0; i < 3; i++) { const t2 = ring(rng(r, 0.3, 0.7), 0.04, M.ripple, cx + rng(r, -2, 2), -0.035, cz + rng(r, -1.2, 1.2), { rx: -Math.PI / 2, noInk: true, arc: rng(r, 0.8, 1.6) }); g.add(t2); rip.push(t2); }
    g.userData = { dynamic: true, tick(f) { rip.forEach((rp, i) => rp.scale.setScalar(1 + ((f + i * 3) % 6) * 0.06)); } }; return g;
  },
  /** THE PENNANT (landmark 0.9): a ROD post, a magenta CUTOUT flag with the distance lettered in stock; flutters on twos, hops on NEW RECORD */
  pennant(K, text) {
    const M = K.M, pal = K.pal, g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    body.add(rod(0.018, 0.9, M.furn('stock'), 0, 0, 0));
    const mat = new ComicMaterial({ world: K.world, color: pal.magenta, inkWeight: 0.9, hatch: 0.3, side: THREE.DoubleSide });
    const flag = cutout([[0, 0], [0.36, 0], [0.27, 0.11], [0.36, 0.22], [0, 0.22]], 0.012, mat, 0.018, 0.66, 0); flag.userData.shape = 'SHEET'; body.add(flag);
    const setText = (txt) => { const tex = canvasTexture(256, 160, (ctx, w, h) => { ctx.fillStyle = pal.magenta; ctx.fillRect(0, 0, w, h); ctx.font = '400 72px Bangers, Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.lineWidth = 9; ctx.strokeStyle = pal.ink; ctx.strokeText(txt, w * 0.42, h / 2 + 4); ctx.fillStyle = pal.stock; ctx.fillText(txt, w * 0.42, h / 2 + 4); });
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.repeat.set(1 / 0.36, 1 / 0.22); tex.flipY = true; const old = mat.uniforms.uMap.value; mat.uniforms.uMap.value = tex; mat.uniforms.uHasMap.value = 1; if (old) old.dispose(); };
    setText(text);
    g.userData = { dynamic: true, hopT: -9, setText, hop(t12) { g.userData.hopT = t12; },
      tick(f, t12) { flag.rotation.y = 0.25 + Math.sin(t12 * 2.1) * 0.2; const dt = t12 - g.userData.hopT; body.position.y = (dt >= 0 && dt < 0.45) ? 0.4 * Math.sin(dt / 0.45 * Math.PI) : 0; } };
    return g;
  },
  /** BONK MARKS (effect 0): eight DASHes in a ring on the surface for three frames, three dust PUFFs for a ceiling */
  bonkMarks(K) {
    const M = K.M, g = new THREE.Group(), ring8 = new THREE.Group(); g.add(ring8);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const d = dash(0.14, 0.022, M.dash, Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0); d.lookAt(new THREE.Vector3(Math.cos(a) * 3, Math.sin(a) * 3, 0)); ring8.add(d); }
    const dust = []; for (let i = 0; i < 3; i++) { const p = puff(0.05, M.steam, (i - 1) * 0.14, -0.06, 0.08, { ico: 1 }); g.add(p); dust.push(p); }
    g.visible = false;
    g.userData = { dynamic: true, onT: -9, show(pos, n, ceiling, t12) { g.position.copy(pos); g.lookAt(pos.clone().add(n)); g.visible = true; g.userData.onT = t12; for (const p of dust) p.visible = !!ceiling; },
      tick(f, t12) { const dt = t12 - g.userData.onT; if (!g.visible) return; if (dt > 0.2) { g.visible = false; return; } const s = 0.7 + dt * 3; ring8.scale.set(s, s, 1); dust.forEach((p, i) => p.position.y = -0.06 - dt * 1.2 + i * 0.02); } };
    return g;
  },
  /** the LOFT FAN: five ink dashes at the five pitches in front of the plane; the live notch in magenta */
  loftFan(K, lofts) {
    const M = K.M, g = new THREE.Group(), mag = unlit(K, K.pal.magenta), items = [];
    for (const deg of lofts) { const holder = new THREE.Group(); holder.rotation.x = deg * Math.PI / 180;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.5).translate(0, 0, -0.25 - 0.36), M.dash); m.userData.noInk = true; m.userData.shape = 'DASH'; holder.add(m); g.add(holder); items.push({ holder, m }); }
    g.userData = { dynamic: true, live: 2, set(i) { g.userData.live = i; items.forEach((it, k) => { it.m.material = k === i ? mag : M.dash; const s = k === i ? 1.8 : 1; it.m.scale.set(s, s, 1); }); } };
    g.userData.set(2); return g;
  },
  /** FRIDGE (furniture 0.7): a tall steel SLAB, two door lines, two handles, a GLARE */
  fridge(K, p) {
    const M = K.M, g = new THREE.Group(), w = p.w || 0.9, h = p.h || 1.8, d = p.d || 0.75;
    g.add(slabB(w, h, d, M.steel, 0, 0, 0)); g.add(slab(w - 0.04, 0.012, 0.01, M.rubberObj, 0, h * 0.62, d / 2 + 0.005, { noInk: true }));
    for (const y of [h * 0.5, h * 0.72]) g.add(rod(0.012, 0.22, M.rubberObj, -w / 2 + 0.1, y, d / 2 + 0.03, { inkMul: 0.5 }));
    const gl = glare(M, w * 0.5, h * 0.3, 2); gl.position.set(w * 0.1, h * 0.3, d / 2 + 0.01); g.add(gl);
    (p.drawings || []).forEach((art, i) => {                                                                          // pass 9: a child's drawings under magnets on the door
      const dw = 0.2, dh = 0.26, hold = new THREE.Group(); hold.position.set(-w / 2 + 0.24 + i * 0.32, h * 0.18 + (i % 2) * 0.05, d / 2 + 0.006); hold.rotation.z = (i % 2 ? -1 : 1) * 0.08;
      hold.add(slab(dw, dh, 0.004, artMat(K, art, dw, dh), 0, dh / 2, 0.002, { inkMul: 0.6 })); hold.add(puff(0.012, M.furn(i % 2 ? 'cyan' : 'red'), 0, dh - 0.015, 0.006, { inkMul: 0.5 })); g.add(hold); });
    return g;
  },
  /** WASHER / DRYER (furniture 0.7): a stock SLAB with a black-glass DRUM window, a control strip, a knob */
  washer(K, p) {
    const M = K.M, g = new THREE.Group(), w = p.w || 0.7, h = p.h || 0.95, d = p.d || 0.7;
    g.add(slabB(w, h, d, M.furn(p.color || 'stock'), 0, 0, 0)); g.add(drum(0.2, 0.2, 0.02, M.blackGlass, 0, 0.42, d / 2 + 0.01, { rx: Math.PI / 2 }));
    g.add(ring(0.21, 0.015, M.steel, 0, 0.42, d / 2 + 0.02)); g.add(slab(w - 0.06, 0.08, 0.02, M.steel, 0, h - 0.07, d / 2 + 0.01)); g.add(puff(0.02, M.rubberObj, w * 0.3, h - 0.07, d / 2 + 0.04, { inkMul: 0.5 }));
    const gl = glare(M, 0.24, 0.24, 2); gl.position.set(0, 0.42, d / 2 + 0.03); g.add(gl); return g;
  },
  dryer(K, p) { return EXTRA.washer(K, p); },
  /** DRYER HOSE (clutter 0.6): the flexible hose from the dryer's back to a wall RING, flapping on twos; its stream is the world's dashes */
  dryerVent(K, p) {
    const M = K.M, g = new THREE.Group();
    const hose = bent([[0, -0.3, 0.3], [0.06, -0.15, 0.18], [0.02, -0.04, 0.06], [0, 0, 0]], 0.045, M.rubberObj, 12); g.add(hose);
    g.add(ring(0.08, 0.018, M.steel, 0, 0, 0)); g.add(drum(0.06, 0.06, 0.02, M.rubberObj, 0, 0, -0.01, { rx: Math.PI / 2 }));
    g.userData = { dynamic: true, tick(f) { hose.rotation.z = Math.sin(f * 0.9) * 0.08; hose.rotation.x = Math.cos(f * 0.7) * 0.06; } }; return g;
  },
  /** RETURN VENT (fixture): a stock SLAB grille with slats (coloured ink, no hulls) on the wall */
  returnVent(K, p) {
    const M = K.M, g = new THREE.Group(), w = p.w || 0.5, h = 0.3;
    g.add(slab(w, h, 0.03, M.furn('stock'), 0, 0, 0)); for (let i = 0; i < 6; i++) g.add(slab(w - 0.06, 0.012, 0.01, M.rubberObj, 0, -h / 2 + 0.04 + i * 0.045, 0.02, { noInk: true })); return g;
  },
  /** UTILITY SINK (furniture 0.7): a deep stock SLAB tub with a dark basin and the kit's faucet */
  utilitySink(K, p) {
    const M = K.M, g = new THREE.Group(), w = p.w || 0.6, h = p.h || 0.9, d = p.d || 0.55;
    g.add(slabB(w, h, d, M.furn('stock'), 0, 0, 0)); g.add(slab(w - 0.08, 0.01, d - 0.08, M.rubberObj, 0, h - 0.06, 0, { inkMul: 0.4 }));
    const f = PIECE.faucet(K); f.position.set(0, h, -d / 2 + 0.06); g.add(f); return g;
  },
  /** IRONING BOARD (clutter 0.6): a cyan SLAB top on two X legs of RODs, the iron on it */
  ironingBoard(K, p) {
    const M = K.M, g = new THREE.Group(), w = p.w || 1.25, h = p.h || 0.9, d = p.d || 0.36;
    g.add(slabB(w, 0.03, d, M.furn(p.color || 'cyan', { hatch: 0.3 }), 0, h - 0.03, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = rod(0.012, Math.hypot(h - 0.03, 0.5), M.steel, sx * 0.25, 0, sz * d * 0.45); leg.rotation.z = sx * -0.28 * 0; leg.rotation.x = -sz * Math.atan2(d * 0.45, h); g.add(leg); }
    g.add(slabB(0.16, 0.06, 0.24, M.steel, w * 0.25, h, 0)); g.add(puff(0.035, M.furn('red'), w * 0.25, h + 0.08, 0, { squash: [1, 0.6, 1] })); return g;
  },
  /** AC UNIT / HEAT PUMP (furniture 0.7): a steel SLAB box, a RING grille and a fan DRUM on top; its updraft is the world's dashes */
  acUnit(K, p) {
    const M = K.M, g = new THREE.Group(), w = p.w || 0.8, h = p.h || 0.8;
    g.add(slabB(w, h - 0.06, w, M.steel, 0, 0, 0)); g.add(ring(w * 0.4, 0.02, M.rubberObj, 0, h - 0.05, 0, { rx: Math.PI / 2 })); g.add(ring(w * 0.25, 0.012, M.rubberObj, 0, h - 0.05, 0, { rx: Math.PI / 2 }));
    const blades = new THREE.Group(); blades.position.y = h - 0.09; for (let i = 0; i < 3; i++) { const b = slab(0.28, 0.01, 0.07, M.steel, 0.14, 0, 0, { ry: i * Math.PI * 2 / 3, inkMul: 0.4 }); blades.add(b); } g.add(blades);
    for (let i = 0; i < 4; i++) g.add(slab(w - 0.04, 0.01, 0.01, M.rubberObj, 0, 0.12 + i * 0.16, w / 2 + 0.005, { noInk: true }));
    g.userData = { dynamic: true, tick(f) { blades.rotation.y = f * 1.2; } }; return g;
  },
  /** SCREEN PORCH (furniture 0.7): the lanai's cage of stock posts and beams with GLARE on every screened panel; doors on the far side, one of them torn */
  screenPorch(K, p) {
    const M = K.M, w = p.w, d = p.d, h = p.h, g = new THREE.Group(), x0 = -w / 2, x1 = w / 2, z0 = -d / 2, P = 0.06, fr = M.furn('stock');
    const doors = (p.doors || []).slice().sort((a, b) => a.x - b.x); const n = 8, pw = w / n;
    for (let i = 0; i <= n; i++) g.add(slabB(P, h, P, fr, x0 + w * i / n, 0, z0)); for (let i = 1; i <= 2; i++) { g.add(slabB(P, h, P, fr, x0, z0 + d * i / 2)); g.add(slabB(P, h, P, fr, x1, z0 + d * i / 2)); }
    g.add(slab(w, P, P, fr, 0, h, z0)); g.add(slab(P, P, d, fr, x0, h, 0)); g.add(slab(P, P, d, fr, x1, h, 0)); for (let i = 1; i < n; i++) g.add(slab(P * 0.8, P * 0.8, d, fr, x0 + w * i / n, h + 0.02, 0));
    for (let i = 0; i < n; i++) { const xm = x0 + pw * (i + 0.5); const door = doors.find(dd => Math.abs(dd.x - xm) < pw / 2 + 0.01 || (xm > dd.x - dd.w / 2 && xm < dd.x + dd.w / 2));
      if (door && door.torn) { for (let k = 0; k < 5; k++) g.add(slab(0.02, 0.15 + k * 0.08, 0.01, fr, xm - pw * 0.4 + k * pw * 0.2, h - 0.15 - k * 0.04, z0, { noInk: true }));   // the torn screen's ragged strips
        g.add(slab(pw, 0.05, 0.04, fr, xm, 0.9, z0)); continue; }
      if (door) { g.add(slab(pw, P * 0.7, P * 0.7, fr, xm, 2.0, z0)); continue; }   // the screen door's head; the leaf stands open elsewhere
      g.add(slab(pw, 0.05, 0.04, fr, xm, 0.9, z0)); const gl = glare(M, pw - 0.2, h - 1.1, 2); gl.position.set(xm, h * 0.62, z0 + 0.01); g.add(gl); }
    for (const z of [z0 + d * 0.25, z0 + d * 0.75]) for (const x of [x0, x1]) { g.add(slab(0.04, 0.05, d / 2, fr, x, 0.9, z)); const gl = glare(M, d / 2 - 0.2, h - 1.1, 2); gl.position.set(x + (x < 0 ? 0.01 : -0.01), h * 0.62, z); gl.rotation.y = Math.PI / 2; g.add(gl); }
    return g;
  },
  /** a pool of PUFFs that bursts from a point (crumbs from the toast, drips from the sprinkler, soot behind a smoked plane), stepping on twos */
  puffBurst(K, o = {}) {
    const g = new THREE.Group(), n = o.n || 6, items = [];
    const mat = o.mat || (o.color ? new ComicMaterial({ world: K.world, color: o.color, inkWeight: 0.5, hatch: 0, keyMix: 0.5 }) : o.soot ? sootMat(K) : smokeMat(K));
    for (let i = 0; i < n; i++) { const p = puff(o.r || 0.03, mat, 0, 0, 0, { ico: 1 }); p.visible = false; p.userData = { t0: -9, v: new THREE.Vector3() }; g.add(p); items.push(p); }
    let k = 0; const rr = mulberry32(o.seed ?? 101);   // seeded: the same proof URL gives the same frame
    g.userData = { dynamic: true, items, gravity: o.gravity ?? 3, life: o.life ?? 0.7, grow: o.grow ?? 1,
      burst(pos, t12, count = n, spread = 1) { for (let i = 0; i < count; i++) { const p = items[k++ % n]; p.visible = true; p.position.copy(pos); p.userData.t0 = t12; p.userData.v.set((rr() - 0.5) * 1.6 * spread, 1.2 * spread + rr(), (rr() - 0.5) * 1.6 * spread); p.scale.setScalar(1); } },
      tick(f, t12) { for (const p of items) { if (!p.visible) continue; const dt = t12 - p.userData.t0; if (dt > g.userData.life || dt < 0) { p.visible = false; continue; }
        p.position.addScaledVector(p.userData.v, 1 / 12); p.userData.v.y -= g.userData.gravity / 12; const s = g.userData.grow > 1 ? 1 + dt * g.userData.grow : 1 - dt / g.userData.life * 0.6; p.scale.setScalar(Math.max(0.05, s)); } } };
    return g;
  },
  /* ───────────── design pass 7: the greybox pieces of the next levels (each stands in for its plan's card until the pieces card builds it) ───────────── */
  /** a GREYBOX BLOCK: a chamfered SLAB in the zone's hue for a hard or furniture piece, a CUSHION in a lighter tint for a soft one, a paler SLAB with thin ink for a picture */
  block(K, p) {
    const M = K.M, pal = K.pal, g = new THREE.Group(), w = p.w || 0.4, h = Math.max(0.04, p.h || 0.4), d = p.d || 0.3, hue = pal[p.color] || pal.stock;
    if (p.picture) { const s = slabB(w, h, d, M.furn(mix(hue, pal.stock, 0.5), { hatch: 0.2 }), 0, 0, 0); s.userData.inkMul = 0.6; g.add(s); }
    else if (p.soft) g.add(cushionB(w, h, d, M.furn(mix(hue, pal.stock, 0.3), { hatch: 0.35 }), 0, 0, 0));
    else g.add(slabB(w, h, d, M.furn(hue, { hatch: p.hit === 'hard' ? 0.15 : 0.3 }), 0, 0, 0));
    return g;
  },
  /** a GLASS PANE: black glass with a glare in a stock frame (the sliders' rule: BONK) */
  pane(K, p) {
    const M = K.M, g = new THREE.Group(), w = p.w || 1, h = p.h || 2, d = Math.max(0.04, p.d || 0.06), fr = M.furn('stock');
    g.add(slabB(w, h, d, M.blackGlass, 0, 0, 0)); g.add(slab(w + 0.06, 0.05, d + 0.02, fr, 0, h, 0)); g.add(slab(w + 0.06, 0.05, d + 0.02, fr, 0, 0.025, 0));
    const gl = glare(M, w * 0.7, h * 0.7, 2); gl.position.set(0, h / 2, d / 2 + 0.01); g.add(gl); return g;
  },
  /** a STREAM's anchor: a small steel DRUM with a rubber RING where the fan or vent stands; the dashes are the world's instanced stream */
  stream(K) { const M = K.M, g = new THREE.Group(); g.add(drum(0.12, 0.12, 0.1, M.steel, 0, 0, 0)); g.add(ring(0.1, 0.012, M.rubberObj, 0, 0.1, 0, { rx: Math.PI / 2 })); return g; },
  /** the SMOKE CLASS of another level: the anchor and nine warm-grey PUFFs drifting along the stream's box on twos (the rotisserie's heat, the fogger's fog) */
  fog(K, p, r) {
    const g = EXTRA.stream(K), b = p.boost, m = smokeMat(K), n = 9, dir = new THREE.Vector3(...b.dir).normalize(), puffs = [];
    const x0 = b.x[0] - p.x, x1 = b.x[1] - p.x, y0 = b.y[0] - (p.y || 0), y1 = b.y[1] - (p.y || 0), z0 = b.z[0] - p.z, z1 = b.z[1] - p.z;   // the box in the anchor's frame
    const L = Math.abs((x1 - x0) * dir.x) + Math.abs((y1 - y0) * dir.y) + Math.abs((z1 - z0) * dir.z) || 1;
    for (let i = 0; i < n; i++) { const s = puff(0.1, m, 0, 0, 0, { ico: 1 }); s.userData.o = [rng(r, x0, x1), rng(r, y0, y1), rng(r, z0, z1)]; s.userData.u = i / n; g.add(s); puffs.push(s); }
    g.userData = { dynamic: true, tick(f) { for (const s of puffs) { const k = (s.userData.u + f * 0.012) % 1, o = s.userData.o; s.position.set(o[0] + dir.x * k * L * 0.5, o[1] + dir.y * k * L * 0.5, o[2] + dir.z * k * L * 0.5); s.scale.setScalar(0.6 + k * 1.2); } } };
    g.userData.tick(0); return g;
  },
  /** the TOASTER CLASS of another level: its block with a GLOW dot that shows once armed and hops at the pop */
  popper(K, p) {
    const g = EXTRA.block(K, Object.assign({}, p, { soft: false })), h = Math.max(0.04, p.h || 0.3);
    const dot = puff(0.03, glowWarm(K), 0, h + 0.05, 0, { noInk: true }); dot.userData.shape = 'GLOW'; dot.visible = false; g.add(dot);
    g.userData = { dynamic: true, popT: -9, arm(on) { dot.visible = on; }, pop(t12) { g.userData.popT = t12; }, tick(f, t12) { const dt = t12 - g.userData.popT; dot.position.y = h + 0.05 + ((dt >= 0 && dt < 0.5) ? 0.25 : 0); } };
    return g;
  },
  /** a SLICE of another level's pop: the toast's slab in the level's colour (a cola gout, an eraser, dough, a banana, a sheet); tumbles on twos */
  slice(K, color) {
    const M = K.M, pal = K.pal, g = new THREE.Group(); g.add(slab(0.11, 0.10, 0.012, M.furn(pal[color] || pal.stock, { hatch: 0.4 }), 0, 0, 0));
    g.userData = { dynamic: true, spin: 0, tick(f) { g.rotation.x = f * g.userData.spin; g.rotation.z = f * g.userData.spin * 0.6; } }; return g;
  },
  /** an EFFECT box (the wet class): three steam PUFFs bobbing in the box on twos; no ink, no collider */
  effect(K, p, r) {
    const M = K.M, g = new THREE.Group(), puffs = [];
    for (let i = 0; i < 3; i++) { const s = puff(0.07 + i * 0.02, M.steam, rng(r, -p.w / 2, p.w / 2), rng(r, 0.1, Math.max(0.2, (p.h || 1) - 0.1)), rng(r, -p.d / 2, p.d / 2), { ico: 1 }); g.add(s); puffs.push(s); }
    g.userData = { dynamic: true, tick(f) { puffs.forEach((s, i) => { s.position.y += Math.sin((f + i * 4) * 0.5) * 0.004; s.rotation.y = f * 0.1; }); } }; return g;
  },
  /** a BELT: a rubber SLAB, flat or a ramp from its near edge to its far edge (the escalator up, the slide down), with stock dashes ticking along it on twos */
  belt(K, p) {
    const M = K.M, g = new THREE.Group(), w = p.w || 0.6, d = p.d || 2, c = p.carry || {}, ramp = c.ramp, yN = ramp ? ramp[0] : (p.h || 0.8), yF = ramp ? ramp[1] : (p.h || 0.8);
    const L = Math.hypot(d, yF - yN), ang = Math.atan2(yF - yN, d);                        // the top face from the near edge (z +d/2) to the far edge (z −d/2)
    const top = new THREE.Group(); top.position.set(0, (yN + yF) / 2, 0); top.rotation.x = ang; g.add(top);
    top.add(slab(w, 0.06, L, M.rubberObj, 0, -0.03, 0)); const dashes = [], nd = Math.max(3, Math.round(L / 0.5));
    for (let i = 0; i < nd; i++) { const s = slab(w - 0.1, 0.012, 0.06, M.furn('stock'), 0, 0.006, 0, { noInk: true }); top.add(s); dashes.push(s); }
    for (const sz of [-1, 1]) { const y = sz < 0 ? yF : yN; if (y > 0.1) g.add(slabB(w, y - 0.03, 0.08, M.steel, 0, 0, sz * (d / 2 - 0.04))); }   // the legs, or the ramp's ends
    const spd = c.speed || 0.5;
    g.userData = { dynamic: true, tick(f) { dashes.forEach((s, i) => { const u = ((i / nd) + (f * spd / 12) / L) % 1; s.position.z = L / 2 - u * L; }); } }; g.userData.tick(0); return g;
  },
  /** a HOOP: a tangerine RING facing the run at its height, a stock SLAB backboard behind it, a ROD hanging it from the rafters */
  hoop(K, p) {
    const M = K.M, g = new THREE.Group(), r = p.ring.r, y = p.ring.y;
    g.add(ring(r, 0.02, M.furn('tangerine'), 0, y, 0)); g.add(slab(1.2, 0.9, 0.03, M.furn('stock'), 0, y + 0.35, -r - 0.1)); g.add(rod(0.02, 3.0, M.steel, 0, y + 0.8, -r - 0.1)); return g;
  },
  /** a LANDING: a CUSHION in the zone's hue that dips on BOING (the pallet, the bundles) or just sits (the beanbags, the ice mound) */
  landing(K, p) {
    const M = K.M, pal = K.pal, g = new THREE.Group(), w = p.w || 3, h = Math.max(0.1, p.h || 0.9), d = p.d || 3;
    const mat = cushionB(w, h, d, M.furn(pal[p.color] || pal.cobalt, { keyMix: 0.4 }), 0, 0, 0); g.add(mat);
    g.userData = { dynamic: true, dipT: -9, boing(t12) { g.userData.dipT = t12; }, tick(f, t12) { const dt = t12 - g.userData.dipT; mat.scale.y = (dt >= 0 && dt < 0.25) ? 0.8 : 1; } }; return g;
  },  /* ───────────── design pass 9: A LITTLE MORE LIFE (jumpr t50): THE WALL DECOR. Every piece hangs flat on a wall's face: built facing +z with its
     back on z = 0 and its base on y = 0, at most 3 cm proud of the wall (the trim's own depth: the plane's centre keeps 0.12 m off a wall and its
     wing tip reaches 0.09, so nothing this thin is ever clipped) and with no collider (h: 0), so the physics record stays byte for byte. The prints
     are drawn on a canvas with the room's own palette, as THE PLANE's prints are, one texture per art, lit flat like a printed page. ───────────── */
  /** a FRAMED PRINT (clutter 0.6): four SLABs of frame in a slot colour, the print 9 mm behind the frame's face; `tilt` hangs it crooked */
  print(K, p) {
    const M = K.M, g = new THREE.Group(), w = p.w || 0.5, h = p.tall || 0.4, f = p.frame ?? 0.035, d = 0.025, fr = M.furn(p.color || 'stock');
    g.add(slab(w, f, d, fr, 0, f / 2, d / 2)); g.add(slab(w, f, d, fr, 0, h - f / 2, d / 2)); g.add(slab(f, h - 2 * f, d, fr, -w / 2 + f / 2, h / 2, d / 2)); g.add(slab(f, h - 2 * f, d, fr, w / 2 - f / 2, h / 2, d / 2));
    g.add(slab(w - 2 * f + 0.01, h - 2 * f + 0.01, 0.006, artMat(K, p.art, w - 2 * f, h - 2 * f), 0, h / 2, 0.012, { noInk: true }));
    if (p.tilt) g.rotation.z = p.tilt; return g;
  },
  /** a POSTER (clutter 0.6): the print itself, 4 mm thick with its own ink outline, four pins as PUFFs in a spot colour */
  poster(K, p) {
    const M = K.M, g = new THREE.Group(), w = p.w || 0.5, h = p.tall || 0.7;
    g.add(slabB(w, h, 0.004, artMat(K, p.art, w, h), 0, 0, 0.002, { inkMul: 0.7 }));
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, 0], [1, 0]]) g.add(puff(0.011, M.furn(p.color || 'red'), sx * (w / 2 - 0.03), sy ? h - 0.03 : 0.03, 0.008, { inkMul: 0.5 }));
    if (p.tilt) g.rotation.z = p.tilt; return g;
  },
  /** THE HALL MIRROR (fixtures, furniture 0.7): an arched frame CUTOUT in a spot colour, 3 cm deep, the kit's pale glass with the floor a shade deeper in it, three GLARE strokes */
  wallMirror(K, p) {
    const M = K.M, g = new THREE.Group(), w = p.w || 0.5, h = p.tall || 0.9, f = 0.05;
    const arch = (hw, y0, top) => { const s = new THREE.Shape(); s.moveTo(-hw, y0); s.lineTo(hw, y0); s.lineTo(hw, top - hw); s.absarc(0, top - hw, hw, 0, Math.PI, false); s.lineTo(-hw, y0); return s; };
    const outer = arch(w / 2, 0, h); outer.holes.push(arch(w / 2 - f, f, h - f)); g.add(cutout(outer, 0.03, M.furn(p.color || 'cobalt'), 0, 0, 0, { curve: 16 }));
    g.add(cutout(arch(w / 2 - f, f, h - f), 0, M.mirror, 0, 0, 0.012, { curve: 16 }));
    const fl = f + (h - 2 * f) * 0.42; g.add(cutout([[-w / 2 + f, f], [w / 2 - f, f], [w / 2 - f, fl], [-w / 2 + f, fl]], 0, M.furn('#b9d0da', { hatch: 0, keyMix: 0.4 }), 0, 0, 0.014, { noInk: true }));   // the floor in the glass
    const gl = glare(M, w * 0.75, h * 0.5, 3); gl.position.set(0, h * 0.56, 0.02); g.add(gl); return g;
  },
  /** a WINDOW (design pass 10, decor: ≤ 3 cm proud, no collider): a stock frame around a pane drawn unlit as daylight (a sky band over a hedge band,
   *  the horizon at 62 % of the height), a cross of muntins, three glare strokes (the style's glass), two sheer curtains 2 cm proud beside the frame.
   *  The wall behind it is solid, so a plane that flies at it bonks off it: what a closed window does. */
  window(K, p) {
    const M = K.M, P = K.pal, g = new THREE.Group(), w = p.w || 1.2, h = p.tall || 1.4, f = 0.06, d = 0.03, fr = M.furn('stock');
    const sky = unlit(K, mix(P.cyan, '#ffffff', 0.62)), green = unlit(K, mix(P.hedge, P.lawn, 0.45)), iw = w - 2 * f, ih = h - 2 * f, hz = 0.38;
    g.add(slab(iw, ih * (1 - hz), 0.004, sky, 0, f + ih * hz + ih * (1 - hz) / 2, 0.006, { noInk: true }));
    g.add(slab(iw, ih * hz, 0.004, green, 0, f + ih * hz / 2, 0.006, { noInk: true }));
    g.add(slab(w, f, d, fr, 0, f / 2, d / 2)); g.add(slab(w, f, d, fr, 0, h - f / 2, d / 2)); g.add(slab(f, ih, d, fr, -w / 2 + f / 2, h / 2, d / 2)); g.add(slab(f, ih, d, fr, w / 2 - f / 2, h / 2, d / 2));
    g.add(slab(0.03, ih, 0.02, fr, 0, h / 2, 0.012)); g.add(slab(iw, 0.03, 0.02, fr, 0, h / 2, 0.012));   // the muntins
    const gl = glare(M, iw * 0.8, ih * 0.6, 3); gl.position.set(0, h * 0.6, 0.014); g.add(gl);
    const cm = M.furn('#f1e9dc', { keyMix: 0.2 }); for (const s of [-1, 1]) g.add(slab(0.25, h + 0.16, 0.02, cm, s * (w / 2 + 0.08), h / 2 + 0.02, 0.02));   // the curtains
    return g;
  },
  /** BUNTING (clutter 0.6): a string of flags along a wall, sagging between its two hooks; CUTOUT triangles in the process set and the stock, swaying on twos */
  bunting(K, p) {
    const M = K.M, g = new THREE.Group(), w = p.w || 3, sag = p.sag ?? 0.2, n = p.n || 9, hues = ['cyan', 'magenta', 'yellow', 'stock'], flags = [];
    const y = u => -sag * (1 - (2 * u / w) ** 2);                                                                   // the string: a parabola from hook to hook
    const pts = []; for (let i = 0; i <= 12; i++) { const u = -w / 2 + w * i / 12; pts.push([u, y(u), 0.012]); } g.add(bent(pts, 0.005, M.rubberObj, 12, { noInk: true }));
    for (const sx of [-1, 1]) g.add(puff(0.014, M.steel, sx * w / 2, 0, 0.01, { inkMul: 0.5 }));                                                 // the hooks
    for (let i = 0; i < n; i++) { const u = -w / 2 + w * (i + 0.5) / n, fw = 0.14, fh = 0.17;
      const fl = cutout([[-fw / 2, 0], [fw / 2, 0], [0, -fh]], 0.006, M.furn(hues[i % 4], { hatch: 0.2 }), u, y(u) - 0.003, 0.008, { inkMul: 0.7 }); fl.userData.base = (i % 2 ? 1 : -1) * 0.05; fl.rotation.z = fl.userData.base; g.add(fl); flags.push(fl); }
    g.userData = { dynamic: true, tick(f) { flags.forEach((fl, i) => { fl.rotation.z = fl.userData.base + Math.sin(f * 0.7 + i * 1.3) * 0.045; }); } }; return g;
  },
};
/** the kit's prop ids whose builders animate them (never merged) */
export const KIT_DYNAMIC = new Set(['storm door', 'kettle', 'drum fan', 'sprinkler', 'palms', 'cardinal']);
