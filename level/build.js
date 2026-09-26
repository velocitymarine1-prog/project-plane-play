/* level/build.js — the greybox builder: a pass-5 level idea (zones, checkpoints, items) → the game's LEVEL shape · design pass 7 (jumpr t49)
 *
 * One scene per zone, placed at place[key] = −zone.from (the run flies toward −z; an item `at` metres from the hand has local z
 * zone.from − at). A zone's width, walls (hard / soft / open / glass), ceiling, floor storey and hue make its rooms: the floors (split
 * around any water, so a plane lands on a solid floor and splashes in a pond), the ceiling, the side walls of a hard zone, the back wall
 * with the checkpoint as its opening. An item's type makes its prop and its collider: hard and glass BONK, furniture and soft SCRAPE,
 * aim and boost are wind boxes, the pop is the toaster class, effect is a trail with no stats, water and exam are lettered ponds, carry
 * is a belt (or a ramp), ring is the hoop, a landmark of the trampoline class lands (BOING, FLUMP, SKRRT or a slide), a picture never
 * collides. Every prop is a block or a pane in the zone's hue until its pieces card. The house's own numbers (the plane, the glide,
 * the gauge, the bonk, the tempo, the cameras) are shared by reference. Pure numbers: no Three.js, no DOM.
 *
 *   buildLevel(idea, tweaks) → LEVEL      tweaks = { zones: { key: { floorMat, outdoor, ceiling, sideMat, floorAfter, doorW } }, toGo,
 *                                           armUnlocks, pop: { pop, hit }, sliceColor, letters: { itemId: word }, carries, ramps, landings, results }
 */
import { LEVEL as HL, HOUSE as PAL } from './house.js';
import { byId } from './index.js';

const deep = v => JSON.parse(JSON.stringify(v));
const hex2 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, t) => { const A = hex2(a), B = hex2(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const PRINT_KINDS = ['napkin', 'notebook', 'pageone', 'cardstock', 'foil'];
const INTERIOR = HL.scenes[0].look, OUTDOORS = HL.scenes.find(s => s.key === 'backyard').look;

export function buildLevel(idea0, TW = {}) {
  const idea = deep(idea0); if (TW.patch) TW.patch(idea);                                // a level's own numbers where the greybox must differ from pass 5's data (recorded in its file)
  const info = byId(idea.id) || { n: 0, priceMul: 1, next: null };
  const Z = idea.zones, CP = idea.checkpoints;
  if (!Z || Z.length !== 5) throw new Error(idea.id + ': a level has five zones');
  let zEnd = 0; for (const zn of Z) { if (Math.abs(zn.from - zEnd) > 0.05) throw new Error(`${idea.id}: ${zn.key} starts at ${zn.from}, not ${zEnd}`); zEnd = zn.to; }
  if (Math.abs(zEnd - HL.length) > 0.05) throw new Error(`${idea.id}: the zones end at ${zEnd}, not ${HL.length}`);
  if (!CP || CP.length !== 4) throw new Error(idea.id + ': a level has four checkpoints');
  const TZ = TW.zones || {}, letters = TW.letters || {}, carries = TW.carries || {}, ramps = TW.ramps || {}, landings = TW.landings || {};
  const zoneAt = at => Z.find(zn => at < zn.to + 1e-9) || Z[Z.length - 1];           // an item behind the hand (at < 0) is zone 1's
  const items = idea.items.filter(i => i.type !== 'hand' && i.type !== 'finish');
  for (const it of items) if (it.at == null || (it.w == null && it.r == null)) throw new Error(`${idea.id}: ${it.id} has no place or size`);
  const waters = items.filter(i => i.type === 'water' || i.type === 'exam');
  const place = {}, scenes = [], hues = {}; let toast = null;

  /* ── the rooms, zone by zone ── */
  Z.forEach((zn, i) => {
    const tw = TZ[zn.key] || {}, from = zn.from, len = zn.to - zn.from, W = zn.width, outdoor = !!tw.outdoor, first = i === 0, last = i === Z.length - 1;
    const floorY = zn.floor || 0, ceilY = tw.ceiling ?? zn.ceiling ?? (floorY + 2.7);
    const zf = first ? 1.5 : 0, zb = -len;                                            // local z: 0 at the zone's start, −len at its end; 1.5 m behind the hand in zone 1
    const mat = tw.floorMat || (outdoor ? 'lawn' : 'oak'), sideMat = tw.sideMat || (outdoor ? 'stucco' : 'paper');
    const look = deep(outdoor ? OUTDOORS : INTERIOR); if (PAL[zn.hue]) look.horizon = mixHex(look.horizon, PAL[zn.hue], 0.14);
    const sc = { key: zn.key, n: i + 1, title: zn.title, caption: zn.caption, note: zn.note, spots: zn.spots, hue: zn.hue, accent: { wall: 'back', hue: zn.hue }, wrong: { what: zn.wrong }, landmark: zn.landmark, look,
      floors: [], ceilings: [], walls: [], props: [], exterior: outdoor ? 'sky' : null, outdoor, storey: floorY, ceiling: ceilY, width: W, from, to: zn.to };
    place[zn.key] = -from; hues[zn.key] = zn.hue;
    /* the floors: the zone's storey, split around its water (the pond comes first in the list, so it answers before the floor beside it) */
    const margin = outdoor ? 30 : 8, x0 = -W / 2 - margin, x1 = W / 2 + margin, slabs = [];
    const cuts = waters.filter(w => zoneAt(w.at) === zn).map(w => ({ z0: from - (w.at + (w.d || 0.5) / 2), z1: from - (w.at - (w.d || 0.5) / 2), x0: w.x - w.w / 2, x1: w.x + w.w / 2, w })).sort((a, b) => b.z1 - a.z1);
    let zc = zf; const slab = (id, xa, xb, za, zb2, y) => { if (za - zb2 > 0.02 && xb - xa > 0.02) { sc.floors.push({ id, mat, x: [xa, xb], z: [zb2, za], y, solid: true }); if (y > 0.05) slabs.push([xa, xb, zb2, za, y]); } };
    for (const c of cuts) { slab('floor', x0, x1, zc, c.z1, floorY); slab('floor L', x0, c.x0, c.z1, c.z0, floorY); slab('floor R', c.x1, x1, c.z1, c.z0, floorY); if (c.w.gapx) slab('bridge', c.w.gapx[0], c.w.gapx[1], c.z1, c.z0, floorY); zc = c.z0; }
    slab('floor', x0, x1, zc, zb, cuts.length && tw.floorAfter != null ? tw.floorAfter : floorY);
    if (floorY > 0) { sc.floors.push({ id: 'ground', mat: tw.groundMat || mat, x: [-W / 2, W / 2], z: [zb, zf], y: 0, solid: true }); for (const [xa, xb, za, zb2, y] of slabs) sc.ceilings.push({ mat: 'stock', x: [xa, xb], z: [za, zb2], y: y - 0.45 }); }
    if (!outdoor) sc.ceilings.push({ mat: 'stock', x: [-W / 2, W / 2], z: [zb, zf], y: ceilY });
    /* the walls: the sides of a hard zone (and of any room indoors whose walls are not the level's own soft ones), the front wall behind the hand, the back wall with the checkpoint as its opening */
    if (zn.walls === 'hard' || (!outdoor && zn.walls !== 'soft')) sc.walls.push({ id: 'left', a: [-W / 2, zf], b: [-W / 2, zb], n: [1, 0], h: ceilY, mat: sideMat }, { id: 'right', a: [W / 2, zb], b: [W / 2, zf], n: [-1, 0], h: ceilY, mat: sideMat });
    if (first) sc.walls.push({ id: 'front', a: [W / 2, zf], b: [-W / 2, zf], n: [0, -1], h: ceilY, mat: sideMat, openings: [{ at: W / 2 - 0.2, w: Math.min(W - 0.4, tw.doorW || 1.9), h: Math.min(2.2, ceilY - 0.3), sill: 0, kind: 'opening', name: 'the way in' }] });
    if (!last) {
      const cp = CP[i], nz = Z[i + 1], cw = cp.x[1] - cp.x[0], ch = cp.y[1] - cp.y[0], nextFloor = nz.floor || 0;
      const narrow = cw < W - 0.3 || ch < ceilY - floorY - 0.3;
      if (narrow) {
        const openings = [{ at: (cp.x[0] + cp.x[1]) / 2 + W / 2, w: cw, h: ch, sill: cp.y[0], kind: 'opening', name: cp.note }];
        // where the next zone is a storey up, the wall below the balcony stays solid: the climb is the road (a plane under the rail stops here, its metres counted)
        sc.walls.push({ id: 'back', a: [-W / 2, zb], b: [W / 2, zb], n: [0, 1], h: Math.max(ceilY, TZ[nz.key] && TZ[nz.key].ceiling || nz.ceiling || 0), mat: zn.hue, openings });
      }
    } else if (floorY > 0) sc.walls.push({ id: 'ground back', a: [-W / 2, zb], b: [W / 2, zb], n: [0, 1], h: floorY - 0.45, mat: sideMat });   // the finish is upstairs; the ground floor ends here
    scenes.push(sc);
  });

  /* ── the items, each a prop and a collider by its type ── */
  for (const it of items) {
    const zn = zoneAt(it.at), sc = scenes.find(s => s.key === zn.key), zl = zn.from - it.at;
    const w = it.w ?? (it.r != null ? it.r * 2 : 0.4), d = it.d ?? 0.3, y0 = it.y0 ?? 0, y1 = it.y1 ?? (y0 + 0.5), h = Math.max(0, y1 - y0);
    const base = { id: it.id, x: it.x ?? 0, z: zl, w, d, h, cls: it.cls }; if (y0 > 0.001) base.y = y0;
    const put = (p, x, suffix) => sc.props.push(Object.assign({}, p, { x, id: suffix ? p.id + ' ' + suffix : p.id }));
    const twin = p => { if (it.twin != null) { put(p, it.x, 'L'); put(p, it.twin, 'R'); } else put(p, it.x); };
    const spot = k => (zn.spots && zn.spots[k]) || zn.hue;
    if (it.cls === 'behind' && it.at < 0) {   // the doors behind the thrower stand open: slid panes beside the gap, or leaves turned along the walls
      if (it.gap) { const pw = (w - it.gap) / 2, px = it.gap / 2 + pw / 2, pane = Object.assign({}, base, { kind: it.type === 'glass' ? 'pane' : 'block', hit: 'hard', color: 'steel', w: pw, d: Math.max(0.06, d) }); put(pane, it.x - px, 'L'); put(pane, it.x + px, 'R'); continue; }
      if (w > 0.5 && d < 0.2) { const leaf = Object.assign({}, base, { kind: it.type === 'glass' ? 'pane' : 'block', hit: 'hard', color: spot(0), ry: Math.PI / 2 }); const side = x => Math.sign(x || -1) * (Math.abs(x) + w / 2); if (it.twin != null) { put(leaf, side(it.x), 'L'); put(leaf, side(it.twin), 'R'); } else put(leaf, side(it.x)); continue; }
    }
    switch (it.type) {
      case 'hard': case 'head': twin(Object.assign({}, base, { kind: 'block', hit: 'hard', color: spot(0) })); break;
      case 'glass': twin(Object.assign({}, base, { kind: 'pane', hit: 'hard', color: 'steel' })); break;
      case 'furniture': twin(Object.assign({}, base, { kind: 'block', hit: 'furniture', color: spot(1) })); break;
      case 'soft': twin(Object.assign({}, base, { kind: 'block', hit: 'soft', soft: true, color: spot(2) })); break;
      case 'picture': twin(Object.assign({}, base, { kind: 'block', picture: true, color: spot(3) })); break;
      case 'aim': case 'boost': {
        const kind = it.cls === 'smoke' ? 'smoke' : (it.dir[1] >= 0.5 ? 'lift' : 'push');
        const p = { id: it.id, kind: it.cls === 'smoke' ? 'fog' : 'stream', x: it.x, z: zl, w: 0.3, d: 0.3, h: 0, cls: it.cls, color: spot(1),
          boost: { kind, dir: it.dir.slice(), accel: it.accel, x: [it.x - w / 2, it.x + w / 2], y: [y0, y1], z: [zl - d / 2, zl + d / 2] } };
        if (y0 > 0.001) p.y = y0; if (it.cls === 'smoke') p.effect = { kind: 'smoked', secs: 2 };
        put(p, it.x); break; }
      case 'pop': {
        put(Object.assign({}, base, { kind: 'popper', hit: 'soft', color: spot(0), pop: { trigger: it.trig, g: it.g, r: 0.08, bleed: 0.4, bounce: 0.3, slices: deep(it.slices) } }), it.x);
        toast = { id: it.id, scene: zn.key, eventId: zn.key + '/' + it.id, x: it.x, y: y1, z: -it.at, trig: it.trig, g: it.g, r: 0.08, bleed: 0.4, bounce: 0.3, slices: deep(it.slices), color: TW.sliceColor || 'stock',
          letters: Object.assign({ pop: 'POP!', ting: 'TING!', hit: 'CRUMB!' }, TW.pop || {}), counter: { x: [it.x - w / 2 - 0.4, it.x + w / 2 + 0.4], z: [-it.at - d / 2 - 0.4, -it.at + d / 2 + 0.4], y: y1 } };
        break; }
      case 'effect': put(Object.assign({}, base, { kind: 'effect', letters: letters[it.id] || 'SOGGY!' }), it.x); break;
      case 'water': case 'exam':
        sc.floors.unshift({ id: it.id, mat: 'pond', x: [it.x - w / 2, it.x + w / 2], z: [zl - d / 2, zl + d / 2], y: y1 - 0.02, surface: y1, letters: letters[it.id] || 'SPLOOSH!', exam: it.type === 'exam' }); break;
      case 'carry': { const c = carries[it.id] || {};
        put(Object.assign({}, base, { kind: 'belt', hit: 'soft', color: 'rubber', carry: { dir: (c.dir || it.dir).slice(), speed: c.speed ?? it.speed ?? 0.5, ramp: c.ramp || ramps[it.id] || null, letters: letters[it.id] || 'SLIDE…' } }), it.x); break; }
      case 'ring':   // the hoop: a burst through the disc, and "the ring's lift" (the item's accel): the stream class's push box around it
        put({ id: it.id, kind: 'hoop', x: it.x, z: zl, w: (it.r + 0.05) * 2, d: 0.1, h: 0, cls: it.cls, color: spot(1), ring: { r: it.r, y: it.y, dv: 2.0, rim: 0.06, letters: 'SWISH!' },
          boost: it.accel ? { kind: 'push', dir: [0.12, 0.3, -0.94], accel: it.accel, x: [it.x - 1.5, it.x + 1.5], y: [0.2, it.y + 0.6], z: [zl - 1.75, zl + 1.75] } : undefined }, it.x); break;
      case 'landmark': {
        const ld = landings[it.id] || (carries[it.id] ? { carry: carries[it.id] } : { bounce: { e: 0.8, keep: 0.5, vmax: 4.5 } });
        const p = Object.assign({}, base, { kind: 'landing', hit: 'soft', color: spot(0) });
        if (ld.carry) { p.kind = 'belt'; p.carry = { dir: ld.carry.dir.slice(), speed: ld.carry.speed, ramp: ld.carry.ramp || null, letters: letters[it.id] || 'WHEEE' }; }
        else if (ld.land) p.land = ld.land; else p.bounce = ld.bounce;
        put(p, it.x); break; }
      default: put(Object.assign({}, base, { kind: 'block', hit: 'soft', soft: true, color: spot(2) }), it.x);
    }
  }

  /* ── the run: the checkpoints, the finish, the level's own words ── */
  const checkpoints = CP.map((cp, i) => ({ key: Z[i].key, title: Z[i].title, cut: Z[i + 1].title, letter: Z[i].letter, caption: Z[i + 1].caption, next: Z[i + 1].key, z: -cp.at, at: cp.at, note: cp.note, bonus: cp.bonus, first: cp.first, x: cp.x.slice(), y: cp.y.slice() }));
  const lastFloor = Z[Z.length - 1].floor || 0, fin = idea.items.find(i => i.type === 'finish');
  const paper = idea.paper.map((p, i) => [p[0], p[1], PRINT_KINDS[i]]);
  return {
    id: idea.id, n: info.n, title: idea.finish.replace(/!$/, ''), name: idea.title, finishLine: idea.finish, tagline: idea.tagline, caption: Z[0].caption, room: Z[0].title,
    scenes, place, launch: { x: idea.launch.x.slice(), y: idea.launch.y, z: 0, note: idea.launch.note },
    finish: { z: -HL.length, x: [-6, 6], y: [lastFloor, 40], note: fin ? fin.what.split(':')[0] : 'the finish line' },
    checkpoints, length: HL.length, finishBonus: HL.finishBonus,
    plane: HL.plane, glide: HL.glide, tempo: HL.tempo, gauge: HL.gauge, soft: HL.soft, bonk: HL.bonk, toast, tramp: HL.tramp, cameras: HL.cameras,
    results: Object.assign({}, HL.results, TW.results || {}), hues, ground: false,
    toGo: TW.toGo || 'TO THE FINISH', armUnlocks: TW.armUnlocks || {}, paper, next: info.next, priceMul: info.priceMul,
    skyLook: (scenes.find(s => s.outdoor) || scenes[scenes.length - 1]).look,
    zones: Z.map(zn => ({ key: zn.key, title: zn.title, from: zn.from, to: zn.to, hue: zn.hue, walls: zn.walls, width: zn.width })),
  };
}
