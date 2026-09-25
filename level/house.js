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
  tempo: 0.8,
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
export { HOUSE, DERIVED, ENV, RUN };
