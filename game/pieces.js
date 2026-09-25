/* game/pieces.js — the pieces the kit does not have, built from its alphabet under the shape law · design passes 1–3, built in pass 4
 *
 * THE HAND · TOASTER · TOAST · the open OVEN DOOR and the OVEN SMOKE · SMOKE ALARM · TRAMPOLINE · SWING SET · SHED · GRILL · THE POOL ·
 * THE PENNANT · BONK MARKS · the LOFT FAN · puff bursts (crumbs, drips, soot). Every piece is built at its own origin (base on y = 0,
 * front toward +z) like the kit's, from kit/parts.js shapes only, with materials by role from the room's kit (K). Motion hooks live on
 * userData: dynamic (never merged), tick(f, t12) on twos, and the piece's own verbs (arm, pop, boing, hop, show, set, burst).
 * Nothing in kit/ is edited: EXTRA is the game's own table beside PIECE.
 */
import { THREE, ComicMaterial, canvasTexture, mix, shade, rng, mulberry32 } from '../kit/comic3d.js';
import { slab, slabB, cushion, rod, drum, ring, puff, cutout, dash, glowDrum, glare, bent } from '../kit/parts.js';

const TAU = Math.PI * 2;
const unlit = (K, color) => new ComicMaterial({ world: K.world, unlit: true, color, inkWeight: 0, fog: false });
const smokeMat = K => (K._smoke ||= new ComicMaterial({ world: K.world, color: mix(K.pal.ink, K.pal.stock, 0.72), inkWeight: 0.4, hatch: 0, keyMix: 0.7, shadowMul: 0.9, shadowMix: 0.15, fillAmt: 0.1 }));
const glowWarm = K => (K._glowWarm ||= unlit(K, mix(K.pal.tangerine, K.pal.yellow, 0.45)));

export const EXTRA = {
  /** THE HAND (hero 1.0): a palm CUSHION, four fingers and a thumb as RODs (6 sides), a cobalt cuff; three poses on twos */
  hand(K) {
    const M = K.M, pal = K.pal, g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const skin = M.furn(mix(pal.stock, pal.tangerine, 0.35), { hatch: 0.3, keyMix: 0.4 });
    body.add(cushion(0.13, 0.04, 0.12, skin, 0.01, 0, 0.01));                                                                 // the palm, under the keel
    const th = rod(0.016, 0.085, skin, -0.05, 0.0, 0.0); th.rotation.z = -0.95; th.rotation.x = -0.3; body.add(th);           // the thumb, up the left side of the keel
    for (let i = 0; i < 4; i++) { const f = rod(0.014, 0.075, skin, 0.045 + i * 0.022, 0.0, -0.035 + i * 0.022); f.rotation.z = 0.9 - i * 0.08; f.rotation.x = -0.25; body.add(f); }   // four fingers curling up the right side
    body.add(slabB(0.17, 0.09, 0.13, M.furn('cobalt'), 0.06, -0.06, 0.12, { ry: -0.35 }));                                      // the cuff, from the right shoulder
    body.traverse(o => { if (o.isMesh) o.userData.inkMul = 1.35; });
    const poses = [{ rx: 0.2, y: 0, z: 0 }, { rx: -0.5, y: 0.02, z: -0.06 }, { rx: -0.95, y: -0.1, z: -0.02 }];
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
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.15, 0.12, -0.2), new THREE.Vector3(-0.12, 0.9, -0.42), new THREE.Vector3(0.1, 1.55, -0.55), new THREE.Vector3(0.55, 1.62, -0.7), new THREE.Vector3(1.1, 1.5, -0.8), new THREE.Vector3(1.6, 1.3, -0.85)]);
    const puffs = []; const N = 7;
    for (let i = 0; i < N; i++) { const s = puff(0.09, m, 0, 0, 0, { ico: 1 }); s.userData.u = i / N; s.userData.jx = rng(r, -0.1, 0.1); s.userData.jz = rng(r, -0.08, 0.08); g.add(s); puffs.push(s); }
    g.userData = { dynamic: true, tick(f) { for (const s of puffs) { const k = (s.userData.u + f * 0.012) % 1; curve.getPointAt(k, s.position); s.position.x += s.userData.jx; s.position.z += s.userData.jz; s.scale.setScalar(0.5 + k * 1.3); s.rotation.y = f * 0.15 + s.userData.u * 6; } } };
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
  /** a pool of PUFFs that bursts from a point (crumbs from the toast, drips from the sprinkler, soot behind a smoked plane), stepping on twos */
  puffBurst(K, o = {}) {
    const g = new THREE.Group(), n = o.n || 6, items = [];
    const mat = o.mat || (o.color ? new ComicMaterial({ world: K.world, color: o.color, inkWeight: 0.5, hatch: 0, keyMix: 0.5 }) : smokeMat(K));
    for (let i = 0; i < n; i++) { const p = puff(o.r || 0.03, mat, 0, 0, 0, { ico: 1 }); p.visible = false; p.userData = { t0: -9, v: new THREE.Vector3() }; g.add(p); items.push(p); }
    let k = 0; const rr = mulberry32(o.seed ?? 101);   // seeded: the same proof URL gives the same frame
    g.userData = { dynamic: true, items, gravity: o.gravity ?? 3, life: o.life ?? 0.7, grow: o.grow ?? 1,
      burst(pos, t12, count = n, spread = 1) { for (let i = 0; i < count; i++) { const p = items[k++ % n]; p.visible = true; p.position.copy(pos); p.userData.t0 = t12; p.userData.v.set((rr() - 0.5) * 1.6 * spread, 1.2 * spread + rr(), (rr() - 0.5) * 1.6 * spread); p.scale.setScalar(1); } },
      tick(f, t12) { for (const p of items) { if (!p.visible) continue; const dt = t12 - p.userData.t0; if (dt > g.userData.life || dt < 0) { p.visible = false; continue; }
        p.position.addScaledVector(p.userData.v, 1 / 12); p.userData.v.y -= g.userData.gravity / 12; const s = g.userData.grow > 1 ? 1 + dt * g.userData.grow : 1 - dt / g.userData.life * 0.6; p.scale.setScalar(Math.max(0.05, s)); } } };
    return g;
  },
};
/** the kit's prop ids whose builders animate them (never merged) */
export const KIT_DYNAMIC = new Set(['storm door', 'kettle', 'drum fan', 'sprinkler', 'palms', 'cardinal']);
