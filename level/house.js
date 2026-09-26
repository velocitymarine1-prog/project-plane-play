/* level/house.js — Project Plane, level 1: THE HOUSE IN ONE, as pure numbers · 25 September 2026 (design pass 4, the prototype)
 *
 * The level is the vendored kit's house (kit/house-spec.js, kit/run-spec.js) with the three design passes applied to a deep copy,
 * so the house geometry has one source and the design's edits are readable here in one place:
 *   pass 1 (t37): the launch just inside the front door; the fence line as the finish; soft obstacles by kind
 *   pass 2 (t39): THE TOASTER, THE SMOKING OVEN (a boost box on the range), the smoke alarm; THE BONK's numbers
 *   pass 3 (t40): THE SECOND YARD (the fence 10 m back, the trampoline, the swing set, the shed, the grill, the pool),
 *                 checkpoint 4 over the pond, the tempo
 * No Three.js, no DOM: game/glide.js flies it, game/world.js builds it, tools/ladder.mjs proves it against the pass-3 model.
 * Units: metres; the run flies toward −z; a scene's local z + place[key] = the run frame.
 */
import { SCENES, HOUSE, DERIVED, ENV } from '../kit/house-spec.js';
import { RUN } from '../kit/run-spec.js';
import { applyPass6 } from './opened.js';

const clone = v => JSON.parse(JSON.stringify(v));
export const scenes = clone(SCENES);
const scene = key => scenes.find(s => s.key === key);
export const place = { foyer: RUN.place.foyer.z, kitchen: RUN.place.kitchen.z, pilates: RUN.place.pilates.z, backyard: RUN.place.backyard.z };

/* ── pass 1: the hand just inside the front door ── */
scene('foyer').launch = { x: [-0.2, 0.6], y: 1.5, z: 0.0, note: 'just inside the front door, the cobalt leaf at the left shoulder' };

/* ── pass 2: the kitchen, dynamic ── */
{
  const K = scene('kitchen');
  K.props.push({ id: 'toaster', kind: 'toaster', x: 0.75, z: 1.3, y: 0.94, w: 0.28, d: 0.18, h: 0.2, color: 'steel', hit: 'soft',
    pop: { trigger: 2.0, g: 6.5, r: 0.08, bleed: 0.4, bounce: 0.3, slices: [{ u: 3.0, vx: 0.0, vz: 0.6 }, { u: 3.5, vx: 0.3, vz: 1.0 }] } });
  const range = K.props.find(p => p.id === 'range');
  range.oven = { open: true, burning: 'pie', door: { y: 0.25, len: 0.55, tilt: 20 } };
  K.props.push({ id: 'oven smoke', kind: 'smoke', x: -0.4, z: -1.2, y: 0.95, w: 0, d: 0, h: 0,
    boost: { kind: 'smoke', dir: [0.7, 0.25, -0.66], accel: 16, x: [-1.15, 0.35], y: [0.95, 2.7], z: [-2.0, -0.4] }, effect: { kind: 'smoked', secs: 2 } });
  K.props.push({ id: 'smoke alarm', kind: 'smokeAlarm', x: 0.3, z: -0.6, y: 2.7, w: 0.14, d: 0.14, h: 0, beep: 2 });
}

/* ── pass 3: THE SECOND YARD (tools/design-pass-3/glide-pace.mjs expandYard({ D: 10, tramp: { e: 0.8, keep: 0.5 }, grill: { accel: 0 } }),
   the swing set on the right lawn as a picture: pass 3 keeps it out of the numbers) ── */
export const YARD = (() => {
  const Y = scene('backyard'), D = 10, L = 4.0;
  const fence = Y.props.find(p => p.id === 'fence'), palms = Y.props.find(p => p.id === 'palms');
  fence.z -= D; palms.z -= D; Y.gate.z -= D;
  const zf = fence.z, pool = [zf + 0.5, zf + 0.5 + L], near = pool[1];
  Y.floors.push({ id: 'pool', mat: 'pond', x: [-3.2, 3.2], z: [pool[0], pool[1]], y: -0.3 });
  Y.floors.push({ id: 'deck', mat: 'paver', x: [-4.2, 4.2], z: [zf + 0.2, pool[1] + 1.0], y: -0.05 });
  Y.props.push({ id: 'trampoline', kind: 'trampoline', x: 0.7, z: -11.4 - 2.3, w: 3.0, d: 3.0, h: 0.9, color: 'cobalt', hit: 'soft', bounce: { e: 0.8, keep: 0.5, vmax: 4.5 } });
  Y.props.push({ id: 'shed', kind: 'shed', x: -3.1, z: near + 1.6, w: 2.4, d: 2.4, h: 2.4, color: 'tangerine', hit: 'hard' });
  Y.props.push({ id: 'grill', kind: 'grill', x: -1.2, z: near + 2.2, w: 0.64, d: 0.64, h: 1.0, color: 'rubber', hit: 'soft', smoke: { picture: true } });
  Y.props.push({ id: 'swing set', kind: 'swingSet', x: 5.1, z: -15.5, w: 3.2, d: 1.6, h: 2.2, color: 'red', picture: true });
  Y.gate.note = 'the fence line';
  return { D, fence: zf, gate: Y.gate.z, pool, poolLen: L, near };
})();

/* ── the run: the hand, the checkpoints, the finish ── */
export const LAUNCH = { x: [-0.2, 0.6], y: 1.5, z: place.foyer + scene('foyer').launch.z };
export const FINISH = { z: place.backyard + scene('backyard').gate.z, x: [-6, 6], y: [0, 40], note: 'the fence line, any height above 15 cm' };
export const CHECKPOINTS = [
  { key: 'foyer', title: 'THE FRONT DOOR', cut: 'THE LIVING ROOM & KITCHEN', letter: 'KITCHEN!', caption: 'Meanwhile, in the kitchen…', z: place.foyer + scene('foyer').gate.z, note: 'the hall\'s mouth', bonus: 10, first: 'FIRST TIME PAST THE HALL' },
  { key: 'kitchen', title: 'THE LIVING ROOM & KITCHEN', cut: 'THE PILATES ROOM & LANAI', letter: 'PILATES ROOM!', caption: 'Meanwhile, in the Pilates room…', z: place.kitchen + scene('kitchen').gate.z, note: 'the door beside the range', bonus: 25, first: 'FIRST TIME PAST THE KITCHEN' },
  { key: 'pilates', title: 'THE PILATES ROOM & LANAI', cut: 'THE BACKYARD', letter: 'OUT BACK!', caption: 'Meanwhile, out back…', z: place.pilates + scene('pilates').gate.z, note: 'the screen door', bonus: 60, first: 'FIRST TIME PAST THE LANAI' },
  { key: 'pond', title: 'THE BACKYARD', cut: 'THE SECOND YARD', letter: 'OVER THE POND!', caption: 'Meanwhile, past the pond…', z: place.backyard - 11.4, note: 'the pond\'s far edge', bonus: 100, first: 'FIRST TIME OVER THE POND' },
].map(c => Object.assign(c, { at: +(LAUNCH.z - c.z).toFixed(1) }));
export const LENGTH = +(LAUNCH.z - FINISH.z).toFixed(1);   // 43.9

export const LEVEL = {
  title: 'THE HOUSE IN ONE', caption: 'Meanwhile, just inside the front door…', room: 'THE FRONT DOOR',
  scenes, place, launch: LAUNCH, finish: FINISH, checkpoints: CHECKPOINTS, length: LENGTH, finishBonus: 150,
  plane: { scale: 0.04, radius: RUN.plane.radius },   // pass 6: the mini plane, two thirds of the kit's 0.06 (0.29 m long); the sphere stays 0.15 m and now encloses it
  glide: { g: RUN.glide.g, trim: 7.0, dt: 1 / 120, maxT: RUN.glide.maxT },
  tempo: 0.8,   // pass 3; pass 8 sets 0.6 below
  gauge: { min: 4, max: 12, lofts: [-12, -4, 5, 14, 26], yaw: 15, step: 0.05, pullFrac: 0.38, yawFrac: 0.19, cancelPx: 24, swipePxPerS: 150, swipeMs: 60 },
  soft: { bleed: 0.4, bounce: 0.3, headOn: 0.7, minSpeed: 1.5, maxScrapes: 12 },
  bonk: { e0: 0.5, eSlope: 0.035, eMin: 0.15, mu: 0.85, max: 6, steps: [2, 4, 6, 8], letters: ['bonk', 'BONK', 'BONK!', 'BONK!!', 'KRUNCH!'] },
  toast: { x: 0.75, y: 1.14, z: place.kitchen + 1.3, trig: 2.0, g: 6.5, r: 0.08, bleed: 0.4, bounce: 0.3, slices: [{ u: 3.0, vx: 0.0, vz: 0.6 }, { u: 3.5, vx: 0.3, vz: 1.0 }] },
  tramp: { e: 0.8, keep: 0.5, vmax: 4.5 },
  cameras: { aim: RUN.aim, drone: RUN.drone },
  results: { gate: 'SWISH!', crumple: 'CRUMPLE!', land: 'SLIDE…', splash: 'SPLOOSH!', lost: 'GONE.' },
  hues: { foyer: 'cobalt', kitchen: 'teal', pilates: 'red', backyard: 'lawn', yard2: 'hedge' },
  yard: YARD,
};
/* the model's classing of what a kind does on contact (tools/design-pass-3/glide-pace.mjs: HARD_KIND, FURN_KIND; the rest is clutter) */
export const HARD_KIND = new Set(['door', 'stormDoor', 'fence', 'shed']);
export const FURN_KIND = new Set(['sofa', 'peninsula', 'baseRun', 'upperRun', 'range', 'microwave', 'reformer', 'eggChair', 'sideTable', 'plantStand', 'floorLamp', 'shoeTower', 'oak', 'palms', 'hedge']);
export const hitOf = kind => HARD_KIND.has(kind) ? 'hard' : FURN_KIND.has(kind) ? 'furniture' : 'soft';
/* ── pass 6: THE HOUSE, OPENED UP (level/opened.js): the kitchen sideways with three ways out, the laundry, the lanai's two ways out, the streams ── */
applyPass6(LEVEL, { yard: 'A' });
scene('pilates').exterior = null;   // pass 6 built the lanai and the yard in the game; the kit's 'lanai' exterior (a hedge, an oak, a fence) stays off
/* ── pass 7: the level's identity for the level select, the save and the lettering (level/index.js has the order and the price factor) ── */
Object.assign(LEVEL, { id: 'house', n: 1, name: 'THE HOUSE', finishLine: 'THE HOUSE IN ONE!', toGo: 'TO THE FENCE', next: 'school', priceMul: 1,
  tagline: 'Through the front door, the kitchen turned sideways, the laundry or the Pilates room, the lanai, the yard and over the pool to the fence line.',
  paper: [[1, 'NAPKIN', 'napkin'], [5, 'NOTEBOOK PAGE', 'notebook'], [10, 'PAGE ONE', 'pageone'], [15, 'CARDSTOCK', 'cardstock'], [20, 'FOIL', 'foil']],
  armUnlocks: { 1: 'the living room', 2: 'the kitchen door', 3: 'the Pilates room and the lanai', 4: 'over the pond', 5: 'the deck', 6: 'the pool\'s edge' },
  skyLook: scene('backyard').look });
['kitchen', 'pilates', 'backyard', 'backyard'].forEach((k, i) => { LEVEL.checkpoints[i].next = k; });   // the scene whose light the cut brings in
Object.assign(LEVEL.toast, { id: 'toaster', scene: 'kitchen', eventId: 'kitchen/toaster', color: 'toast', letters: { pop: 'POP!', ting: 'TING!', hit: 'CRUMB!' },
  counter: { x: [-1.4, 1.2], z: [LEVEL.place.kitchen + 0.45, LEVEL.place.kitchen + 1.45], y: 0.94 } });   // where a slice lands on the counter, not the floor
/* ── pass 8: QUALITY OF LIFE (26 September 2026, docs/design/08-quality.md), applied last. Isaac's round after playing on the phone: the hand half a
   metre lower with the hall's furniture off its line and the hall's invisible end lintel gone; the plane's true collision shape (game/glide.js reads
   plane.shape; the plane is the same in every level); the props as tall as they are drawn; the ceilings a metre higher ("without changing anything
   else": the slabs and the walls rise, what hangs from a ceiling hangs from the new one with the pendants' cords lengthened so their shades stay
   where they were, the lanai's cage grows with the rooms; the door heads, the windows, the streams and the furniture stay); the playback at 0.6 ── */
export const PASS8 = { launchY: 1.0, launchX: [-0.3, 0.3], shape: { rh: 0.12, rv: 0.06 }, tempo: 0.6, ceilingUp: 1.0, ceilingWas: 2.7 };
export function applyPass8(LV = LEVEL) {
  const F = scene('foyer'), K = scene('kitchen'), P = scene('pilates');
  LV.launch.y = PASS8.launchY; LV.launch.x = PASS8.launchX.slice(); F.launch.y = PASS8.launchY; F.launch.x = PASS8.launchX.slice();   // the hand at 1.0 m, the window centred on the door
  LV.plane.shape = Object.assign({}, PASS8.shape);                                                                                  // the flat ellipsoid (0.12 sideways and along the flight, 0.06 up and down)
  F.walls = F.walls.filter(w => w.id !== 'hall mouth'); F.gate.y = [0, PASS8.ceilingWas + PASS8.ceilingUp];                          // the hall opens into the living room at the full height
  F.props.find(p => p.id === 'shoe tower').x = 0.7; for (const id of ['sofa', 'rug']) F.props.find(p => p.id === id).x = -1.6;      // the tower against the right wall, the sofa left of the hall's mouth
  const fan = P.props.find(p => p.id === 'drum fan'); if (fan) fan.h = 0.87; for (const p of P.props) if (p.kind === 'eggChair') p.h = 1.16;   // as drawn
  const up = PASS8.ceilingUp, was = PASS8.ceilingWas;
  for (const sc of [F, K, P]) {                                                                                                     // the ceilings a metre higher
    for (const c of sc.ceilings) c.y += up;
    for (const w of sc.walls) w.h += up;
    for (const p of sc.props) { if (p.y === was && (p.kind === 'pendant' || p.kind === 'flushLight' || p.kind === 'smokeAlarm')) { p.y += up; if (p.kind === 'pendant') p.h += up; } if (p.kind === 'screenPorch') p.h += up; }
    if (sc !== F && sc.gate && sc.gate.y) sc.gate.y[1] += up;
  }
  LV.tempo = PASS8.tempo; LV.pass8 = true;
  return LV;
}
applyPass8(LEVEL);
/* ── pass 9: A LITTLE MORE LIFE (26 September 2026, jumpr t50, docs/design/09-life.md), applied last. Isaac: "make the colors a little more
   vibrant and also add some wall decor to the walls and maybe a mirror in the foyer on the left side". The colours are level/palette.js (the
   game fills the kit's palette contract at boot); the decor is data here: every piece hangs on a wall's face (the wall's line ± 0.06, the slab
   being 12 cm thick), faces the room (ry from the wall's normal: +z 0, +x π/2, −x −π/2), stands at most 3 cm proud of the wall and has no
   collider (h: 0, no w × d box), so the plane's centre, held 0.12 m off any wall by its own shape, never meets it: the roads and the pay of
   pass 8 are untouched, and `node tools/ladder.mjs` stays byte for byte. game/pieces.js builds them (print, poster, wallMirror, bunting, the
   kit's clock, the fridge's drawings); `?decor=0` builds the house without them. ── */
export const PASS9 = { face: 0.06, proud: 0.03, pieces: 19, drawings: 2 };
export function applyPass9(LV = LEVEL) {
  const F = scene('foyer'), K = scene('kitchen'), P = scene('pilates'), R = Math.PI / 2, on = (list, items) => { for (const it of items) list.push(Object.assign({ h: 0, decor: true }, it)); };
  on(F.props, [
    { id: 'hall mirror', kind: 'wallMirror', x: -0.89, z: -1.55, y: 1.12, w: 0.5, tall: 0.9, d: 0.03, ry: R, color: 'cobalt' },              // THE HALL MIRROR: the left wall, just past the basket, eye height; a cobalt arch like the front door
    { id: 'gallery house', kind: 'print', x: 0.89, z: -1.15, y: 1.78, w: 0.34, tall: 0.44, d: 0.025, ry: -R, art: 'house', color: 'stock' },   // the gallery of three above the shoe tower (odd, left-heavy, one hung crooked)
    { id: 'gallery plane', kind: 'print', x: 0.89, z: -1.7, y: 1.74, w: 0.5, tall: 0.36, d: 0.025, ry: -R, art: 'plane', color: 'tangerine' },
    { id: 'gallery sun', kind: 'print', x: 0.89, z: -2.22, y: 1.82, w: 0.3, tall: 0.3, d: 0.025, ry: -R, art: 'sun', color: 'stock', tilt: 0.07 },
    { id: 'living clock', kind: 'clock', x: 0, z: -7.98, y: 3.0, w: 0.04, d: 0.5, ry: -R, color: 'red' },                                    // the living room's cyan wall, the 1.5 m of it over the arch that the drone sees down the hall: the clock at the centre …
    { id: 'cover print', kind: 'print', x: -1.05, z: -7.94, y: 2.4, w: 0.72, tall: 0.92, d: 0.025, art: 'cover', color: 'stock', frame: 0.045 },   // … PAGE ONE's cover to its left, the cardinal to its right (three, left-heavy)
    { id: 'cardinal print', kind: 'print', x: 1.05, z: -7.94, y: 2.5, w: 0.55, tall: 0.44, d: 0.025, art: 'cardinal', color: 'stock' },
    { id: 'boat print', kind: 'print', x: -2.45, z: -7.94, y: 1.6, w: 0.6, tall: 0.45, d: 0.025, art: 'boat', color: 'stock' },              // the panels beside the arch, seen when a throw strays: the paper boat (the plane's cousin) and the palm
    { id: 'palm print', kind: 'print', x: 2.45, z: -7.94, y: 1.6, w: 0.55, tall: 0.42, d: 0.025, art: 'palm', color: 'stock' },
  ]);
  on(K.props, [
    { id: 'bunting', kind: 'bunting', x: -0.35, z: -1.94, y: 3.3, w: 4.6, d: 0.02, sag: 0.2, n: 11 },                                         // the back wall under the raised ceiling: its flags hang 2.9 … 3.3 m, a metre over the window's head and off the drone's lens
    { id: 'pie print', kind: 'print', x: -3.2, z: -1.94, y: 1.75, w: 0.5, tall: 0.4, d: 0.025, art: 'pie', color: 'stock' },                // just left of the back door's casing, on the back-door road: the pie that is burning
    { id: 'toast print', kind: 'print', x: 3.0, z: -1.94, y: 1.7, w: 0.44, tall: 0.4, d: 0.025, art: 'toast', color: 'teal' },               // just right of the gym door's casing, on the gym-door road: POP!
    { id: 'menu board', kind: 'print', x: -0.3, z: -1.94, y: 2.32, w: 0.6, tall: 0.5, d: 0.025, art: 'menu', color: 'oak', frame: 0.03 },     // the chalkboard over the window, under the bunting: TODAY: PIE!
    { id: 'calendar', kind: 'poster', x: 4.54, z: 0.2, y: 1.5, w: 0.32, tall: 0.44, d: 0.01, ry: -R, art: 'calendar', color: 'red' },        // the right wall between the fridge and the fan
  ]);
  K.props.find(p => p.id === 'fridge').drawings = ['crayonPlane', 'crayonHouse'];                                                         // a child's drawings under magnets on the fridge's door
  on(P.props, [
    { id: 'wash poster', kind: 'poster', x: -3.5, z: -2.04, y: 1.45, w: 0.5, tall: 0.7, d: 0.01, art: 'wash', color: 'magenta', tilt: -0.03 },   // the laundry's back wall: WASH · DRY · FLY!, and the clouds by the arch
    { id: 'clouds print', kind: 'print', x: 0.1, z: -2.04, y: 1.55, w: 0.5, tall: 0.38, d: 0.025, art: 'clouds', color: 'stock' },
    { id: 'stretch poster', kind: 'poster', x: 2.5, z: -2.04, y: 2.5, w: 0.5, tall: 0.7, d: 0.01, art: 'stretch', color: 'cobalt', tilt: 0.03 },   // the Pilates room's back wall over the slider, the 1.4 m the drone sees through the gym door: STRETCH! and the 1st rosette
    { id: 'rosette print', kind: 'print', x: 3.8, z: -2.04, y: 2.6, w: 0.4, tall: 0.5, d: 0.025, art: 'rosette', color: 'yellow' },
    { id: 'pool print', kind: 'print', x: 1.06, z: -1.3, y: 1.6, w: 0.6, tall: 0.45, d: 0.025, ry: R, art: 'pool', color: 'stock' },         // the Pilates side of the divider, past the arched mirror, seen when a throw hugs the left: the pool, the exam
  ]);
  LV.pass9 = true; return LV;
}
applyPass9(LEVEL);
export { HOUSE, DERIVED, ENV, RUN };
