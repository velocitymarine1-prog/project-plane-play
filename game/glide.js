/* game/glide.js — the paper plane's flight through THE HOUSE: the game's physics · 25 September 2026 (design pass 4)
 *
 * A port of the pass-3 model (tools/design-pass-3/glide-pace.mjs = the kit's glide.js + design pass 1's soft obstacles + pass 2's
 * BONK, THE TOASTER and the smoke + pass 3's trampoline and second yard), reading level/house.js instead of the kit's scenes, with
 * the passes' switches always on. The arithmetic is the model's step for step (the speed from the gauge, the 120 Hz Euler step,
 * the collision order), so tools/ladder.mjs can replay the model's lines through this file and land on the model's numbers.
 * Two additions, neither of which moves a path: an `events` list for the playback's lettering, and the collider's kind and
 * class stored on the collider instead of parsed from its id.
 *
 *   const st = stage();                                  // the colliders, the launch, the finish, the checkpoints
 *   simulate(st, { x, yaw, loft, power }, card)          // → { result, id, path:[[x,y,z,t]…], t, events, bonks, scrapes, … }
 *   progressOf(st, path)                                 // the high-water mark, metres from the hand
 */
import { LEVEL, hitOf } from '../level/house.js';

const R = LEVEL.plane.radius, T = 0.12;                                   // the plane's radius, the walls' thickness
const ROUND = { grill: 0.32, swingPost: 0.06, pendant: 0.14, floorLamp: 0.19, plant: 0.3, eggChair: 0.45, sideTable: 0.23, kettlebell: 0.12, paperTowel: 0.08, faucet: 0.05, kettle: 0.1, bowl: 0.11 };
const BASE_Y = { upperRun: 1.42, faucet: 0.94, dishRack: 0.94, paperTowel: 0.94, bowl: 0.94, breadBox: 0.92, knifeBlock: 0.92 };

function propColliders(sc, p, z0) {
  const out = [], z = p.z + z0, y0 = p.y ?? BASE_Y[p.kind] ?? 0, id = sc.key + '/' + p.id, kind = p.kind, hit = p.hit || hitOf(p.kind);
  const box = (o) => out.push(Object.assign({ type: 'box', id, kind, hit, ry: 0 }, o));
  const cyl = (o) => out.push(Object.assign({ type: 'cyl', id, kind, hit }, o));
  if (p.picture) return out;                                              // a landmark the drone sees, not an obstacle (the swing set)
  if (p.kind === 'door' || p.kind === 'stormDoor') {
    const sign = p.hinge === 'L' ? -(p.into || 1) : (p.into || 1); const ry = (p.ry || 0) + (p.open || 0) * Math.PI / 180 * sign;
    const dir = p.kind === 'door' ? 1 : -1;
    const cx = p.x + dir * (p.w / 2) * Math.cos(ry), cz = z - dir * (p.w / 2) * Math.sin(ry);
    box({ cx, cz, w: p.w, d: 0.06, ry, y0: 0, y1: p.h });
  } else if (p.kind === 'pendant') {
    cyl({ cx: p.x, cz: z, r: ROUND.pendant, y0: y0 - p.h, y1: y0 });
  } else if (p.kind === 'upperRun') {
    box({ cx: p.x, cz: z, w: p.w, d: p.d, y0, y1: y0 + p.h });
  } else if (p.kind === 'oak') {
    cyl({ id: id + ' trunk', cx: p.x, cz: z, r: 0.35, y0: 0, y1: 4 }); out.push({ type: 'sphere', id: id + ' canopy', kind, hit, cx: p.x, cy: 5.2, cz: z, r: 2.6 });
  } else if (p.kind === 'palms') {
    for (const [dx, dz] of [[-2.6, 0.5], [0.6, -0.4], [3.0, 0.8]]) cyl({ cx: p.x + dx * 1.3, cz: z + dz * 1.3, r: 0.22, y0: 0, y1: 12 });
  } else if (p.kind === 'fence') {
    const g = p.gateW / 2; box({ id: id + ' L', cx: p.x - p.w / 4 - g / 2, cz: z, w: p.w / 2 - g, d: 0.15, y0: 0, y1: p.h }); box({ id: id + ' R', cx: p.x + p.w / 4 + g / 2, cz: z, w: p.w / 2 - g, d: 0.15, y0: 0, y1: p.h });
  } else if (p.kind === 'clothesline') {
    for (const sx of [-1, 1]) cyl({ id: id + ' post', cx: p.x + sx * p.w / 2, cz: z, r: 0.05, y0: 0, y1: p.h });
    box({ id: id + ' line', cx: p.x, cz: z, w: p.w, d: 0.04, y0: p.lineY - 0.02, y1: p.lineY + 0.02 });
    for (const it of p.items) box({ id: id + ' washing', cx: (it.x[0] + it.x[1]) / 2, cz: z, w: it.x[1] - it.x[0], d: 0.06, y0: it.y, y1: p.lineY });
  } else if (p.kind === 'sprinkler') {
    box({ cx: p.x, cz: z, w: p.w, d: p.d, y0: 0, y1: p.h, effect: 'soggy' });
  } else if (p.kind === 'hedge') {
    box({ cx: p.x, cz: z, w: p.w, d: p.d, y0: 0, y1: p.h });
  } else if (p.kind === 'screenCage') {
    const x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, zf = z + p.d / 2, zb = z - p.d / 2, n = 4, pw = p.w / n;
    for (let i = 0; i < n; i++) { const cx = x0 + pw * (i + 0.5); if (Math.abs(cx - p.doorAt) > 0.01) box({ id: id + ' panel', cx, cz: zb, w: pw, d: 0.04, y0: 0, y1: p.h }); }
    box({ id: id + ' top', cx: p.x, cz: zb, w: p.w, d: 0.06, y0: p.h - 0.6, y1: p.h + 0.1 });
    box({ id: id + ' side L', cx: x0, cz: (zf + zb) / 2, w: 0.04, d: p.d, y0: 0, y1: p.h }); box({ id: id + ' side R', cx: x1, cz: (zf + zb) / 2, w: 0.04, d: p.d, y0: 0, y1: p.h });
    box({ id: id + ' roof', cx: p.x, cz: (zf + zb) / 2, w: p.w, d: p.d, y0: p.h, y1: p.h + 0.1 });
    if (p.doorAt != null) box({ id: id + ' door leaf', cx: p.doorAt + p.doorW / 2, cz: zb + p.doorW / 2, w: 0.05, d: p.doorW, y0: 0, y1: 2.0 });
  } else if (p.kind === 'screenPorch') {                                  // the lanai's cage with doors (or torn panels) on its far side
    const x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, zf = z + p.d / 2, zb = z - p.d / 2, H = p.h;
    const cuts = (p.doors || []).map(d => [d.x - d.w / 2, d.x + d.w / 2, d]).sort((a, b) => a[0] - b[0]); let u = x0;
    for (const [c0, c1, d] of cuts) { if (c0 - u > 0.05) box({ id: id + ' panel', cx: (u + c0) / 2, cz: zb, w: c0 - u, d: 0.04, y0: 0, y1: H }); if (!d.torn) box({ id: id + ' top', cx: d.x, cz: zb, w: d.w, d: 0.06, y0: d.h || 2.0, y1: H + 0.1 }); u = c1; }
    if (x1 - u > 0.05) box({ id: id + ' panel', cx: (u + x1) / 2, cz: zb, w: x1 - u, d: 0.04, y0: 0, y1: H });
    box({ id: id + ' side L', cx: x0, cz: (zf + zb) / 2, w: 0.04, d: p.d, y0: 0, y1: H }); box({ id: id + ' side R', cx: x1, cz: (zf + zb) / 2, w: 0.04, d: p.d, y0: 0, y1: H });
    box({ id: id + ' roof', cx: p.x, cz: (zf + zb) / 2, w: p.w, d: p.d, y0: H, y1: H + 0.1 });
  } else if (p.kind === 'swingSet' && p.collide === 'parts') {              // the A-frames and the bar as one box each, the seats as clutter
    for (const sx of [-1, 1]) box({ id: id + ' frame', cx: p.x + sx * p.w / 2, cz: z, w: 0.14, d: 1.5, y0: 0, y1: p.h });
    box({ id: id + ' bar', cx: p.x, cz: z, w: p.w, d: 0.1, y0: p.h - 0.15, y1: p.h + 0.05 });
    for (const sx of [-0.75, 0.75]) { box({ id: id + ' seat', cx: p.x + sx, cz: z, w: 0.5, d: 0.2, y0: 0.42, y1: 0.5 }); box({ id: id + ' rope', cx: p.x + sx, cz: z, w: 0.5, d: 0.04, y0: 0.5, y1: p.h - 0.15 }); }
  } else if (ROUND[p.kind]) {
    cyl({ cx: p.x, cz: z, r: ROUND[p.kind], y0, y1: y0 + p.h });
  } else if (p.h > 0) {
    box({ cx: p.x, cz: z, w: p.w, d: p.d, ry: p.ry || 0, y0, y1: y0 + p.h });
  }
  if (p.boost && p.boost.accel) { const w = p.boost, n = Math.hypot(...w.dir) || 1; out.push({ type: 'wind', kind: w.kind, id: id + ' ' + w.kind, x0: w.x[0], x1: w.x[1], y0: w.y[0], y1: w.y[1], z0: w.z[0] + z0, z1: w.z[1] + z0, dir: w.dir.map(v => v / n), accel: w.accel }); }
  return out;
}
function wallCollider(sc, wl, z0) {
  const [ax, az] = wl.a, [bx, bz] = wl.b, L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
  const openings = (wl.openings || []).map(o => {
    const cut = [{ u0: o.at - o.w / 2, u1: o.at + o.w / 2, y0: o.sill, y1: o.sill + o.h }];
    if (o.kind === 'slider') { const half = o.w / 2; cut[0] = o.open === 'right' ? { u0: o.at, u1: o.at + half, y0: o.sill, y1: o.sill + o.h } : o.open === 'left' ? { u0: o.at - half, u1: o.at, y0: o.sill, y1: o.sill + o.h } : null; }
    return cut[0];
  }).filter(Boolean);
  return { type: 'wall', id: sc.key + '/wall ' + wl.id, kind: 'wall', hit: 'hard', ax, az: az + z0, ux, uz, L, h: wl.h, openings, glass: (wl.openings || []).some(o => o.kind === 'slider') };
}
/** every collider of the level, in the run frame, in the model's order (props, walls, ceilings, ponds; scene by scene) */
export function allColliders() {
  const out = [];
  for (const sc of LEVEL.scenes) {
    const z0 = LEVEL.place[sc.key];
    for (const p of sc.props) out.push(...propColliders(sc, p, z0));
    for (const wl of sc.walls) out.push(wallCollider(sc, wl, z0));
    for (const c of sc.ceilings) out.push({ type: 'ceiling', id: sc.key + '/ceiling', kind: 'ceiling', hit: 'hard', x0: c.x[0], x1: c.x[1], z0: c.z[0] + z0, z1: c.z[1] + z0, y: c.y });
    for (const f of sc.floors) if (f.mat === 'pond') out.push({ type: 'pond', id: sc.key + '/' + (f.id || 'pond'), kind: 'pond', hit: 'water', x0: f.x[0], x1: f.x[1], z0: f.z[0] + z0, z1: f.z[1] + z0 });
  }
  return out;
}
/** the stage: the launch, the finish, the colliders, the checkpoints, the length */
export function stage(colliders = allColliders()) {
  return { launch: LEVEL.launch, gate: LEVEL.finish, colliders, checkpoints: LEVEL.checkpoints, length: LEVEL.length };
}
/** how far a flight got: the high-water mark, metres from the hand */
export const progressOf = (st, path) => Math.max(0, st.launch.z - Math.min(...path.map(p => p[2])));

/* ───────────── collision ───────────── */
function hitBox(c, x, y, z) {
  if (y < c.y0 - R || y > c.y1 + R) return false;
  const dx = x - c.cx, dz = z - c.cz, s = Math.sin(c.ry), co = Math.cos(c.ry);
  const lx = dx * co - dz * s, lz = dx * s + dz * co;
  return Math.abs(lx) < c.w / 2 + R && Math.abs(lz) < c.d / 2 + R;
}
function hitWall(c, x, y, z) {
  const dx = x - c.ax, dz = z - c.az, u = dx * c.ux + dz * c.uz, v = -dx * c.uz + dz * c.ux;
  if (u < -R || u > c.L + R || Math.abs(v) > T / 2 + R || y > c.h + R) return false;
  for (const o of c.openings) if (u > o.u0 + R && u < o.u1 - R && y > o.y0 + R && y < o.y1 - R) return false;
  return true;
}
/** what the plane touches at (x, y, z), if anything: { result, id, c }, in the colliders' order. A soft prop the plane is already moving
 *  away from (its nearest face behind the plane: it was deflected a step ago, or the plane skims under it) does not answer, so a wall standing
 *  behind that prop still does (pass 6: the model and the first port let a plane skimming under the cabinets against the back wall through the wall). */
export function contact(colliders, x, y, z, vx = 0, vy = 0, vz = 0) {
  for (const c of colliders) {
    let hit = null;
    switch (c.type) {
      case 'box': if (hitBox(c, x, y, z)) hit = { result: 'crumple', id: c.id, c }; break;
      case 'cyl': if (y > c.y0 - R && y < c.y1 + R && (x - c.cx) ** 2 + (z - c.cz) ** 2 < (c.r + R) ** 2) hit = { result: 'crumple', id: c.id, c }; break;
      case 'sphere': if ((x - c.cx) ** 2 + (y - c.cy) ** 2 + (z - c.cz) ** 2 < (c.r + R) ** 2) hit = { result: 'crumple', id: c.id, c }; break;
      case 'wall': if (hitWall(c, x, y, z)) hit = { result: 'crumple', id: c.id, c }; break;
      case 'ceiling': if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y > c.y - R) hit = { result: 'bonk', id: c.id, c }; break;
      case 'pond': if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y < R) hit = { result: 'splash', id: c.id, c }; break;
    }
    if (!hit) continue;
    if ((c.hit === 'soft' || c.hit === 'furniture') && c.kind !== 'trampoline') { const n = normalOf(c, x, y, z); if (vx * n[0] + vy * n[1] + vz * n[2] >= 0) continue; }
    return hit;
  }
  if (y < R) return { result: 'land', id: 'floor' };
  return null;
}
/* the normal of a soft prop's surface at the plane (a box's nearest face, a cylinder's side, a sphere's radius) */
function normalOf(c, x, y, z) {
  if (c.type === 'cyl') { const l = Math.hypot(x - c.cx, z - c.cz) || 1; return [(x - c.cx) / l, 0, (z - c.cz) / l]; }
  if (c.type === 'sphere') { const l = Math.hypot(x - c.cx, y - c.cy, z - c.cz) || 1; return [(x - c.cx) / l, (y - c.cy) / l, (z - c.cz) / l]; }
  const dx = x - c.cx, dz = z - c.cz, s = Math.sin(c.ry), co = Math.cos(c.ry); const lx = dx * co - dz * s, lz = dx * s + dz * co, my = (c.y0 + c.y1) / 2;
  const rx = Math.abs(lx) / (c.w / 2 + R), rz = Math.abs(lz) / (c.d / 2 + R), ry = Math.abs(y - my) / ((c.y1 - c.y0) / 2 + R);
  if (ry >= rx && ry >= rz) return [0, Math.sign(y - my) || 1, 0];
  const nlx = rx >= rz ? Math.sign(lx) : 0, nlz = rx >= rz ? 0 : Math.sign(lz);
  return [nlx * co + nlz * s, 0, -nlx * s + nlz * co];
}
/* THE BONK's normal: a ceiling faces down; a wall's face on the side the plane is on (never from the velocity), the head or the
   sill of an opening bounces vertically; a hard prop by its nearest face */
function hardNormal(c, x, y, z) {
  if (c.type === 'ceiling') return [0, -1, 0];
  if (c.type === 'wall') {
    const dx = x - c.ax, dz = z - c.az, u = dx * c.ux + dz * c.uz;
    for (const o of c.openings) if (u > o.u0 && u < o.u1) { if (y >= o.y1 - R) return [0, -1, 0]; if (y <= o.y0 + R) return [0, 1, 0]; }
    const nx0 = -c.uz, nz0 = c.ux, side = dx * nx0 + dz * nz0;
    return side >= 0 ? [nx0, 0, nz0] : [-nx0, 0, -nz0]; }
  return normalOf(c, x, y, z);
}
/** the toast's slices tau seconds after the pop (for the drawing) */
export function toastAt(tau) { const TO = LEVEL.toast; return TO.slices.map(sl => ({ x: TO.x + sl.vx * tau, y: TO.y + sl.u * tau - 0.5 * TO.g * tau * tau, z: TO.z + sl.vz * tau, air: tau <= 2 * sl.u / TO.g })); }

/** one deterministic flight. L = { x (the stance), yaw °, loft ° (one of the five), power 0..1 on the card's gauge }; card = { cap, ratio, damp, trim } */
export function simulate(st, L, card) {
  const G = LEVEL.glide, C = st.colliders, SOFT = LEVEL.soft, BONK = LEVEL.bonk, TOAST = LEVEL.toast, TRAMP = LEVEL.tramp;
  const trim = card.trim ?? G.trim, ratio = card.ratio, damp = card.damp, dt = G.dt, g = G.g;
  const speed = LEVEL.gauge.min + (card.cap - LEVEL.gauge.min) * Math.min(1, Math.max(0, L.power));
  const yaw = L.yaw * Math.PI / 180, pitch = L.loft * Math.PI / 180;
  let x = Math.min(st.launch.x[1], Math.max(st.launch.x[0], L.x)), y = st.launch.y, z = st.launch.z;
  let vx = speed * Math.cos(pitch) * Math.sin(yaw), vy = speed * Math.sin(pitch), vz = -speed * Math.cos(pitch) * Math.cos(yaw);
  const path = [[x, y, z, 0]], events = []; let t = 0, gateZ = st.gate.z, scrapes = 0;
  let bonks = 0, popped = false, tPop = 0, toastHit = false, smoked = false, tSmoke = 0, hardest = 0, boings = 0; const seen = new Set();
  const ev = (kind, id, extra) => events.push(Object.assign({ t, kind, id, x, y, z }, extra));
  const done = (r) => Object.assign({ path, t, events, scrapes, bonks, popped, tPop, toastHit, smoked, tSmoke, hardest, boings, speed, card, throw: L }, r);
  while (t < G.maxT) {
    const s = Math.hypot(vx, vy, vz) || 1e-6, ux = vx / s, uy = vy / s, uz = vz / s;
    const lift = g * (s / trim) ** 2, drag = lift / ratio;
    let nx = -ux * uy, ny = 1 - uy * uy, nz = -uz * uy; const nl = Math.hypot(nx, ny, nz) || 1e-6; nx /= nl; ny /= nl; nz /= nl;
    let ax = lift * nx - drag * ux, ay = lift * ny - drag * uy - g - damp * vy, az = lift * nz - drag * uz;
    for (const c of C) if (c.type === 'wind' && x > c.x0 && x < c.x1 && y > c.y0 && y < c.y1 && z > c.z0 && z < c.z1) {
      ax += c.dir[0] * c.accel; ay += c.dir[1] * c.accel; az += c.dir[2] * c.accel;
      if (c.kind === 'smoke' && !smoked) { smoked = true; tSmoke = t; }
      if (!seen.has(c.id)) { seen.add(c.id); ev('wind', c.id, { wind: c.kind }); }
    }
    vx += ax * dt; vy += ay * dt; vz += az * dt;
    const pz = z; x += vx * dt; y += vy * dt; z += vz * dt; t += dt;
    path.push([x, y, z, t]);
    if (pz >= gateZ && z < gateZ) {
      const f = (pz - gateZ) / (pz - z), gx = path[path.length - 2][0] + (x - path[path.length - 2][0]) * f, gy = path[path.length - 2][1] + (y - path[path.length - 2][1]) * f;
      if (gx > st.gate.x[0] + R && gx < st.gate.x[1] - R && gy > st.gate.y[0] + R && gy < st.gate.y[1] - R) { ev('finish', 'the fence line'); return done({ result: 'gate', id: st.gate.note, gx, gy }); }
    }
    /* THE TOASTER: the plane within the trigger sphere pops it once; the slices are moving soft colliders */
    if (!popped) { const dx = x - TOAST.x, dy = y - TOAST.y, dz = z - TOAST.z; if (dx * dx + dy * dy + dz * dz < TOAST.trig * TOAST.trig) { popped = true; tPop = t; ev('pop', 'kitchen/toaster'); } }
    else { const tau = t - tPop;
      for (const sl of TOAST.slices) { if (tau > 2 * sl.u / TOAST.g) continue;
        const sx = TOAST.x + sl.vx * tau, sy = TOAST.y + sl.u * tau - 0.5 * TOAST.g * tau * tau, sz = TOAST.z + sl.vz * tau;
        const dx = x - sx, dy = y - sy, dz = z - sz, d = Math.hypot(dx, dy, dz) || 1e-6;
        if (d < R + TOAST.r) { const n = [dx / d, dy / d, dz / d], vn = vx * n[0] + vy * n[1] + vz * n[2];
          if (vn < 0) { vx -= (1 + TOAST.bounce) * vn * n[0]; vy -= (1 + TOAST.bounce) * vn * n[1]; vz -= (1 + TOAST.bounce) * vn * n[2]; }
          const k = 1 - TOAST.bleed; vx *= k; vy *= k; vz *= k; toastHit = true; scrapes++; ev('crumb', 'kitchen/toast');
          x += n[0] * (R + TOAST.r - d + 0.01); y += n[1] * (R + TOAST.r - d + 0.01); z += n[2] * (R + TOAST.r - d + 0.01);
          if (Math.hypot(vx, vy, vz) < SOFT.minSpeed) { ev('end', 'toast'); return done({ result: 'land', id: 'toast' }); } } } }
    const hit = contact(C, x, y, z, vx, vy, vz);
    if (hit) {
      const c = hit.c, soft = !!c && (c.hit === 'soft' || c.hit === 'furniture'), hard = !!c && c.hit === 'hard';   // the floor and the ponds end the run
      const tn = (c && c.kind === 'trampoline') ? normalOf(c, x, y, z) : null;
      if (tn && tn[1] > 0.5 && vy < 0) {                                  // BOING: the mat throws the plane back up
        vy = Math.min(TRAMP.vmax, -vy * TRAMP.e); vx *= TRAMP.keep; vz *= TRAMP.keep; boings++; y = c.y1 + R + 0.01; ev('boing', c.id);
      } else if (soft) {                                                   // soft: deflect and bleed; furniture crumples head-on
        const n = normalOf(c, x, y, z), sp = Math.hypot(vx, vy, vz) || 1e-6, vn = vx * n[0] + vy * n[1] + vz * n[2];
        if (vn < 0) {
          const cos = -vn / sp;
          if (c.hit === 'furniture' && cos > SOFT.headOn) { ev('end', c.id); return done(Object.assign({}, hit, { result: 'crumple' })); }
          vx -= (1 + SOFT.bounce) * vn * n[0]; vy -= (1 + SOFT.bounce) * vn * n[1]; vz -= (1 + SOFT.bounce) * vn * n[2];
          const k = 1 - SOFT.bleed; vx *= k; vy *= k; vz *= k; scrapes++; ev(c.effect === 'soggy' ? 'soggy' : 'scrape', c.id, { kind2: c.kind });
          x += n[0] * R * 0.6; y += n[1] * R * 0.6; z += n[2] * R * 0.6;
          if (Math.hypot(vx, vy, vz) < SOFT.minSpeed) { ev('end', c.id); return done(Object.assign({}, hit, { result: 'land' })); }
          if (scrapes > SOFT.maxScrapes) { ev('end', c.id); return done(Object.assign({}, hit, { result: 'crumple', id: hit.id + ' (scraped out)' })); }
        }
      } else if (hard && (hit.result === 'crumple' || hit.result === 'bonk')) {   // THE BONK: by angle and force, the run goes on
        const n = hardNormal(c, x, y, z);
        const vn = vx * n[0] + vy * n[1] + vz * n[2];
        if (vn < 0) {
          const sn = -vn, e = Math.max(BONK.eMin, Math.min(BONK.e0, BONK.e0 - BONK.eSlope * sn));
          const tx = vx - vn * n[0], ty = vy - vn * n[1], tz = vz - vn * n[2];
          vx = BONK.mu * tx - e * vn * n[0]; vy = BONK.mu * ty - e * vn * n[1]; vz = BONK.mu * tz - e * vn * n[2];
          bonks++; if (sn > hardest) hardest = sn; ev('bonk', hit.id, { sn, e, n, ceiling: c.type === 'ceiling' });
          const push = c.type === 'ceiling' ? (y - (c.y - R)) + 0.01 : R * 0.6;
          x += n[0] * push; y += n[1] * push; z += n[2] * push;
          if (bonks > BONK.max) { ev('end', hit.id); return done(Object.assign({}, hit, { result: 'crumple', id: hit.id + ' (bonked out)', bonkedOut: true })); }
        }
      } else { ev('end', hit.id); return done(hit); }
    }
    if (vz > -0.2 && s < 1.5) { ev('end', 'stall'); return done({ result: 'land', id: 'stall' }); }
  }
  ev('end', 'time'); return done({ result: 'lost', id: 'time' });
}
/** the letters of a bonk by its speed into the surface (the book's five steps) */
export function bonkLetters(sn) { const B = LEVEL.bonk; let i = 0; while (i < B.steps.length && sn >= B.steps[i]) i++; return { text: B.letters[i], step: i + 1 }; }
/** what a run's end letters, and what stopped it */
export function endLetters(r) {
  const msg = r.result === 'gate' ? 'SWISH!' : r.bonkedOut ? 'BONKED OUT' : LEVEL.results[r.result] || String(r.result).toUpperCase();
  const what = r.id === 'floor' ? 'the floor' : r.id === 'stall' ? 'a stall' : r.id === 'toast' ? 'the toast' : r.id === 'time' ? 'gone' : String(r.id).replace(/ \((bonked|scraped) out\)/, '').split('/').pop().replace(/^wall /, 'the ').replace(/ (L|R)$/, '');
  return { msg, what };
}
