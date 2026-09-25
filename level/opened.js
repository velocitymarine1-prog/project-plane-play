/* level/opened.js — design pass 6: THE HOUSE, OPENED UP. The interior redrawn as data, applied to the game's LEVEL (level/house.js)
 * so the solver harness and the map can measure and draw the proposal before it goes into the game (the build step moves the call
 * into level/house.js). Isaac's brief (25 September 2026): the kitchen sideways, the house longer, more than one way out of the
 * kitchen (a window), more wind streams; more than one throw angle beats the level.
 *
 * What changes (scene-local metres; the run flies toward −z):
 *   THE LIVING ROOM  the arch into the kitchen widens from 2.0 to 3.6 m, so a yawed throw still enters the kitchen
 *   THE KITCHEN      turned sideways: 9.2 m across, 6.0 m deep (was 4.6 × 4.4). Three exits on the back wall: THE BACK DOOR (left, x −3.4),
 *                    THE WINDOW over the sink (centre-left, x −0.5, open, sill 0.95, 1.25 tall), THE GYM DOOR (right, x 3.2). The range on
 *                    the left wall, its smoke rolling right and low across the room; the fridge on the right wall with THE FRIDGE FAN on top
 *                    blowing left and high; the kettle's steam over the peninsula lifting a low plane between the two bands; the toaster on
 *                    the peninsula's right end; the table and chairs on the right
 *   THE LAUNDRY      a new room behind the kitchen's left half (the back door and the window both lead into it): the washer and dryer, the
 *                    dryer's hose flapping on the left (a stream to the right), THE RETURN VENT on the right (a stream to the left), the two
 *                    funnelling a plane to THE UTILITY ARCH in its back wall (x −2.0, 1.6 wide, no leaf) and onto the lanai
 *   THE PILATES ROOM behind the kitchen's right half (the gym door leads in), the slider's open pane on its LEFT half, the drum fan on the
 *                    right blowing left and up as before
 *   THE LANAI        the screened porch across the whole width, with two ways out: THE TORN PANEL on the left (2.4 m of missing screen
 *                    behind the laundry's arch) and THE SCREEN DOOR on the right (behind the slider's open pane)
 *   THE BACKYARD     THE AC UNIT by the right screen door exhaling upward (a lift over the sprinkler's wall of water); the leaf blower's
 *                    stream widened to the lawn's width; the shed moved left of the pool; the swing set an obstacle on the right lawn; the
 *                    pool 8 m wide so every road crosses it. Yard A: the fence 1.6 m further (45.5 m, the kitchen's extra depth);
 *                    yard B: the yard closed up by 1.6 m (the fence at 43.9 m as pass 3)
 */
export const OPTIONS = { yard: 'A' };

const deep = v => JSON.parse(JSON.stringify(v));
/** the winds of the new rooms, each a knob the sweep turns (accel 0 = the piece stays, its push goes) */
export const WINDS = {
  smoke:   { x: [-4.4, 4.0], y: [1.75, 2.62], z: [-2.0, 2.2], dir: [0.95, 0.0, -0.3], accel: 5 },     // THE HIGH ROAD: the range's smoke rolling right under the ceiling, to the gym door
  fan:     { x: [-4.0, 4.0], y: [0.9, 1.6], z: [-2.0, 1.8], dir: [-0.95, 0.05, -0.3], accel: 5 },     // THE LOW ROAD: the floor fan by the fridge blowing left along the counters, to the back door
  steam:   { x: [-1.5, 0.5], y: [1.05, 2.5], z: [0.45, 1.45], dir: [0, 1, 0], accel: 7 },              // the kettle's steam over the peninsula: a low centre plane lifted to the window
  hose:    { x: [-4.4, -2.2], y: [0.3, 2.2], z: [-1.9, 1.2], dir: [0.5, 0.45, -0.74], accel: 8 },    // the dryer's hose flapping: up, right and forward, to the utility arch
  vent:    { x: [-2.2, 0.9], y: [0.3, 2.2], z: [-1.9, 1.2], dir: [-0.45, 0.45, -0.74], accel: 8 },     // the return vent: up, left and forward, to the utility arch
  drum:    { x: [1.6, 4.6], y: [0.6, 2.5], z: [-1.9, 0.6], dir: [-0.45, 0.1, -0.9], accel: 9 },     // the Pilates room's drum fan: up and left to the open pane
  ac:      { x: [1.8, 3.8], y: [0.4, 3.2], z: [-2.3, -0.3], dir: [0.05, 1, -0.2], accel: 9 },
  pump:    { x: [-2.8, -0.6], y: [0.4, 3.2], z: [-2.3, -0.3], dir: [-0.05, 1, -0.2], accel: 9 },        // the pool's heat pump exhaling behind the torn panel          // the AC unit exhaling by the screen door
  blower:  { x: [-2.6, 2.4], y: [0.2, 2.6], z: [-7.2, -3.7], dir: [0.12, 0.3, -0.94], accel: 5.5 },   // the leaf blower's stream, widened to the lawn (its reach is the threshold's knob, not the lines': at z −9 / 7 m/s² the house fell at card 3)
};
export function applyPass6(LEVEL, o = {}) {
  if (!LEVEL._pristine) LEVEL._pristine = deep({ scenes: LEVEL.scenes, place: LEVEL.place, launch: LEVEL.launch, finish: LEVEL.finish, checkpoints: LEVEL.checkpoints, length: LEVEL.length, toast: LEVEL.toast, yard: LEVEL.yard });
  else { const p = deep(LEVEL._pristine); LEVEL.scenes.splice(0, LEVEL.scenes.length, ...p.scenes); Object.assign(LEVEL.place, p.place); Object.assign(LEVEL.launch, p.launch); Object.assign(LEVEL.finish, p.finish); p.checkpoints.forEach((c, i) => Object.assign(LEVEL.checkpoints[i], c)); LEVEL.length = p.length; Object.assign(LEVEL.toast, p.toast); Object.assign(LEVEL.yard, p.yard); }
  const W = deep(WINDS); for (const k in (o.winds || {})) Object.assign(W[k], o.winds[k]);
  const yard = o.yard || OPTIONS.yard; const ys = yard === 'B' ? 1.6 : 0;   // the yard shift: B closes the lawn up by 1.6 m
  const extra = o.deep ?? 0, zb = -2.0 - extra;                                  // the kitchen's back wall (local z): 4.4 m deep as the house, plus o.deep
  const S = key => LEVEL.scenes.find(s => s.key === key);
  const F = S('foyer'), K = S('kitchen'), P = S('pilates'), Y = S('backyard');
  const TOAST = LEVEL.toast;

  /* ── THE LIVING ROOM: the arch widens ── */
  F.walls.find(w => w.id === 'living back').openings[0].w = 3.6;

  /* ── THE KITCHEN, SIDEWAYS ── */
  K.note = 'The kitchen turned sideways: the range and the smoke on the left, the fridge and its fan on the right, the peninsula and the toaster in between; three ways out along the back wall: the back door, the window over the sink, the gym door.';
  K.floors = [{ mat: 'oak', x: [-4.6, 4.6], z: [zb, 2.4] }];
  K.ceilings = [{ mat: 'stock', x: [-4.6, 4.6], z: [zb, 2.4], y: 2.7 }];
  K.walls = [
    { id: 'front L', a: [-4.6, 2.4], b: [-3, 2.4], n: [0, -1], h: 2.7, mat: 'paper' },
    { id: 'front R', a: [3, 2.4], b: [4.6, 2.4], n: [0, -1], h: 2.7, mat: 'paper' },
    { id: 'back', a: [-4.6, zb], b: [4.6, zb], n: [0, 1], h: 2.7, mat: 'paper', openings: [
      { at: 2.4, w: 1.1, h: 2.1, sill: 0, kind: 'door', name: 'the back door' },
      { at: 4.3, w: 1.4, h: 1.3, sill: 0.9, kind: 'opening', name: 'the window over the sink' },
      { at: 6.7, w: 1.0, h: 2.2, sill: 0, kind: 'door', name: 'the gym door' } ] },
    { id: 'left', a: [-4.6, 2.4], b: [-4.6, zb], n: [1, 0], h: 2.7, mat: 'magenta' },
    { id: 'right', a: [4.6, zb], b: [4.6, 2.4], n: [-1, 0], h: 2.7, mat: 'paper' },
  ];
  const oldToaster = K.props.find(p => p.id === 'toaster');
  K.props = [
    { id: 'range', kind: 'range', x: -4.27, z: -0.7, w: 0.76, d: 0.66, h: 1.03, ry: Math.PI / 2, landmark: true, oven: { open: true, burning: 'pie', door: { y: 0.25, len: 0.55, tilt: 20 } } },
    { id: 'microwave', kind: 'microwave', x: -4.4, z: -0.7, w: 0.76, d: 0.4, y: 1.48, h: 0.42, ry: Math.PI / 2, landmark: true },
    { id: 'counter L', kind: 'baseRun', x: -4.29, z: 0.7, w: 1.8, d: 0.62, h: 0.92, ry: Math.PI / 2, color: 'teal' },
    { id: 'base run', kind: 'baseRun', x: -0.05, z: zb + 0.31, w: 3.3, d: 0.62, h: 0.92, color: 'teal' },
    { id: 'sink', kind: 'sink', x: -0.3, z: zb + 0.25, w: 0.76, d: 0.46, h: 0 },
    { id: 'faucet', kind: 'faucet', x: -0.3, z: zb + 0.05, w: 0.1, d: 0.1, h: 0.36 },
    { id: 'upper run L', kind: 'upperRun', x: -1.35, z: zb + 0.17, w: 0.6, d: 0.34, h: 0.86, color: 'teal' },
    { id: 'upper run R', kind: 'upperRun', x: 1.0, z: zb + 0.17, w: 1.1, d: 0.34, h: 0.86, color: 'teal' },
    { id: 'fridge', kind: 'fridge', x: 4.2, z: zb + 1.2, w: 0.9, d: 0.75, h: 1.8, ry: -Math.PI / 2, color: 'steel', hit: 'furniture', landmark: false },
    { id: 'floor fan', kind: 'boxFan', x: 4.3, z: zb + 2.4, w: 0.5, d: 0.2, h: 0.55, ry: -Math.PI / 2, color: 'red',
      boost: Object.assign({ kind: 'wind' }, W.fan) },
    { id: 'peninsula', kind: 'peninsula', x: -1.6, z: 0.95, w: 2.6, d: 1.0, h: 0.94, color: 'teal' },
    { id: 'kettle', kind: 'kettle', x: -1.0, z: 0.95, w: 0.2, d: 0.2, y: 0.94, h: 0.3, boost: Object.assign({ kind: 'lift' }, W.steam) },
    { id: 'bowl', kind: 'bowl', x: -2.2, z: 1.2, w: 0.2, d: 0.2, h: 0.11, color: 'magenta' },
    { id: 'paper towel', kind: 'paperTowel', x: -0.75, z: 1.15, w: 0.16, d: 0.16, h: 0.34 },
    Object.assign({}, oldToaster, { x: -0.5, z: 1.3 }),
    { id: 'pendant L', kind: 'pendant', x: -2.3, z: 0.95, w: 0.3, d: 0.3, y: 2.7, h: 0.85, color: 'tangerine' },
    { id: 'pendant R', kind: 'pendant', x: -0.9, z: 0.95, w: 0.3, d: 0.3, y: 2.7, h: 0.85, color: 'tangerine' },
    { id: 'table', kind: 'table', x: 2.4, z: 0.6, w: 1.6, d: 0.9, h: 0.75, color: 'oak', hit: 'furniture' },
    { id: 'chair L', kind: 'chair', x: 1.9, z: 1.45, w: 0.46, d: 0.5, h: 0.9, ry: Math.PI, color: 'teal', hit: 'furniture' },
    { id: 'chair R', kind: 'chair', x: 2.9, z: 1.45, w: 0.46, d: 0.5, h: 0.9, ry: Math.PI, color: 'teal', hit: 'furniture' },
    { id: 'runner', kind: 'rug', x: -0.3, z: zb + 1.2, w: 0.62, d: 1.1, h: 0, pattern: 'runner' },
    { id: 'clock', kind: 'clock', x: -4.58, z: 1.8, w: 0.04, d: 0.5, y: 1.75, h: 0, color: 'cyan' },
    { id: 'knife block', kind: 'knifeBlock', x: 1.2, z: zb + 0.25, w: 0.16, d: 0.22, h: 0.28 },
    { id: 'bread box', kind: 'breadBox', x: -1.3, z: zb + 0.3, w: 0.46, d: 0.3, h: 0.26, color: 'tangerine' },
    { id: 'dish rack', kind: 'dishRack', x: 0.5, z: zb + 0.28, w: 0.46, d: 0.34, h: 0.2 },
    { id: 'bananas', kind: 'bananas', x: 3.4, z: zb + 0.35, w: 0.24, d: 0.16, h: 0 },
    { id: 'oven smoke', kind: 'smoke', x: -3.6, z: -0.7, y: 1.75, w: 0, d: 0, h: 0,
      boost: Object.assign({ kind: 'smoke' }, W.smoke), effect: { kind: 'smoked', secs: 2 } },
    { id: 'smoke alarm', kind: 'smokeAlarm', x: 0.3, z: zb + 1.0, y: 2.7, w: 0.14, d: 0.14, h: 0, beep: 2 },
  ];
  TOAST.x = -0.5; TOAST.y = 1.14; TOAST.z = LEVEL.place.kitchen + 1.3;
  K.gate = { z: zb, x: [-4.6, 4.6], y: [0, 2.7], note: 'the kitchen\'s back wall: the back door, the window or the gym door' };
  K.spots = ['teal', 'tangerine', 'steel', 'red'];

  /* ── THE PILATES ROOM, THE LAUNDRY, THE LANAI (the kitchen is 1.6 m deeper: the rooms behind move back) ── */
  const dz = extra; LEVEL.place.pilates = -14.7 - dz; LEVEL.place.backyard = -20.9 - dz;
  P.title = 'THE LAUNDRY, THE PILATES ROOM & THE LANAI'; P.caption = 'Meanwhile, past the kitchen…';
  P.note = 'Behind the kitchen: the laundry on the left (the dryer\'s hose and the return vent funnel a plane to the utility arch), the Pilates room on the right (the drum fan lifts a plane to the slider\'s open pane), and the lanai across the back with a torn screen on the left and the screen door on the right.';
  P.floors = [{ mat: 'oak', x: [1.0, 5.0], z: [-2.1, 2.3] }, { mat: 'rubber', x: [1.3, 4.7], z: [-1.9, 1.9], y: 0.012 }, { mat: 'paver', x: [-4.6, 1.0], z: [-2.1, 2.3] },
    { mat: 'paver', x: [-4.6, 5.0], z: [-6.2, -2.1], y: -0.05 }, { mat: 'lawn', x: [-16, 16], z: [-30, -6.2], y: -0.1 }];
  P.ceilings = [{ mat: 'stock', x: [-4.6, 5.0], z: [-2.1, 2.3], y: 2.7 }];
  P.walls = [
    { id: 'divider', a: [1.0, 2.3], b: [1.0, -2.1], n: [1, 0], h: 2.7, mat: 'paper' },
    { id: 'pilates back', a: [1.0, -2.1], b: [5.0, -2.1], n: [0, 1], h: 2.7, mat: 'paper', openings: [{ at: 2.2, w: 3.2, h: 2.3, sill: 0, kind: 'slider', open: 'left' }] },
    { id: 'laundry back', a: [-4.6, -2.1], b: [1.0, -2.1], n: [0, 1], h: 2.7, mat: 'paper', openings: [{ at: 3.0, w: 1.6, h: 2.2, sill: 0, kind: 'opening', name: 'the utility arch' }] },
    { id: 'left', a: [-4.6, 2.3], b: [-4.6, -2.1], n: [1, 0], h: 2.7, mat: 'cobalt' },
    { id: 'right', a: [5.0, -2.1], b: [5.0, 2.3], n: [-1, 0], h: 2.7, mat: 'paper' },
  ];
  P.props = [
    { id: 'reformer', kind: 'reformer', x: 3.4, z: 0.0, w: 0.68, d: 2.45, h: 0.7, ry: -0.42, color: 'yellow', landmark: true },
    { id: 'agility ladder', kind: 'ladder', x: 3.0, z: 1.45, w: 3.2, d: 0.45, h: 0, ry: 0.06 },
    { id: 'drum fan', kind: 'fan', x: 4.55, z: -1.05, w: 0.8, d: 0.4, h: 0.95, ry: -Math.PI / 2, color: 'red',
      boost: Object.assign({ kind: 'wind' }, W.drum) },
    { id: 'mirror', kind: 'mirror', x: 1.1, z: 0.35, w: 0.08, d: 0.8, h: 0, ry: Math.PI / 2, onWall: 'divider' },
    { id: 'floor lamp', kind: 'floorLamp', x: 4.65, z: 1.9, w: 0.36, d: 0.36, h: 1.7, color: 'cobalt' },
    { id: 'plant', kind: 'plant', x: 1.35, z: -1.8, w: 0.4, d: 0.4, h: 0.85, color: 'tangerine' },
    { id: 'washer', kind: 'washer', x: -4.2, z: 1.35, w: 0.7, d: 0.7, h: 0.95, ry: Math.PI / 2, color: 'stock', hit: 'furniture' },
    { id: 'dryer', kind: 'dryer', x: -4.2, z: 0.55, w: 0.7, d: 0.7, h: 0.95, ry: Math.PI / 2, color: 'stock', hit: 'furniture' },
    { id: 'dryer hose', kind: 'dryerVent', x: -4.5, z: 0.1, y: 1.6, w: 0.2, d: 0.2, h: 0, ry: Math.PI / 2,
      boost: Object.assign({ kind: 'push' }, W.hose) },
    { id: 'return vent', kind: 'returnVent', x: 0.96, z: -0.4, y: 1.95, w: 0.5, d: 0.05, h: 0, ry: -Math.PI / 2,
      boost: Object.assign({ kind: 'push' }, W.vent) },
    { id: 'utility sink', kind: 'utilitySink', x: 0.5, z: -1.75, w: 0.6, d: 0.55, h: 0.9, color: 'stock', hit: 'furniture' },
    { id: 'ironing board', kind: 'ironingBoard', x: -1.5, z: 0.5, w: 1.25, d: 0.36, h: 0.9, ry: 0.55, color: 'cyan' },
    { id: 'drying rack', kind: 'clothesline', x: -4.15, z: -1.0, w: 1.2, d: 0.1, h: 1.0, lineY: 0.95, ry: Math.PI / 2, items: [{ x: [-0.45, -0.1], y: 0.5, color: 'magenta' }, { x: [0.15, 0.5], y: 0.55, color: 'yellow' }] },
    { id: 'hamper', kind: 'basket', x: -3.0, z: 1.75, w: 0.44, d: 0.44, h: 0.36, color: 'cyan' },
    { id: 'screen porch', kind: 'screenPorch', x: 0.2, z: -4.15, w: 9.6, d: 4.1, h: 2.6, doors: [{ x: -1.6, w: 2.4, torn: true }, { x: 2.7, w: 1.15 }] },
    { id: 'egg chair', kind: 'eggChair', x: -3.5, z: -4.4, w: 0.9, d: 0.9, h: 1.35, ry: 0.5, color: 'magenta' },
    { id: 'egg chair 2', kind: 'eggChair', x: 4.1, z: -3.4, w: 0.9, d: 0.9, h: 1.35, ry: -0.6, color: 'tangerine' },
    { id: 'side table', kind: 'sideTable', x: -0.2, z: -3.3, w: 0.45, d: 0.45, h: 0.55, color: 'cobalt' },
    { id: 'plant stand', kind: 'plantStand', x: 0.3, z: -5.7, w: 0.6, d: 0.4, h: 1.15, ry: 0.3 },
    { id: 'lanai mat', kind: 'mat', x: 2.1, z: -2.5, w: 0.9, d: 0.55, h: 0 },
  ];
  P.launch = { x: [1.6, 2.6], y: 1.5, z: 2.3, note: 'the gym door' };
  P.gate = { z: -6.2, x: [-4.6, 5.0], y: [0, 2.6], note: 'the lanai: the torn panel or the screen door' };
  P.accent = { wall: 'left', hue: 'cobalt' }; P.spots = ['cobalt', 'red', 'tangerine', 'rubber'];

  /* ── THE BACKYARD: the AC unit's updraft, the wide blower stream, the shed left of the pool, the swing set as an obstacle, the pool 8 m wide ── */
  const by = id => Y.props.find(p => p.id === id);
  by('leaf blower').boost = Object.assign({ kind: 'push' }, W.blower);
  by('sprinkler').x = 4.2;                                                      // the wet zone off the right road's centre: a right-yawed plane still finds it
  by('leaf blower').x = 1.0;
  Y.props.push({ id: 'ac unit', kind: 'acUnit', x: 3.9, z: -0.7, w: 0.8, d: 0.8, h: 0.8, color: 'steel', hit: 'furniture',
    boost: Object.assign({ kind: 'lift' }, W.ac) });
  Y.props.push({ id: 'heat pump', kind: 'acUnit', x: -3.2, z: -0.7, w: 0.8, d: 0.8, h: 0.8, color: 'steel', hit: 'furniture',
    boost: Object.assign({ kind: 'lift' }, W.pump) });
  by('hedge').h = 0.7;
  // the yard's far pieces, shifted by ys for yard B
  for (const f of Y.floors) if (f.mat === 'pond' && f.id !== 'pool') { f.z = [f.z[0] + ys, f.z[1] + ys]; }
  for (const f of Y.floors) if (f.mat === 'lawn' && f.z[1] === -9) { f.z = [f.z[0] + ys, -9 + ys]; }
  for (const f of Y.floors) if (f.mat === 'lawn' && f.z[0] === -40 && f.z[1] === -11.4) { f.z = [-40, -11.4 + ys]; }
  const pool = Y.floors.find(f => f.id === 'pool'), deck = Y.floors.find(f => f.id === 'deck');
  pool.x = [-4, 4]; pool.z = [pool.z[0] + ys, pool.z[1] + ys]; deck.x = [-5, 5]; deck.z = [deck.z[0] + ys, deck.z[1] + ys];
  for (const id of ['trampoline', 'shed', 'grill', 'swing set', 'fence', 'palms']) { const p = by(id); if (p) p.z += ys; }
  by('shed').x = -5.4;
  const sw = by('swing set'); sw.x = 6.2; sw.picture = false; sw.hit = 'soft';
  for (const [k, dx] of [['L', -1.6], ['R', 1.6]]) Y.props.push({ id: 'swing post ' + k, kind: 'swingPost', x: sw.x + dx, z: sw.z, w: 0.12, d: 0.12, h: 2.2, color: 'red', picture: true });
  Y.props.push({ id: 'swing bar', kind: 'swingBar', x: sw.x, z: sw.z, w: 3.2, d: 0.1, y: 2.1, h: 0.1, color: 'red', picture: true });
  for (const [k, dx] of [['L', -0.75], ['R', 0.75]]) { Y.props.push({ id: 'swing seat ' + k, kind: 'swingSeat', x: sw.x + dx, z: sw.z, w: 0.5, d: 0.2, y: 0.45, h: 0.06, picture: true }); Y.props.push({ id: 'swing rope ' + k, kind: 'swingRope', x: sw.x + dx, z: sw.z, w: 0.5, d: 0.04, y: 0.51, h: 1.59, picture: true }); }
  // the swing set's parts collide through the set itself: one box for the frame and bar, the seats and ropes as clutter
  sw.w = 3.2; sw.d = 1.6; sw.h = 2.2; sw.collide = 'parts';
  Y.gate.z += ys; by('fence').gateAt = 0;
  Y.caption = 'Meanwhile, out back…';

  /* ── the run: the checkpoints and the finish from the moved gates ── */
  const zF = LEVEL.place.foyer + F.gate.z, zK = LEVEL.place.kitchen + K.gate.z, zP = LEVEL.place.pilates + P.gate.z, zPond = LEVEL.place.backyard - 11.4 + ys, zFin = LEVEL.place.backyard + Y.gate.z;
  const cps = LEVEL.checkpoints; const at = z => +(LEVEL.launch.z - z).toFixed(1);
  Object.assign(cps[0], { z: zF, at: at(zF) });
  Object.assign(cps[1], { z: zK, at: at(zK), note: 'the kitchen\'s back wall', cut: P.title, letter: 'OUT OF THE KITCHEN!', caption: P.caption, first: 'FIRST TIME OUT OF THE KITCHEN' });
  Object.assign(cps[2], { z: zP, at: at(zP), note: 'the lanai\'s far side', title: P.title, first: 'FIRST TIME PAST THE LANAI' });
  Object.assign(cps[3], { z: zPond, at: at(zPond) });
  LEVEL.finish.z = zFin; LEVEL.length = at(zFin);
  LEVEL.yard.pool = pool.z.slice(); LEVEL.yard.fence = Y.gate.z; LEVEL.yard.gate = Y.gate.z; LEVEL.yard.near = pool.z[1];
  LEVEL.pass6 = { yard, ys, winds: W, exits: { kitchen: { z: zK, backDoor: [-2.75, -1.65], window: [-1.0, 0.4], gymDoor: [1.6, 2.6] }, lanai: { z: zP, torn: [-2.8, -0.4], door: [2.125, 3.275] } } };
  return LEVEL;
}
