/* game/glide.js — the paper plane's flight through a level: the game's physics · 25 September 2026 (design pass 4; pass 7 for any level; pass 8 the plane's true shape)
 *
 * A port of the pass-3 model (tools/design-pass-3/glide-pace.mjs = the kit's glide.js + design pass 1's soft obstacles + pass 2's
 * BONK, THE TOASTER and the smoke + pass 3's trampoline and second yard), reading a level's spec instead of the kit's scenes, with
 * the passes' switches always on. The arithmetic is the model's step for step (the speed from the gauge, the 120 Hz Euler step,
 * the collision order), so tools/ladder.mjs can replay the model's lines through this file and land on the model's numbers.
 * Two additions, neither of which moves a path: an `events` list for the playback's lettering, and the collider's kind and
 * class stored on the collider instead of parsed from its id.
 * Design pass 7 (the levels): the stage carries its level (the house by default, so every tool runs unchanged), and four collider
 * types pass 5 asked for beside the house's: `floor` (a storey to land on), `carry` (a belt, a ramp or a slide that moves a landed
 * plane), `ring` (a burst through a hoop) and `effect` (a trail with no stats); ponds carry a surface height and their letters; a
 * box with `bounce` BOINGs (the house's trampoline) and a box with `land` ends the run on a landing from above. Every new branch
 * fires only for the new collider types, so the house's lines replay to the same numbers.
 *
 *   const st = stage(level);                             // the colliders, the launch, the finish, the checkpoints (level = the house)
 *   simulate(st, { x, yaw, loft, power }, card)          // → { result, id, path:[[x,y,z,t]…], t, events, bonks, scrapes, letters?, … }
 *   progressOf(st, path)                                 // the high-water mark, metres from the hand
 */
import { LEVEL as HOUSE, hitOf } from '../level/house.js';

const R = HOUSE.plane.radius, T = 0.12;                                   // the plane's radius (the same in every level), the walls' thickness
/* pass 8: the plane collides as a flat ellipsoid, rh sideways and along the flight, rv up and down (LEVEL.plane.shape; the plane is the
   same in every level). A level without a shape keeps the sphere of radius R. r is the mean radius, for the pushes off a surface. */
export const shapeOf = LV => { const p = (LV && LV.plane) || HOUSE.plane, s = p.shape, r = p.radius || R; return s ? { rh: s.rh, rv: s.rv, r: (2 * s.rh + s.rv) / 3 } : { rh: r, rv: r, r }; };
const SPHERE = shapeOf(HOUSE);
const ROUND = { grill: 0.32, swingPost: 0.06, pendant: 0.14, floorLamp: 0.19, plant: 0.3, eggChair: 0.45, sideTable: 0.23, kettlebell: 0.12, paperTowel: 0.08, faucet: 0.05, kettle: 0.1, bowl: 0.11 };
const BASE_Y = { upperRun: 1.42, faucet: 0.94, dishRack: 0.94, paperTowel: 0.94, bowl: 0.94, breadBox: 0.92, knifeBlock: 0.92 };

function propColliders(sc, p, z0, honest = false) {
  const out = [], z = p.z + z0, y0 = p.y ?? BASE_Y[p.kind] ?? 0, id = sc.key + '/' + p.id, kind = p.kind, hit = p.hit || hitOf(p.kind);
  const box = (o) => out.push(Object.assign({ type: 'box', id, kind, hit, ry: 0 }, p.bounce ? { bounce: p.bounce } : null, p.land ? { land: p.land } : null, o));
  const cyl = (o) => out.push(Object.assign({ type: 'cyl', id, kind, hit }, o));
  if (p.picture) return out;                                              // a landmark the drone sees, not an obstacle (the swing set)
  if (p.kind === 'door' || p.kind === 'stormDoor') {
    const sign = p.hinge === 'L' ? -(p.into || 1) : (p.into || 1); const ry = (p.ry || 0) + (p.open || 0) * Math.PI / 180 * sign;
    const dir = p.kind === 'door' ? 1 : -1;
    const cx = p.x + dir * (p.w / 2) * Math.cos(ry), cz = z - dir * (p.w / 2) * Math.sin(ry);
    box({ cx, cz, w: p.w, d: 0.06, ry, y0: 0, y1: p.h });
  } else if (p.kind === 'pendant') {                                      // pass 8: the shade (a cone 24 cm tall, 13 cm at its mouth) and the cord, not a 14 cm column the shade's height
    if (!honest) cyl({ cx: p.x, cz: z, r: ROUND.pendant, y0: y0 - p.h, y1: y0 });
    else { cyl({ id: id + ' shade', cx: p.x, cz: z, r: 0.13, y0: y0 - p.h - 0.11, y1: y0 - p.h + 0.13 }); cyl({ id: id + ' cord', cx: p.x, cz: z, r: 0.02, y0: y0 - p.h + 0.13, y1: y0 }); }
  } else if (p.kind === 'upperRun') {
    box({ cx: p.x, cz: z, w: p.w, d: p.d, y0, y1: y0 + p.h });
  } else if (p.kind === 'oak') {
    cyl({ id: id + ' trunk', cx: p.x, cz: z, r: 0.35, y0: 0, y1: 4 }); out.push({ type: 'sphere', id: id + ' canopy', kind, hit, cx: p.x, cy: 5.2, cz: z, r: 2.6 });
  } else if (p.kind === 'palms') {
    for (const [dx, dz] of [[-2.6, 0.5], [0.6, -0.4], [3.0, 0.8]]) cyl({ cx: p.x + dx * 1.3, cz: z + dz * 1.3, r: 0.22, y0: 0, y1: 12 });
  } else if (p.kind === 'fence') {
    const g = p.gateW / 2; box({ id: id + ' L', cx: p.x - p.w / 4 - g / 2, cz: z, w: p.w / 2 - g, d: 0.15, y0: 0, y1: p.h }); box({ id: id + ' R', cx: p.x + p.w / 4 + g / 2, cz: z, w: p.w / 2 - g, d: 0.15, y0: 0, y1: p.h });
  } else if (p.kind === 'clothesline' && honest) {                          // pass 8: the washing hangs on ITS line (it stood at the run's x = 0: the laundry's rack put two invisible shirts 4 m away), and the line turns with ry
    const ry = p.ry || 0, co = Math.cos(ry), sn = Math.sin(ry), at = ox => ({ cx: p.x + ox * co, cz: z - ox * sn });
    for (const sx of [-1, 1]) cyl(Object.assign({ id: id + ' post', r: 0.05, y0: 0, y1: p.h }, at(sx * p.w / 2)));
    box(Object.assign({ id: id + ' line', w: p.w, d: 0.04, ry, y0: p.lineY - 0.02, y1: p.lineY + 0.02 }, at(0)));
    for (const it of p.items) box(Object.assign({ id: id + ' washing', w: it.x[1] - it.x[0], d: 0.06, ry, y0: it.y, y1: p.lineY }, at((it.x[0] + it.x[1]) / 2)));
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
  } else if (p.kind === 'effect') {                                       // pass 5's wet class: a trail, no stats (one event on entering the box)
    out.push({ type: 'effect', id, kind, x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0, y1: y0 + p.h, z0: z - p.d / 2, z1: z + p.d / 2, letters: p.letters || 'SOGGY!' });
  } else if (p.ring) {                                                    // the hoop: a disc facing the run, a burst through it, a scrape on its rim
    out.push({ type: 'ring', id, kind, hit: 'soft', x: p.x, y: p.ring.y ?? y0, z, r: p.ring.r, dv: p.ring.dv ?? 2, rim: p.ring.rim ?? 0.06, letters: p.ring.letters || 'SWISH!' });
  } else if (p.carry) {                                                   // a belt, a ramp (the escalator) or a slide: a landing that moves the plane
    const c = p.carry, n = Math.hypot(...c.dir) || 1;
    out.push({ type: 'carry', id, kind, hit: 'soft', cx: p.x, cz: z, w: p.w, d: p.d, ry: 0, y0, y1: y0 + p.h, dir: c.dir.map(v => v / n), speed: c.speed, ramp: c.ramp || null, letters: c.letters || 'SLIDE…' });
  } else if (honest && p.kind === 'floorLamp') {                           // pass 8: the base, the stem and the shade, not a 19 cm column 1.7 m tall
    cyl({ id: id + ' base', cx: p.x, cz: z, r: 0.16, y0, y1: y0 + 0.03 }); cyl({ id: id + ' stem', cx: p.x, cz: z, r: 0.02, y0: y0 + 0.03, y1: y0 + p.h - 0.3 }); cyl({ id: id + ' shade', cx: p.x, cz: z, r: 0.19, y0: y0 + p.h - 0.3, y1: y0 + p.h });
  } else if (honest && p.kind === 'leafBlower') {                           // pass 8: the blower is drawn along the run (0.3 across, 0.5 long), not across it
    box({ cx: p.x, cz: z, w: p.d + 0.05, d: p.w, y0, y1: y0 + p.h });
  } else if (honest && p.kind === 'sofa') {                                // pass 8: the seat (42 cm), the back with its cushions (87 cm, the rear 42 cm) and the two arms (64 cm), not one block of p.h
    const ry = p.ry || 0, co = Math.cos(ry), sn = Math.sin(ry), at = (ox, oz) => ({ cx: p.x + ox * co + oz * sn, cz: z - ox * sn + oz * co });
    box(Object.assign({ id: id + ' seat', w: p.w, d: p.d, ry, y0, y1: y0 + 0.42 }, at(0, 0)));
    box(Object.assign({ id: id + ' back', w: p.w, d: 0.42, ry, y0, y1: y0 + 0.87 }, at(0, -p.d / 2 + 0.21)));
    for (const sx of [-1, 1]) box(Object.assign({ id: id + ' arm', w: 0.2, d: p.d, ry, y0, y1: y0 + 0.64 }, at(sx * (p.w / 2 - 0.1), 0)));
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
/** every collider of the level, in the run frame, in the model's order (props, walls, ceilings, floors and ponds; scene by scene) */
export function allColliders(level = HOUSE) {
  const out = [], honest = !!(level.plane && level.plane.shape);        // pass 8: the honest props come with the plane's shape
  for (const sc of level.scenes) {
    const z0 = level.place[sc.key];
    for (const p of sc.props) out.push(...propColliders(sc, p, z0, honest));
    for (const wl of sc.walls) out.push(wallCollider(sc, wl, z0));
    for (const c of sc.ceilings) out.push({ type: 'ceiling', id: sc.key + '/ceiling', kind: 'ceiling', hit: 'hard', x0: c.x[0], x1: c.x[1], z0: c.z[0] + z0, z1: c.z[1] + z0, y: c.y });
    for (const f of sc.floors) {
      if (f.mat === 'pond') out.push({ type: 'pond', id: sc.key + '/' + (f.id || 'pond'), kind: 'pond', hit: 'water', x0: f.x[0], x1: f.x[1], z0: f.z[0] + z0, z1: f.z[1] + z0, y: f.surface ?? 0, letters: f.letters });
      else if (f.solid) out.push({ type: 'floor', id: sc.key + '/' + (f.id || 'floor'), kind: 'floor', hit: 'hard', x0: f.x[0], x1: f.x[1], z0: f.z[0] + z0, z1: f.z[1] + z0, y: f.y || 0 });
    }
  }
  return out;
}
/** the stage: the level, the launch, the finish, the colliders, the checkpoints, the length. stage() is the house; stage(level) any level;
 *  stage(colliders) the house on a hand-made list (the tests) */
export function stage(level = HOUSE, colliders) {
  if (Array.isArray(level)) { colliders = level; level = HOUSE; }
  return { level, launch: level.launch, gate: level.finish, colliders: colliders || allColliders(level), checkpoints: level.checkpoints, length: level.length, ground: level.ground !== false, shape: shapeOf(level) };
}
/** how far a flight got: the high-water mark, metres from the hand */
export const progressOf = (st, path) => Math.max(0, st.launch.z - Math.min(...path.map(p => p[2])));

/* ───────────── collision ───────────── */
/* pass 8: a box, a wall or a drum meets the plane's ellipsoid exactly: the point's distance to the solid, axis by axis, scaled by the radii
   (rh sideways, rv up and down), under 1. The old test grew a box by R along every axis, so a corner reached the plane 0.26 m away and an
   edge 0.21 m; an opening still shrinks by the radii (the plane must fit through). */
function hitBox(c, x, y, z, S = SPHERE) {
  const dy = Math.max(0, c.y0 - y, y - c.y1); if (dy >= S.rv) return false;
  const dx0 = x - c.cx, dz0 = z - c.cz, s = Math.sin(c.ry), co = Math.cos(c.ry);
  const lx = dx0 * co - dz0 * s, lz = dx0 * s + dz0 * co;
  const dx = Math.max(0, Math.abs(lx) - c.w / 2), dz = Math.max(0, Math.abs(lz) - c.d / 2);
  return (dx * dx + dz * dz) / (S.rh * S.rh) + (dy * dy) / (S.rv * S.rv) < 1;
}
function hitWall(c, x, y, z, S = SPHERE) {
  const dx = x - c.ax, dz = z - c.az, u = dx * c.ux + dz * c.uz, v = -dx * c.uz + dz * c.ux;
  const du = Math.max(0, -u, u - c.L), dv = Math.max(0, Math.abs(v) - T / 2), dy = Math.max(0, y - c.h);
  if ((du * du + dv * dv) / (S.rh * S.rh) + (dy * dy) / (S.rv * S.rv) >= 1) return false;
  for (const o of c.openings) if (u > o.u0 + S.rh && u < o.u1 - S.rh && y > o.y0 + S.rv && y < o.y1 - S.rv) return false;
  return true;
}
/** the height of a carry's top face at z: flat, or a ramp from its near edge to its far edge (the run flies toward −z) */
export function carryTop(c, z) { if (!c.ramp) return c.y1; const k = Math.min(1, Math.max(0, (c.cz + c.d / 2 - z) / c.d)); return c.ramp[0] + (c.ramp[1] - c.ramp[0]) * k; }
const inFoot = (c, x, z) => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1;
/** what the plane touches at (x, y, z), if anything: { result, id, c }, in the colliders' order. A soft prop the plane is already moving
 *  away from (its nearest face behind the plane: it was deflected a step ago, or the plane skims under it) does not answer, so a wall standing
 *  behind that prop still does (pass 6: the model and the first port let a plane skimming under the cabinets against the back wall through the wall).
 *  ground = false (a level with its own floors) turns the model's ground plane off. */
export function contact(colliders, x, y, z, vx = 0, vy = 0, vz = 0, ground = true, S = SPHERE) {
  for (const c of colliders) {
    let hit = null;
    switch (c.type) {
      case 'box': if (hitBox(c, x, y, z, S)) hit = { result: 'crumple', id: c.id, c }; break;
      case 'cyl': { const dy = Math.max(0, c.y0 - y, y - c.y1); if (dy < S.rv) { const dr = Math.max(0, Math.hypot(x - c.cx, z - c.cz) - c.r); if ((dr * dr) / (S.rh * S.rh) + (dy * dy) / (S.rv * S.rv) < 1) hit = { result: 'crumple', id: c.id, c }; } break; }
      case 'sphere': { const dx = x - c.cx, dy = y - c.cy, dz = z - c.cz, l = Math.hypot(dx, dy, dz) || 1e-6; const re = l / Math.sqrt((dx * dx + dz * dz) / (S.rh * S.rh) + (dy * dy) / (S.rv * S.rv)); if (l < c.r + re) hit = { result: 'crumple', id: c.id, c }; break; }   // the ellipsoid's radius along the line to the centre
      case 'wall': if (hitWall(c, x, y, z, S)) hit = { result: 'crumple', id: c.id, c }; break;
      case 'ceiling': if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y > c.y - S.rv && y < c.y + S.rv) hit = { result: 'bonk', id: c.id, c }; break;   // from below, within the plane's height; a storey above a slab is not under it
      case 'pond': if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y < c.y + S.rv && y > c.y - 1) hit = { result: 'splash', id: c.id, c, letters: c.letters }; break;   // a storey below a pond is not in it
      case 'floor': if (inFoot(c, x, z) && y < c.y + S.rv && y > c.y - 0.6) hit = { result: 'land', id: c.id, c }; break;
      case 'carry': { const top = carryTop(c, z); if (hitBox(Object.assign({}, c, { y1: top }), x, y, z, S)) hit = { result: 'carry', id: c.id, c, top }; break; }
    }
    if (!hit) continue;
    if ((c.hit === 'soft' || c.hit === 'furniture') && !c.bounce) { const n = normalOf(c.type === 'carry' ? Object.assign({}, c, { y1: hit.top }) : c, x, y, z, S); if (vx * n[0] + vy * n[1] + vz * n[2] >= 0) continue; }
    return hit;
  }
  if (y < S.rv && ground) return { result: 'land', id: 'floor' };
  return null;
}
/* the normal of a soft prop's surface at the plane (a box's nearest face, a cylinder's side, a sphere's radius) */
function normalOf(c, x, y, z, S = SPHERE) {
  if (c.type === 'cyl') { const l = Math.hypot(x - c.cx, z - c.cz) || 1; if (l < c.r) return [0, y > (c.y0 + c.y1) / 2 ? 1 : -1, 0]; return [(x - c.cx) / l, 0, (z - c.cz) / l]; }   // pass 8: a drum's top or underside faces up or down
  if (c.type === 'sphere') { const l = Math.hypot(x - c.cx, y - c.cy, z - c.cz) || 1; return [(x - c.cx) / l, (y - c.cy) / l, (z - c.cz) / l]; }
  const dx = x - c.cx, dz = z - c.cz, s = Math.sin(c.ry), co = Math.cos(c.ry); const lx = dx * co - dz * s, lz = dx * s + dz * co, my = (c.y0 + c.y1) / 2;
  const rx = Math.abs(lx) / (c.w / 2 + S.rh), rz = Math.abs(lz) / (c.d / 2 + S.rh), ry = Math.abs(y - my) / ((c.y1 - c.y0) / 2 + S.rv);
  if (ry >= rx && ry >= rz) return [0, Math.sign(y - my) || 1, 0];
  const nlx = rx >= rz ? Math.sign(lx) : 0, nlz = rx >= rz ? 0 : Math.sign(lz);
  return [nlx * co + nlz * s, 0, -nlx * s + nlz * co];
}
/* THE BONK's normal: a ceiling faces down; a wall's face on the side the plane is on (never from the velocity), the head or the
   sill of an opening bounces vertically; a hard prop by its nearest face */
function hardNormal(c, x, y, z, S = SPHERE) {
  if (c.type === 'ceiling') return [0, -1, 0];
  if (c.type === 'wall') {
    const dx = x - c.ax, dz = z - c.az, u = dx * c.ux + dz * c.uz;
    for (const o of c.openings) if (u > o.u0 && u < o.u1) { if (y >= o.y1 - S.rv && y <= o.y1 + S.rv) return [0, -1, 0]; if (y <= o.y0 + S.rv && y >= o.y0 - S.rv) return [0, 1, 0]; }   // within the plane's radius of the head or the sill; the wall above or below is a wall (pass 7: a rising plane under the mall's balcony rail went through)
    const nx0 = -c.uz, nz0 = c.ux, side = dx * nx0 + dz * nz0;
    return side >= 0 ? [nx0, 0, nz0] : [-nx0, 0, -nz0]; }
  return normalOf(c, x, y, z, S);
}
/** the toast's slices tau seconds after the pop (for the drawing); TO = the level's toast (the house's by default) */
export function toastAt(tau, TO = HOUSE.toast) { return TO.slices.map(sl => ({ x: TO.x + sl.vx * tau, y: TO.y + sl.u * tau - 0.5 * TO.g * tau * tau, z: TO.z + sl.vz * tau, air: tau <= 2 * sl.u / TO.g })); }

/** one deterministic flight. L = { x (the stance), yaw °, loft ° (one of the five), power 0..1 on the card's gauge }; card = { cap, ratio, damp, trim } */
export function simulate(st, L, card) {
  const LV = st.level || HOUSE, G = LV.glide, C = st.colliders, SOFT = LV.soft, BONK = LV.bonk, TOAST = LV.toast, ground = st.ground !== false, S = st.shape || shapeOf(LV);
  const RINGS = C.filter(c => c.type === 'ring'), EFFECTS = C.filter(c => c.type === 'effect');
  const trim = card.trim ?? G.trim, ratio = card.ratio, damp = card.damp, dt = G.dt, g = G.g;
  const speed = LV.gauge.min + (card.cap - LV.gauge.min) * Math.min(1, Math.max(0, L.power));
  const yaw = L.yaw * Math.PI / 180, pitch = L.loft * Math.PI / 180;
  let x = Math.min(st.launch.x[1], Math.max(st.launch.x[0], L.x)), y = st.launch.y, z = st.launch.z;
  let vx = speed * Math.cos(pitch) * Math.sin(yaw), vy = speed * Math.sin(pitch), vz = -speed * Math.cos(pitch) * Math.cos(yaw);
  const path = [[x, y, z, 0]], events = []; let t = 0, gateZ = st.gate.z, scrapes = 0, carry = null, carryT = 0;
  let bonks = 0, popped = false, tPop = 0, toastHit = false, smoked = false, tSmoke = 0, hardest = 0, boings = 0; const seen = new Set();
  const ev = (kind, id, extra) => events.push(Object.assign({ t, kind, id, x, y, z }, extra));
  const done = (r) => Object.assign({ path, t, events, scrapes, bonks, popped, tPop, toastHit, smoked, tSmoke, hardest, boings, speed, card, throw: L }, r);
  while (carry ? carryT < 8 : t < G.maxT) {                              // a ride is not a flight: it has its own cap (8 s), not the flight's 9 s
    if (carry) {                                                          // on a belt: the box moves the plane; it lands where it leaves the box or meets something hard
      const c = carry; x += c.dir[0] * c.speed * dt; z += c.dir[2] * c.speed * dt; y = carryTop(c, z) + S.rv + 0.005; t += dt; carryT += dt; path.push([x, y, z, t]);
      if (!hitBox(Object.assign({}, c, { y0: -99, y1: 99 }), x, y, z)) { ev('end', c.id); return done({ result: 'land', id: c.id, letters: c.letters, carried: true }); }
      const h2 = contact(C, x, y, z, 0, 0, 0, false, S); if (h2 && h2.c && h2.c !== c && h2.c.hit === 'hard') { ev('end', c.id); return done({ result: 'land', id: c.id, letters: c.letters, carried: true }); }
      continue;
    }
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
      if (gx > st.gate.x[0] + S.rh && gx < st.gate.x[1] - S.rh && gy > st.gate.y[0] + S.rv && gy < st.gate.y[1] - S.rv) { ev('finish', st.gate.note || 'the finish line'); return done({ result: 'gate', id: st.gate.note, gx, gy }); }
    }
    /* THE TOASTER: the plane within the trigger sphere pops it once; the slices are moving soft colliders */
    if (TOAST) {
      if (!popped) { const dx = x - TOAST.x, dy = y - TOAST.y, dz = z - TOAST.z; if (dx * dx + dy * dy + dz * dz < TOAST.trig * TOAST.trig) { popped = true; tPop = t; ev('pop', TOAST.eventId || 'kitchen/toaster'); } }
      else { const tau = t - tPop;
        for (const sl of TOAST.slices) { if (tau > 2 * sl.u / TOAST.g) continue;
          const sx = TOAST.x + sl.vx * tau, sy = TOAST.y + sl.u * tau - 0.5 * TOAST.g * tau * tau, sz = TOAST.z + sl.vz * tau;
          const dx = x - sx, dy = y - sy, dz = z - sz, d = Math.hypot(dx, dy, dz) || 1e-6;
          if (d < S.r + TOAST.r) { const n = [dx / d, dy / d, dz / d], vn = vx * n[0] + vy * n[1] + vz * n[2];
            if (vn < 0) { vx -= (1 + TOAST.bounce) * vn * n[0]; vy -= (1 + TOAST.bounce) * vn * n[1]; vz -= (1 + TOAST.bounce) * vn * n[2]; }
            const k = 1 - TOAST.bleed; vx *= k; vy *= k; vz *= k; toastHit = true; scrapes++; ev('crumb', TOAST.eventId ? TOAST.eventId + ' slice' : 'kitchen/toast', { letters: TOAST.letters && TOAST.letters.hit });
            x += n[0] * (S.r + TOAST.r - d + 0.01); y += n[1] * (S.r + TOAST.r - d + 0.01); z += n[2] * (S.r + TOAST.r - d + 0.01);
            if (Math.hypot(vx, vy, vz) < SOFT.minSpeed) { ev('end', 'toast'); return done({ result: 'land', id: 'toast' }); } } } }
    }
    /* pass 5's rings and effects: a ring's disc crossed going forward bursts once (its rim scrapes); an effect box logs one event and changes nothing */
    for (const c of RINGS) if (pz >= c.z && z < c.z) {
      const f = (pz - c.z) / (pz - z), a = path[path.length - 2], cx = a[0] + (x - a[0]) * f, cy = a[1] + (y - a[1]) * f, dd = Math.hypot(cx - c.x, cy - c.y);
      if (dd < c.r) { if (!seen.has(c.id)) { seen.add(c.id); const sp = Math.hypot(vx, vy, vz) || 1e-6; vx += vx / sp * c.dv; vy += vy / sp * c.dv; vz += vz / sp * c.dv; ev('ring', c.id, { letters: c.letters }); } }
      else if (dd < c.r + c.rim + S.rh) { const n = [(cx - c.x) / (dd || 1e-6), (cy - c.y) / (dd || 1e-6), 0]; const k = 1 - SOFT.bleed; vx *= k; vy *= k; vz *= k; vx += n[0] * 0.6; vy += n[1] * 0.6; scrapes++; ev('scrape', c.id, { kind2: 'rim' });
        if (Math.hypot(vx, vy, vz) < SOFT.minSpeed) { ev('end', c.id); return done({ result: 'land', id: c.id }); } }
    }
    for (const c of EFFECTS) if (!seen.has(c.id) && x > c.x0 && x < c.x1 && y > c.y0 && y < c.y1 && z > c.z0 && z < c.z1) { seen.add(c.id); ev('effect', c.id, { letters: c.letters }); }
    const hit = contact(C, x, y, z, vx, vy, vz, ground, S);
    if (hit) {
      if (hit.result === 'carry') {                                         // a belt's top face, come down on: the belt takes the plane; its side is a soft prop
        const cEff = Object.assign({}, hit.c, { y1: hit.top }), n = normalOf(cEff, x, y, z, S);
        if (n[1] > 0.5 && vy <= 0.05) { carry = hit.c; y = hit.top + S.rv + 0.005; path[path.length - 1][1] = y; vx = carry.dir[0] * carry.speed; vy = 0; vz = carry.dir[2] * carry.speed; ev('carry', carry.id, { letters: carry.letters }); continue; }
        hit.c = cEff;
      }
      const c = hit.c, soft = !!c && (c.hit === 'soft' || c.hit === 'furniture'), hard = !!c && c.hit === 'hard';   // the floor and the ponds end the run
      const tn = (c && c.bounce) ? normalOf(c, x, y, z, S) : null;
      if (tn && tn[1] > 0.5 && vy < 0) {                                  // BOING: the mat throws the plane back up
        const B = c.bounce; vy = Math.min(B.vmax, -vy * B.e); vx *= B.keep; vz *= B.keep; boings++; y = c.y1 + S.rv + 0.01; ev('boing', c.id);
      } else if (soft) {                                                   // soft: deflect and bleed; furniture crumples head-on
        const n = normalOf(c, x, y, z, S), sp = Math.hypot(vx, vy, vz) || 1e-6, vn = vx * n[0] + vy * n[1] + vz * n[2];
        if (vn < 0) {
          const cos = -vn / sp;
          if (c.land && n[1] > 0.5) { ev('end', c.id); return done(Object.assign({}, hit, { result: 'land', letters: c.land })); }   // a landing that stays (the beanbags, the ice)
          if (c.hit === 'furniture' && cos > SOFT.headOn) { ev('end', c.id); return done(Object.assign({}, hit, { result: 'crumple' })); }
          vx -= (1 + SOFT.bounce) * vn * n[0]; vy -= (1 + SOFT.bounce) * vn * n[1]; vz -= (1 + SOFT.bounce) * vn * n[2];
          const k = 1 - SOFT.bleed; vx *= k; vy *= k; vz *= k; scrapes++; ev(c.effect === 'soggy' ? 'soggy' : 'scrape', c.id, { kind2: c.kind });
          x += n[0] * S.r * 0.6; y += n[1] * S.r * 0.6; z += n[2] * S.r * 0.6;
          if (Math.hypot(vx, vy, vz) < SOFT.minSpeed) { ev('end', c.id); return done(Object.assign({}, hit, { result: 'land' })); }
          if (scrapes > SOFT.maxScrapes) { ev('end', c.id); return done(Object.assign({}, hit, { result: 'crumple', id: hit.id + ' (scraped out)' })); }
        }
      } else if (hard && (hit.result === 'crumple' || hit.result === 'bonk')) {   // THE BONK: by angle and force, the run goes on
        const n = hardNormal(c, x, y, z, S);
        const vn = vx * n[0] + vy * n[1] + vz * n[2];
        if (vn < 0) {
          const sn = -vn, e = Math.max(BONK.eMin, Math.min(BONK.e0, BONK.e0 - BONK.eSlope * sn));
          const tx = vx - vn * n[0], ty = vy - vn * n[1], tz = vz - vn * n[2];
          vx = BONK.mu * tx - e * vn * n[0]; vy = BONK.mu * ty - e * vn * n[1]; vz = BONK.mu * tz - e * vn * n[2];
          bonks++; if (sn > hardest) hardest = sn; ev('bonk', hit.id, { sn, e, n, ceiling: c.type === 'ceiling' });
          const push = c.type === 'ceiling' ? (y - (c.y - S.rv)) + 0.01 : S.r * 0.6;
          x += n[0] * push; y += n[1] * push; z += n[2] * push;
          if (bonks > BONK.max) { ev('end', hit.id); return done(Object.assign({}, hit, { result: 'crumple', id: hit.id + ' (bonked out)', bonkedOut: true })); }
        }
      } else { ev('end', hit.id); return done(hit); }
    }
    if (vz > -0.2 && s < 1.5) { ev('end', 'stall'); return done({ result: 'land', id: 'stall' }); }
  }
  if (carry) { ev('end', carry.id); return done({ result: 'land', id: carry.id, letters: carry.letters, carried: true }); }   // a ride that ran out of time lands where it is
  ev('end', 'time'); return done({ result: 'lost', id: 'time' });
}
/** the letters of a bonk by its speed into the surface (the book's five steps) */
export function bonkLetters(sn, level = HOUSE) { const B = level.bonk; let i = 0; while (i < B.steps.length && sn >= B.steps[i]) i++; return { text: B.letters[i], step: i + 1 }; }
/** what a run's end letters, and what stopped it (a lettered pond, landing or carry says its own word) */
export function endLetters(r, level = HOUSE) {
  const msg = r.result === 'gate' ? ((level.results && level.results.gate) || 'SWISH!') : r.bonkedOut ? 'BONKED OUT' : r.letters || level.results[r.result] || String(r.result).toUpperCase();
  const what = r.id === 'floor' ? 'the floor' : r.id === 'stall' ? 'a stall' : r.id === 'toast' ? 'the toast' : r.id === 'time' ? 'gone' : String(r.id).replace(/ \((bonked|scraped) out\)/, '').split('/').pop().replace(/^wall /, 'the ').replace(/ (L|R)$/, '');
  return { msg, what };
}
