/* game/prints.js — THE PLANE's five prints (design pass 1 §4.5): NAPKIN · NOTEBOOK PAGE · PAGE ONE · CARDSTOCK · FOIL.
 * The silhouette never changes: only the two printed sides (canvas textures on the kit's materials) and the sheet's colour and gloss.
 * PAGE ONE is the kit's own (kit/paper-plane.js draws it); the others are drawn here on the same net, so the folds fall where the kit's do.
 *   applyPrint(plane, kind)   kind: 'napkin' | 'notebook' | 'pageone' | 'cardstock' | 'foil'
 */
import { THREE, canvasTexture, mix } from '../kit/comic3d.js';
import { PALETTE } from '../kit/page-one-spec.js';

const TEX = 2048;
const FONT = '"Bangers", Impact, "Arial Black", sans-serif';
const cache = new WeakMap();   // plane → { original: {a, b, color}, textures: { kind: {a, b} } }

function creases(ctx, U, F, S, ink, alpha, n = 2) {   // the kit's crease memory: old folds radiating from the nose, on both wings
  ctx.save(); ctx.strokeStyle = ink; ctx.globalAlpha = alpha; ctx.lineWidth = 0.025 * S; ctx.lineCap = 'round';
  for (const sd of ['L', 'R']) for (const f of n === 2 ? [0.34, 0.68] : [0.22, 0.5, 0.78]) {
    const R = U['R' + sd], Ft = U['Ft' + sd]; const e = [R[0] + (Ft[0] - R[0]) * f, R[1] + (Ft[1] - R[1]) * f];
    const a = F.toPx(e[0] * 0.10, e[1] * 0.10), b = F.toPx(e[0] * 0.965, e[1] * 0.965); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
  }
  ctx.restore();
}
const DRAW = {
  napkin(plane) {   // stock, no print, soft creases: the paper you start with
    const { net, frame: F } = plane.userData, S = F.s, U = net.pts;
    const side = () => canvasTexture(TEX, TEX, ctx => { ctx.fillStyle = PALETTE.stock; ctx.fillRect(0, 0, TEX, TEX); creases(ctx, U, F, S, PALETTE.ink, 0.18, 3); });
    return { a: side(), b: side(), color: PALETTE.stock };
  },
  notebook(plane) {  // a ruled page: blue rules, a red margin
    const { frame: F } = plane.userData, S = F.s;
    const side = (margin) => canvasTexture(TEX, TEX, ctx => { ctx.fillStyle = '#fbfcf7'; ctx.fillRect(0, 0, TEX, TEX);
      ctx.strokeStyle = mix(PALETTE.cyan, '#ffffff', 0.45); ctx.lineWidth = 0.018 * S; for (let v = -1; v < 9; v += 0.42) { const p = F.toPx(-6, v); ctx.beginPath(); ctx.moveTo(0, p[1]); ctx.lineTo(TEX, p[1]); ctx.stroke(); }
      ctx.strokeStyle = mix(PALETTE.magenta, '#ff4040', 0.5); ctx.lineWidth = 0.03 * S; const m = F.toPx(margin, 0); ctx.beginPath(); ctx.moveTo(m[0], 0); ctx.lineTo(m[0], TEX); ctx.stroke();
      ctx.fillStyle = PALETTE.ink; for (let v = 0.2; v < 8; v += 1.1) { const h = F.toPx(margin - 0.5, v); ctx.beginPath(); ctx.arc(h[0], h[1], 0.07 * S, 0, Math.PI * 2); ctx.fill(); } });   // the holes
    return { a: side(-3.9), b: side(3.6), color: '#fbfcf7' };
  },
  cardstock(plane) {  // PAGE ONE's print on a tangerine sheet
    const { frame: F, net, textures } = plane.userData, S = F.s, U = net.pts, tan = '#ff8a2a';
    const a = canvasTexture(TEX, TEX, ctx => { ctx.fillStyle = tan; ctx.fillRect(0, 0, TEX, TEX); creases(ctx, U, F, S, PALETTE.ink, 0.28);
      const cen = F.toPx(U.RL[0] < 0 ? -1.72 : 1.72, 5.6), r = 0.66 * S; ctx.fillStyle = PALETTE.magenta; ctx.beginPath(); ctx.arc(cen[0], cen[1], r, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 0.07 * S; ctx.strokeStyle = PALETTE.ink; ctx.stroke();
      ctx.save(); ctx.translate(cen[0], cen[1]); if (!plane.userData.seesA) ctx.scale(-1, 1); ctx.font = `${Math.round(1.05 * S)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 0.09 * S; ctx.strokeStyle = PALETTE.ink; ctx.strokeText('1', 0, 0.04 * S); ctx.fillStyle = PALETTE.stock; ctx.fillText('1', 0, 0.04 * S); ctx.restore(); });
    return { a, b: textures.b, color: tan };
  },
  foil(plane) {   // steel, a diagonal light streak, the spec dot on
    const { frame: F, net } = plane.userData, S = F.s, U = net.pts, steel = '#b9c0c6';
    const side = () => canvasTexture(TEX, TEX, ctx => { ctx.fillStyle = steel; ctx.fillRect(0, 0, TEX, TEX);
      const gr = ctx.createLinearGradient(0, TEX, TEX, 0); gr.addColorStop(0.3, steel); gr.addColorStop(0.5, '#eef2f5'); gr.addColorStop(0.7, steel); ctx.fillStyle = gr; ctx.fillRect(0, 0, TEX, TEX); creases(ctx, U, F, S, PALETTE.ink, 0.12); });
    return { a: side(), b: side(), color: steel, spec: 1, gloss: 40, rim: 0.6 };
  },
};
export function applyPrint(plane, kind) {
  const u = plane.userData, ms = u.materials; let c = cache.get(plane);
  if (!c) { c = { original: { a: ms.stock.uniforms.uMap.value, b: ms.print.uniforms.uMap.value, color: '#' + ms.stock.uniforms.uColor.value.getHexString() }, textures: {} }; cache.set(plane, c); }
  const set = (a, b, color, spec = 0, gloss = 48, rim = 0.5) => { for (const [m, t] of [[ms.stock, a], [ms.print, b]]) { m.uniforms.uMap.value = t; m.uniforms.uHasMap.value = t ? 1 : 0; m.uniforms.uColor.value.set(color); m.uniforms.uSpec.value = spec; m.uniforms.uGloss.value = gloss; m.uniforms.uRim.value = rim; } };
  if (kind === 'pageone' || !DRAW[kind]) { set(c.original.a, c.original.b, c.original.color); return kind === 'pageone'; }
  let t = c.textures[kind]; if (!t) { t = DRAW[kind](plane); for (const x of [t.a, t.b]) { x.anisotropy = 8; x.needsUpdate = true; } c.textures[kind] = t; }
  set(t.a, t.b, t.color, t.spec || 0, t.gloss || 48, t.rim ?? 0.5); return true;
}
