/* glide.js — the paper plane's flight through THE HOUSE, and the solver that proves every stage · 23 September 2026
 *
 * Pure (no Three.js, no DOM): the run page flies with it, the node harness (tools/solve-run.mjs) and the sheet
 * solve with it. Everything is in the RUN frame (metres, −z through the house).
 *
 *   const S = stages();                        // the four stages with their colliders, launch windows, gates
 *   simulate(S[0], { x, yaw, pitch, power })   // → { result, hit, path:[[x,y,z,t]…], t, xEnd }
 *   solve(S[0])                                // → { best:{x,yaw,pitch,power,clear}, count, total, needle }
 *
 * Colliders (from the scene specs + RUN.place): every prop with h > 0 is a box (rotated by ry) or a cylinder
 * by kind; walls are slabs with their openings cut; ceilings bonk; the floor lands (the pond splashes); a fan's
 * wind is a box that pushes. The plane is a sphere of RUN.plane.radius at its centre.
 */
import { SCENES } from './house-spec.js';
import { RUN, toRunZ } from './run-spec.js';

const R = RUN.plane.radius, T = 0.12;                               // plane radius, wall thickness
const ROUND = { pendant: 0.14, floorLamp: 0.19, plant: 0.3, eggChair: 0.45, sideTable: 0.23, kettlebell: 0.12, paperTowel: 0.08, faucet: 0.05, kettle: 0.1, bowl: 0.11 };
const BASE_Y = { upperRun: 1.42, faucet: 0.94, dishRack: 0.94, paperTowel: 0.94, bowl: 0.94, breadBox: 0.92, knifeBlock: 0.92 };   // builders that sit at counter height themselves

function propColliders(sc, p, z0) {
  const out = [], z = p.z + z0, y0 = p.y ?? BASE_Y[p.kind] ?? 0, id = sc.key + '/' + p.id;
  if (p.kind === 'door' || p.kind === 'stormDoor') {                // a leaf swung about its hinge: a thin rotated box
    const sign = p.hinge === 'L' ? -(p.into || 1) : (p.into || 1); const ry = (p.ry || 0) + (p.open || 0) * Math.PI / 180 * sign;
    const dir = p.kind === 'door' ? 1 : -1;                          // door leaf lies along local +x from the hinge, storm door along −x
    const cx = p.x + dir * (p.w / 2) * Math.cos(ry), cz = z - dir * (p.w / 2) * Math.sin(ry);
    out.push({ type: 'box', id, cx, cz, w: p.w, d: 0.06, ry, y0: 0, y1: p.h });
  } else if (p.kind === 'pendant') {                                 // the cone hangs from the ceiling: y from ceil − h to ceil
    out.push({ type: 'cyl', id, cx: p.x, cz: z, r: ROUND.pendant, y0: y0 - p.h, y1: y0 });
  } else if (p.kind === 'upperRun') {
    out.push({ type: 'box', id, cx: p.x, cz: z, w: p.w, d: p.d, ry: 0, y0, y1: y0 + p.h });
  } else if (p.kind === 'oak') {
    out.push({ type: 'cyl', id: id + ' trunk', cx: p.x, cz: z, r: 0.35, y0: 0, y1: 4 }); out.push({ type: 'sphere', id: id + ' canopy', cx: p.x, cy: 5.2, cz: z, r: 2.6 });
  } else if (p.kind === 'palms') {
    for (const [dx, dz] of [[-2.6, 0.5], [0.6, -0.4], [3.0, 0.8]]) out.push({ type: 'cyl', id, cx: p.x + dx * 1.3, cz: z + dz * 1.3, r: 0.22, y0: 0, y1: 12 });
  } else if (p.kind === 'fence') {
    const g = p.gateW / 2; out.push({ type: 'box', id: id + ' L', cx: p.x - p.w / 4 - g / 2, cz: z, w: p.w / 2 - g, d: 0.15, ry: 0, y0: 0, y1: p.h }); out.push({ type: 'box', id: id + ' R', cx: p.x + p.w / 4 + g / 2, cz: z, w: p.w / 2 - g, d: 0.15, ry: 0, y0: 0, y1: p.h });
  } else if (p.kind === 'clothesline') {
    for (const sx of [-1, 1]) out.push({ type: 'cyl', id: id + ' post', cx: p.x + sx * p.w / 2, cz: z, r: 0.05, y0: 0, y1: p.h });
    out.push({ type: 'box', id: id + ' line', cx: p.x, cz: z, w: p.w, d: 0.04, ry: 0, y0: p.lineY - 0.02, y1: p.lineY + 0.02 });
    for (const it of p.items) out.push({ type: 'box', id: id + ' washing', cx: (it.x[0] + it.x[1]) / 2, cz: z, w: it.x[1] - it.x[0], d: 0.06, ry: 0, y0: it.y, y1: p.lineY });
  } else if (p.kind === 'sprinkler') {                               // the head and its wall of water
    out.push({ type: 'box', id, cx: p.x, cz: z, w: p.w, d: p.d, ry: 0, y0: 0, y1: p.h });
  } else if (p.kind === 'hedge') {
    out.push({ type: 'box', id, cx: p.x, cz: z, w: p.w, d: p.d, ry: 0, y0: 0, y1: p.h });
  } else if (p.kind === 'screenCage') {                              // four panels each side; the door panel on the far side is open
    const x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, zf = z + p.d / 2, zb = z - p.d / 2, n = 4, pw = p.w / n;
    for (let i = 0; i < n; i++) { const cx = x0 + pw * (i + 0.5); if (Math.abs(cx - p.doorAt) > 0.01) out.push({ type: 'box', id: id + ' panel', cx, cz: zb, w: pw, d: 0.04, ry: 0, y0: 0, y1: p.h }); }
    out.push({ type: 'box', id: id + ' top', cx: p.x, cz: zb, w: p.w, d: 0.06, ry: 0, y0: p.h - 0.6, y1: p.h + 0.1 });   // the door's head: 2.0 m
    out.push({ type: 'box', id: id + ' side L', cx: x0, cz: (zf + zb) / 2, w: 0.04, d: p.d, ry: 0, y0: 0, y1: p.h }); out.push({ type: 'box', id: id + ' side R', cx: x1, cz: (zf + zb) / 2, w: 0.04, d: p.d, ry: 0, y0: 0, y1: p.h });
    out.push({ type: 'box', id: id + ' roof', cx: p.x, cz: (zf + zb) / 2, w: p.w, d: p.d, ry: 0, y0: p.h, y1: p.h + 0.1 });
    if (p.doorAt != null) out.push({ type: 'box', id: id + ' door leaf', cx: p.doorAt + p.doorW / 2, cz: zb + p.doorW / 2, w: 0.05, d: p.doorW, ry: 0, y0: 0, y1: 2.0 });
  } else if (ROUND[p.kind]) {
    out.push({ type: 'cyl', id, cx: p.x, cz: z, r: ROUND[p.kind], y0, y1: y0 + p.h });
  } else if (p.h > 0) {
    out.push({ type: 'box', id, cx: p.x, cz: z, w: p.w, d: p.d, ry: p.ry || 0, y0, y1: y0 + p.h });
  }
  if (p.boost) { const w = p.boost, n = Math.hypot(...w.dir) || 1; out.push({ type: 'wind', kind: w.kind, id: id + ' ' + w.kind, x0: w.x[0], x1: w.x[1], y0: w.y[0], y1: w.y[1], z0: w.z[0] + z0, z1: w.z[1] + z0, dir: w.dir.map(v => v / n), accel: w.accel }); }
  return out;
}
function wallCollider(sc, wl, z0) {
  const [ax, az] = wl.a, [bx, bz] = wl.b, L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
  const openings = (wl.openings || []).map(o => {
    const cut = [{ u0: o.at - o.w / 2, u1: o.at + o.w / 2, y0: o.sill, y1: o.sill + o.h }];
    if (o.kind === 'slider') { const half = o.w / 2; cut[0] = o.open === 'right' ? { u0: o.at, u1: o.at + half, y0: o.sill, y1: o.sill + o.h } : o.open === 'left' ? { u0: o.at - half, u1: o.at, y0: o.sill, y1: o.sill + o.h } : null; }
    return cut[0];
  }).filter(Boolean);
  return { type: 'wall', id: sc.key + '/wall ' + wl.id, ax, az: az + z0, ux, uz, L, h: wl.h, openings };
}
/** every collider of every scene, in the run frame */
export function allColliders() {
  const out = [];
  for (const sc of SCENES) {
    const z0 = RUN.place[sc.key].z;
    for (const p of sc.props) out.push(...propColliders(sc, p, z0));
    for (const wl of sc.walls) out.push(wallCollider(sc, wl, z0));
    for (const c of sc.ceilings) out.push({ type: 'ceiling', id: sc.key + '/ceiling', x0: c.x[0], x1: c.x[1], z0: c.z[0] + z0, z1: c.z[1] + z0, y: c.y });
    for (const f of sc.floors) if (f.mat === 'pond') out.push({ type: 'pond', id: sc.key + '/pond', x0: f.x[0], x1: f.x[1], z0: f.z[0] + z0, z1: f.z[1] + z0 });
  }
  return out;
}
/** the four stages: scene, run-frame launch window and gate, par */
export function stages(colliders = allColliders()) {
  return RUN.order.map(key => {
    const sc = SCENES.find(s => s.key === key), z0 = RUN.place[key].z;
    return { key, n: sc.n, title: sc.title, caption: sc.caption, par: sc.par, course: sc.course, scene: sc,
      launch: { x: sc.launch.x, y: sc.launch.y, z: sc.launch.z + z0, note: sc.launch.note },
      gate: { z: sc.gate.z + z0, x: sc.gate.x, y: sc.gate.y, note: sc.gate.note }, colliders };
  });
}

/** THE LONG THROW: one launch from the front step, the fence gate 38.5 m away, the rooms' gates as checkpoints */
export function longStage(colliders = allColliders()) {
  const S = stages(colliders), first = S[0], last = S[S.length - 1];
  return { key: 'house', n: 0, title: 'THE LONG THROW', caption: 'One throw, the whole house…', par: RUN.long ? RUN.long.par : 1, scene: first.scene,
    launch: first.launch, gate: last.gate, colliders, start: first.launch.z, length: first.launch.z - last.gate.z,
    checkpoints: S.map(st => ({ key: st.key, title: st.title, z: st.gate.z, at: +(first.launch.z - st.gate.z).toFixed(1), note: st.gate.note })) };
}
/** how far a flight got, in metres from the start of the run */
export const progressOf = (stage, path) => Math.max(0, stage.launch.z - Math.min(...path.map(p => p[2])));

/* ───────────────────────── collision ───────────────────────── */
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
/** what the plane touches at (x, y, z), if anything: { result, id } */
export function contact(colliders, x, y, z) {
  for (const c of colliders) {
    switch (c.type) {
      case 'box': if (hitBox(c, x, y, z)) return { result: 'crumple', id: c.id }; break;
      case 'cyl': if (y > c.y0 - R && y < c.y1 + R && (x - c.cx) ** 2 + (z - c.cz) ** 2 < (c.r + R) ** 2) return { result: 'crumple', id: c.id }; break;
      case 'sphere': if ((x - c.cx) ** 2 + (y - c.cy) ** 2 + (z - c.cz) ** 2 < (c.r + R) ** 2) return { result: 'crumple', id: c.id }; break;
      case 'wall': if (hitWall(c, x, y, z)) return { result: 'crumple', id: c.id }; break;
      case 'ceiling': if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y > c.y - R) return { result: 'bonk', id: c.id }; break;
      case 'pond': if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y < R) return { result: 'splash', id: c.id }; break;
    }
  }
  if (y < R) return { result: 'land', id: 'floor' };
  return null;
}
/** the smallest distance from (x,y,z) to any solid, for the clearance of a line (walls and floor included, wind not) */
export function clearance(colliders, x, y, z) {
  let best = y - R;
  for (const c of colliders) {
    let d = Infinity;
    if (c.type === 'box') { const dx = x - c.cx, dz = z - c.cz, s = Math.sin(c.ry), co = Math.cos(c.ry); const lx = dx * co - dz * s, lz = dx * s + dz * co;
      d = Math.hypot(Math.max(0, Math.abs(lx) - c.w / 2), Math.max(0, Math.abs(lz) - c.d / 2), Math.max(0, c.y0 - y, y - c.y1)); }
    else if (c.type === 'cyl') d = Math.hypot(Math.max(0, Math.hypot(x - c.cx, z - c.cz) - c.r), Math.max(0, c.y0 - y, y - c.y1));
    else if (c.type === 'sphere') d = Math.max(0, Math.hypot(x - c.cx, y - c.cy, z - c.cz) - c.r);
    else if (c.type === 'wall') { const dx = x - c.ax, dz = z - c.az, u = dx * c.ux + dz * c.uz, v = -dx * c.uz + dz * c.ux;
      let inOpen = false; for (const o of c.openings) if (u > o.u0 && u < o.u1 && y > o.y0 && y < o.y1) { inOpen = true; d = Math.hypot(Math.min(u - o.u0, o.u1 - u, o.y1 - y, y - o.y0), Math.max(0, Math.abs(v) - T / 2)); }
      if (!inOpen) d = Math.hypot(Math.max(0, -u, u - c.L), Math.max(0, Math.abs(v) - T / 2), Math.max(0, y - c.h)); }
    else if (c.type === 'ceiling') { if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) d = c.y - y; }
    if (d - R < best) best = d - R;
  }
  return best;
}

/* ───────────────────────── the flight ───────────────────────── */
/** one deterministic flight. L = { x (launch x), yaw °, pitch °, power 0..1 }. */
export function simulate(stage, L) {
  const G = RUN.glide, S = RUN.launch, C = stage.colliders;
  const speed = S.speed[0] + (S.speed[1] - S.speed[0]) * Math.min(1, Math.max(0, L.power));
  const yaw = L.yaw * Math.PI / 180, pitch = L.pitch * Math.PI / 180;
  let x = Math.min(stage.launch.x[1], Math.max(stage.launch.x[0], L.x)), y = stage.launch.y, z = stage.launch.z;
  let vx = speed * Math.cos(pitch) * Math.sin(yaw), vy = speed * Math.sin(pitch), vz = -speed * Math.cos(pitch) * Math.cos(yaw);
  const path = [[x, y, z, 0]]; let t = 0, gateZ = stage.gate.z, minClear = Infinity, wind = 0;
  while (t < G.maxT) {
    const s = Math.hypot(vx, vy, vz) || 1e-6, ux = vx / s, uy = vy / s, uz = vz / s;
    const lift = G.g * (s / G.trim) ** 2, drag = lift / G.ratio;
    // lift is perpendicular to the velocity in the vertical plane through it (the dart flies where it points)
    let nx = -ux * uy, ny = 1 - uy * uy, nz = -uz * uy; const nl = Math.hypot(nx, ny, nz) || 1e-6; nx /= nl; ny /= nl; nz /= nl;
    let ax = lift * nx - drag * ux, ay = lift * ny - drag * uy - G.g - G.damp * vy, az = lift * nz - drag * uz;
    wind = 0;
    for (const c of C) if (c.type === 'wind' && x > c.x0 && x < c.x1 && y > c.y0 && y < c.y1 && z > c.z0 && z < c.z1) { ax += c.dir[0] * c.accel; ay += c.dir[1] * c.accel; az += c.dir[2] * c.accel; wind = 1; }
    vx += ax * G.dt; vy += ay * G.dt; vz += az * G.dt;
    const pz = z; x += vx * G.dt; y += vy * G.dt; z += vz * G.dt; t += G.dt;
    path.push([x, y, z, t]);
    if (pz >= gateZ && z < gateZ) {                                  // crossing the gate plane
      const f = (pz - gateZ) / (pz - z), gx = path[path.length - 2][0] + (x - path[path.length - 2][0]) * f, gy = path[path.length - 2][1] + (y - path[path.length - 2][1]) * f;
      if (gx > stage.gate.x[0] + R && gx < stage.gate.x[1] - R && gy > stage.gate.y[0] + R && gy < stage.gate.y[1] - R) return { result: 'gate', id: stage.gate.note, path, t, clear: minClear, gx, gy };
    }
    const hit = contact(C, x, y, z);
    if (hit) return Object.assign({ path, t, clear: minClear }, hit);
    if (path.length % 6 === 0) { const cl = clearance(C, x, y, z); if (cl < minClear) minClear = cl; }
    if (vz > -0.2 && s < 1.5) return { result: 'land', id: 'stall', path, t, clear: minClear };
  }
  return { result: 'lost', id: 'time', path, t, clear: minClear };
}
/** grid search of the launch space; the best line is the success with the most clearance */
export function solve(stage, o = {}) {
  const S = Object.assign({}, RUN.launch, o.yaw ? { yaw: o.yaw } : {}), nx = o.nx || 7, dy = o.dyaw || 2, dp = o.dpitch || 2.5, dpow = o.dpower || 0.1;
  let count = 0, total = 0, best = null; const hits = {}; const bins = o.bins || null; const reach = bins ? new Array(bins.length + 1).fill(0) : null; let farthest = 0;
  for (let i = 0; i < nx; i++) { const x = stage.launch.x[0] + (stage.launch.x[1] - stage.launch.x[0]) * (nx === 1 ? 0.5 : i / (nx - 1));
    for (let yaw = S.yaw[0]; yaw <= S.yaw[1] + 1e-9; yaw += dy) for (let pitch = S.pitch[0]; pitch <= S.pitch[1] + 1e-9; pitch += dp) for (let power = 0; power <= 1 + 1e-9; power += dpow) {
      total++; const r = simulate(stage, { x, yaw, pitch, power });
      if (r.result === 'gate') { count++; if (!best || r.clear > best.clear) best = { x: +x.toFixed(3), yaw: +yaw.toFixed(1), pitch: +pitch.toFixed(1), power: +power.toFixed(2), clear: +r.clear.toFixed(3), t: +r.t.toFixed(2) }; }
      else hits[r.id] = (hits[r.id] || 0) + 1;
      if (bins) { const d = progressOf(stage, r.path); if (d > farthest) farthest = d; let k = 0; while (k < bins.length && d >= bins[k]) k++; reach[k]++; }
    } }
  const top = Object.entries(hits).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([id, n]) => `${id} ×${n}`);
  return { best, count, total, needle: +(100 * count / total).toFixed(3), top, reach, farthest: +farthest.toFixed(1) };
}
