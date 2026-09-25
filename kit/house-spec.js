/* house-spec.js — THE HOUSE, pass 2: the fun-house print, the corridor, the obstacle courses · 23 September 2026
 *
 * Pure numbers (no Three.js, no DOM), the environment counterpart of page-one-spec.js. The builder
 * (kit/interior.js), the room page (house.html), the run page (house-run.html), the solver (kit/glide.js) and
 * the reference sheets (house/sheet.html, house/run-sheet.html) all read this file, so a room's plan, its
 * render, its obstacle course and its documentation cannot drift apart.
 *
 * Pass 2 (Isaac, 23 Sep): "colours that pop, a blue front door, coloured shoes, wacky furniture, a fun house;
 * the level is a hallway path the plane flies through; every environment has obstacles that force the player
 * to find the launch angle." So: a new palette printed with PAGE ONE's own inks, the four rooms laid end to
 * end on one axis (kit/run-spec.js places them), and every prop is an obstacle with a height.
 *
 * Units: 1 u = 1 m. Floor at y = 0. x right, z toward the reader (the diorama camera sits at +z); the run
 * flies toward −z. Walls are segments a→b with `n`, the side a viewer sees; the cutaway hides a wall whenever
 * the camera is on its back side, and a ceiling whenever the camera is above it (the dollhouse view).
 * Props are footprints { id, kind, x, z, w, d, ry, h, ... }: the builder reads them, the sheet draws them, the
 * solver collides with them (h = the obstacle height; 0 = flat, not an obstacle).
 */

/* ───────────────────────── the house palette, in three sets ─────────────────────────
 * The house is printed with PAGE ONE's three process inks, so the plane and the rooms come from the same book.
 * FREE in every room: the process set (cyan, magenta, yellow), the paper, the stock, the ink, and the
 * architecture set (oak, paver, stucco). A room then adds AT MOST FOUR spot hues and paints ONE accent wall.
 * The house has ONE wrong colour, lime, one object per room. */
export const HOUSE = {
  cyan: '#2bb3e6', magenta: '#ef4c95', yellow: '#ffd23f',      // the process set (PAGE ONE's inks)
  paper: '#fff1d6',   // interior walls: warm paper (was greige #d9cebf)
  stock: '#fdf8ee',   // trim, ceilings, casings, cushions: PAGE ONE's stock
  ink: '#30210a',     // = ink(oak): shade(L −0.38, H +8°, S +0.12). One ink for the whole house.
  oak: '#c27a3a',     // plank floor, more saturated than the photo (was #b27b4d); THE house ink is derived from it
  paver: '#c4573a',   // terracotta pavers (entry, lanai)
  stucco: '#fbe6a3',  // the exterior: a banana-cream house
  cobalt: '#2f5fd0', red: '#e8343a', tangerine: '#ff8a2a', teal: '#1fa394',   // spot hues
  lawn: '#7dc242', hedge: '#3f9a3a', steel: '#b9c0c6', rubber: '#2b2b30',    // spot hues
  lime: '#b8f04a',    // THE wrong colour: one lime object per room
};
/* derived shades the builder uses (the one sanctioned way: shade() and mix() of a palette hue) */
export const DERIVED = {
  counter: '#fff3c4',  // terrazzo counters: stock warmed with yellow, chipped with the process set
  bark: '#8a5a3c', mulch: '#6e4a2c', glass: '#2a2a31', pond: '#2bb3e6', sky: '#8cc8ec',
};

/* the environment rules (the kit LAW still holds; these are the environment's own) */
export const ENV = {
  scale: '1 u = 1 m', eye: 1.6,
  ink: { architecture: 0.45, furniture: 0.7, clutter: 0.6, landmark: 0.9, light: 0 },
  bias: { architecture: 0.3, ceiling: 0.75 },   // added to N·L: a room is lit by the room, so walls never drop to spot black; objects keep the hard key
  keyFrom: 'over the reader\'s shoulder: from the diorama camera\'s side (upper-front-right), never from the window; windows read bright by their exterior and glare strokes',
  colour: 'printed with PAGE ONE\'s inks: cyan, magenta, yellow, the paper, the stock, the ink and the architecture set are free in every room; a room adds at most four spot hues and paints one accent wall; the house\'s one wrong colour is lime, one object per room',
  shadow: 'shadows are warm: the interior shadow tint is sienna, never violet (the mauve walls of pass 1 were the first thing cut)',
  clutter: 'at most three clutter clusters per room, odd counts, left-heavy; everything else in the photo is left out',
  print: 'surfaces carry flat colour and ink line only (planks, pavers, terrazzo chips, ticks); no printed dots',
  cutaway: 'walls between the camera and the room vanish; ceilings vanish when the camera is above them',
  obstacles: 'every room is a stage of the run: one launch window, one exit gate, and the props between them are the obstacles; every prop with a height collides; exactly one good line threads each stage, and the solver proves it',
};

/* the look shared by the three interiors; the backyard overrides it */
const INTERIOR_LOOK = {
  ink: HOUSE.ink, lightDir: [0.42, 0.8, 0.45], lightCol: '#fff2dc', shadowTint: '#9a4a2a',
  fillDir: [0.1, -0.9, 0.3], fillCol: '#f0b060', rimCol: '#fff7e0', fogStart: 40, fogEnd: 220, fogMax: 0.8,
  horizon: '#e9f4f8', sky: ['#6cb7e6', '#9fd3f0', '#cfeaf6', '#e9f4f8'], skyEdges: [0.05, 0.16, 0.36], paper: '#fffaf2',
};

/* ───────────────────────── the four scenes, in run order ─────────────────────────
 * Each scene is also a STAGE of the run: `launch` is the window the player throws from (x range, height),
 * `gate` is the exit the plane must pass (a rectangle in the scene's own frame), `par` the throws a clean
 * line takes. kit/run-spec.js places the scenes end to end. */
export const SCENES = [
  {
    key: 'foyer', n: 1, title: 'THE FRONT DOOR', caption: 'Meanwhile, at the front door…',
    note: 'A covered entry of terracotta pavers under banana-cream stucco; the cobalt front door stands open on a plank hall with a tower of coloured shoes, and the living room glows cyan at the far end.',
    spots: ['cobalt', 'red', 'tangerine', 'paver'], accent: { wall: 'living back', hue: 'cyan' },
    wrong: { id: 'kettlebell', what: 'one lime kettlebell by the door' },
    landmark: 'the open front door: a cobalt slab in, a cobalt storm door out', anim: 'the storm door breathes ±3° on twos',
    look: Object.assign({}, INTERIOR_LOOK),
    floors: [
      { mat: 'paver', x: [-4, 4], z: [1, 7] },
      { mat: 'lawn', x: [-14, 14], z: [7, 16], y: -0.04 },
      { mat: 'oak', x: [-3, 3], z: [-8, 1] },
    ],
    ceilings: [{ mat: 'stucco', x: [-0.85, 0.85], z: [1, 4], y: 2.7 }, { mat: 'stock', x: [-0.95, 0.95], z: [-5, 1], y: 2.7 }, { mat: 'stock', x: [-3, 3], z: [-8, -5], y: 2.7 }],
    walls: [
      { id: 'alcove L', a: [-0.85, 4], b: [-0.85, 1], n: [1, 0], h: 2.7, mat: 'stucco' },
      { id: 'alcove R', a: [0.85, 1], b: [0.85, 4], n: [-1, 0], h: 2.7, mat: 'stucco' },
      { id: 'facade L', a: [-4, 4], b: [-0.85, 4], n: [0, 1], h: 2.7, mat: 'stucco' },
      { id: 'facade R', a: [0.85, 4], b: [4, 4], n: [0, 1], h: 2.7, mat: 'stucco' },
      { id: 'door wall', a: [-0.85, 1], b: [0.85, 1], n: [0, 1], h: 2.7, mat: 'stucco', openings: [{ at: 0.85, w: 0.95, h: 2.1, sill: 0, kind: 'door' }] },
      { id: 'hall L', a: [-0.95, 1], b: [-0.95, -5], n: [1, 0], h: 2.7, mat: 'paper' },
      { id: 'hall R', a: [0.95, -5], b: [0.95, 1], n: [-1, 0], h: 2.7, mat: 'paper' },
      { id: 'hall mouth', a: [-0.95, -5], b: [0.95, -5], n: [0, -1], h: 2.7, mat: 'paper', openings: [{ at: 0.95, w: 1.9, h: 2.2, sill: 0, kind: 'opening' }] },
      { id: 'hall end L', a: [-3, -5], b: [-0.95, -5], n: [0, -1], h: 2.7, mat: 'paper' },
      { id: 'hall end R', a: [0.95, -5], b: [3, -5], n: [0, -1], h: 2.7, mat: 'paper' },
      { id: 'living back', a: [-3, -8], b: [3, -8], n: [0, 1], h: 2.7, mat: 'cyan', openings: [{ at: 3, w: 2.0, h: 2.2, sill: 0, kind: 'opening' }] },
      { id: 'living L', a: [-3, -5], b: [-3, -8], n: [1, 0], h: 2.7, mat: 'paper' },
      { id: 'living R', a: [3, -8], b: [3, -5], n: [-1, 0], h: 2.7, mat: 'paper' },
    ],
    props: [
      { id: 'front door', kind: 'door', x: -0.475, z: 1, w: 0.95, d: 0.05, h: 2.05, hinge: 'L', open: 90, into: -1, color: 'cobalt', landmark: true },
      { id: 'storm door', kind: 'stormDoor', x: 0.475, z: 1.06, w: 0.95, d: 0.05, h: 2.05, hinge: 'R', open: 85, into: 1, color: 'cobalt', landmark: true },
      { id: 'doormat', kind: 'mat', x: 0, z: 1.55, w: 0.9, d: 0.58, h: 0 },
      { id: 'kettlebell', kind: 'kettlebell', x: -0.55, z: 2.7, w: 0.22, d: 0.22, h: 0.25 },
      { id: 'lantern', kind: 'lantern', x: -1.35, z: 4.05, w: 0.22, d: 0.2, y: 1.75, h: 0 },
      { id: 'ceiling light', kind: 'flushLight', x: 0, z: 2.5, w: 0.34, d: 0.34, y: 2.7, h: 0 },
      { id: 'shoe tower', kind: 'shoeTower', x: 0.5, z: -1.7, w: 0.32, d: 0.9, h: 1.45, colors: ['cyan', 'magenta', 'yellow', 'red', 'tangerine', 'cobalt', 'stock'] },
      { id: 'basket', kind: 'basket', x: -0.66, z: -0.75, w: 0.44, d: 0.44, h: 0.36, color: 'yellow' },
      { id: 'hall pendant', kind: 'pendant', x: -0.6, z: -3.2, w: 0.3, d: 0.3, y: 2.7, h: 1.0, color: 'tangerine' },
      { id: 'box fan', kind: 'boxFan', x: -0.55, z: -0.35, w: 0.5, d: 0.2, h: 0.55, color: 'cyan', boost: { kind: 'push', dir: [0, 0.12, -1], accel: 3.5, x: [-0.9, 0.9], y: [0.35, 2.4], z: [-4.6, -0.6] } },
      { id: 'sofa', kind: 'sofa', x: -0.3, z: -6.2, w: 2.4, d: 0.95, h: 1.02, color: 'red' },
      { id: 'rug', kind: 'rug', x: -0.3, z: -6.6, w: 2.6, d: 1.8, h: 0 },
      { id: 'pendant', kind: 'pendant', x: 1.6, z: -6.4, w: 0.4, d: 0.4, y: 2.7, h: 1.0, color: 'tangerine' },
    ],
    exterior: 'front',
    launch: { x: [-0.5, 0.5], y: 1.5, z: 4.6, note: 'the front step, at the mouth of the entry' },
    gate: { z: -5, x: [-0.95, 0.95], y: [0, 2.2], note: 'the hall\'s mouth' },
    par: 2,
    course: 'in between the two door leaves (the storm door swings out on the right, the front door swings in on the left), left of the shoe tower, under the hall pendant, out the hall\'s mouth',
    views: {
      diorama: { target: [0, 0.4, -1.2], yaw: 34, el: 40, dist: 16, fov: 36 },
      eye:     { target: [0, 1.1, -2], yaw: 0, el: 3.5, dist: 6.2, fov: 58 },
      detail:  { target: [0.35, 0.9, 0.6], yaw: 40, el: 12, dist: 3.4, fov: 44 },
    },
    refs: ['foyer-1', 'foyer-2', 'foyer-3'],
  },
  {
    key: 'kitchen', n: 2, title: 'THE LIVING ROOM & KITCHEN', caption: 'Meanwhile, in the kitchen…',
    note: 'Over the red sofa, through the arch, over the peninsula between the tangerine pendants, and out the door beside the range: teal shaker cabinets, terrazzo counters chipped with the process set, a magenta wall with the clock.',
    spots: ['teal', 'tangerine', 'steel', 'rubber'], accent: { wall: 'left', hue: 'magenta' },
    wrong: { id: 'kettle', what: 'one lime kettle steaming on the peninsula' },
    landmark: 'the range and microwave stack', anim: 'the kettle breathes steam on twos',
    look: Object.assign({}, INTERIOR_LOOK),
    floors: [{ mat: 'oak', x: [-2.3, 2.3], z: [-2, 2.4] }],
    ceilings: [{ mat: 'stock', x: [-2.3, 2.3], z: [-2, 2.4], y: 2.7 }],
    walls: [
      { id: 'back', a: [-2.3, -2], b: [2.3, -2], n: [0, 1], h: 2.7, mat: 'paper', openings: [{ at: 3.3, w: 1.0, h: 2.2, sill: 0, kind: 'door' }] },
      { id: 'left', a: [-2.3, 2.4], b: [-2.3, -2], n: [1, 0], h: 2.7, mat: 'magenta' },
      { id: 'right', a: [2.3, -2], b: [2.3, 2.4], n: [-1, 0], h: 2.7, mat: 'paper' },
    ],
    props: [
      { id: 'base run', kind: 'baseRun', x: -0.9, z: -1.69, w: 2.8, d: 0.62, h: 0.92, gaps: [[-0.55, 0.76]], color: 'teal' },
      { id: 'upper run', kind: 'upperRun', x: -0.975, z: -1.83, w: 2.65, d: 0.34, h: 0.86, gaps: [[-0.55, 0.76]], color: 'teal' },
      { id: 'range', kind: 'range', x: -0.55, z: -1.68, w: 0.76, d: 0.66, h: 1.03, landmark: true },
      { id: 'microwave', kind: 'microwave', x: -0.55, z: -1.8, w: 0.76, d: 0.4, y: 1.48, h: 0.42, landmark: true },
      { id: 'kettle', kind: 'kettle', x: 0.55, z: 0.95, w: 0.2, d: 0.2, y: 0.94, h: 0.3, boost: { kind: 'lift', dir: [0, 1, 0], accel: 7, x: [0.1, 1.0], y: [1.05, 2.5], z: [0.45, 1.45] } },
      { id: 'gym door', kind: 'door', x: 1.5, z: -2, w: 1.0, d: 0.05, h: 2.2, hinge: 'R', open: 90, into: 1, color: 'teal' },
      { id: 'peninsula', kind: 'peninsula', x: -0.1, z: 0.95, w: 2.6, d: 1.0, h: 0.94, color: 'teal' },
      { id: 'sink', kind: 'sink', x: -0.35, z: 0.8, w: 0.76, d: 0.46, h: 0 },
      { id: 'faucet', kind: 'faucet', x: -0.35, z: 0.53, w: 0.1, d: 0.1, h: 0.36 },
      { id: 'dish rack', kind: 'dishRack', x: -1.15, z: -1.72, w: 0.46, d: 0.34, h: 0.2 },
      { id: 'paper towel', kind: 'paperTowel', x: 1.0, z: 1.1, w: 0.16, d: 0.16, h: 0.34 },
      { id: 'bowl', kind: 'bowl', x: 0.1, z: 1.2, w: 0.2, d: 0.2, h: 0.11, color: 'magenta' },
      { id: 'bread box', kind: 'breadBox', x: -1.72, z: -1.72, w: 0.46, d: 0.3, h: 0.26, color: 'tangerine' },
      { id: 'bananas', kind: 'bananas', x: -2.05, z: -1.62, w: 0.24, d: 0.16, h: 0 },
      { id: 'knife block', kind: 'knifeBlock', x: 0.2, z: -1.75, w: 0.16, d: 0.22, h: 0.28 },
      { id: 'runner', kind: 'rug', x: -0.55, z: -0.85, w: 0.62, d: 1.1, h: 0, pattern: 'runner' },
      { id: 'pendant L', kind: 'pendant', x: -0.75, z: 0.95, w: 0.3, d: 0.3, y: 2.7, h: 0.85, color: 'tangerine' },
      { id: 'pendant R', kind: 'pendant', x: 1.05, z: 0.95, w: 0.3, d: 0.3, y: 2.7, h: 0.85, color: 'tangerine' },
      { id: 'clock', kind: 'clock', x: -2.28, z: 0.4, w: 0.04, d: 0.5, y: 1.75, h: 0, color: 'cyan' },
    ],
    exterior: null,
    launch: { x: [-0.7, 0.7], y: 1.5, z: 5.0, note: 'the hall\'s mouth (foyer z −5, in this scene\'s frame z +5.0)' },
    gate: { z: -2, x: [0.5, 1.5], y: [0, 2.2], note: 'the door beside the range' },
    par: 3,
    course: 'over the sofa (1.0 m), through the arch, over the peninsula between the faucet and the dish rack, under the right pendant, through the door before its open leaf',
    views: {
      diorama: { target: [-0.1, 0.8, -0.2], yaw: 28, el: 36, dist: 9.4, fov: 38 },
      eye:     { target: [-0.4, 1.0, -1.6], yaw: 8, el: 8, dist: 4.3, fov: 60 },
      detail:  { target: [-0.55, 1.2, -1.65], yaw: 18, el: 6, dist: 2.7, fov: 46 },
    },
    refs: ['kitchen-1', 'kitchen-2', 'kitchen-3'],
  },
  {
    key: 'pilates', n: 3, title: 'THE PILATES ROOM & LANAI', caption: 'Meanwhile, in the Pilates room…',
    note: 'The canary reformer on its diagonal over black mats, the cherry drum fan blowing across the room, a cobalt wall with the arched mirror, the sliders with one pane open onto the lanai, and the screen door at the far end.',
    spots: ['cobalt', 'red', 'tangerine', 'rubber'], accent: { wall: 'left', hue: 'cobalt' },
    wrong: { id: 'agility ladder', what: 'the lime agility ladder' },
    landmark: 'the reformer', anim: 'the drum fan spins on twos; its wind is drawn as dashes',
    look: Object.assign({}, INTERIOR_LOOK),
    floors: [{ mat: 'oak', x: [-2.3, 2.3], z: [-2.1, 2.3] }, { mat: 'rubber', x: [-2.0, 2.0], z: [-1.9, 1.9], y: 0.012 }, { mat: 'paver', x: [-2.3, 2.3], z: [-6.2, -2.1], y: -0.05 }, { mat: 'lawn', x: [-16, 16], z: [-30, -6.2], y: -0.1 }],
    ceilings: [{ mat: 'stock', x: [-2.3, 2.3], z: [-2.1, 2.3], y: 2.7 }],
    walls: [
      { id: 'back', a: [-2.3, -2.1], b: [2.3, -2.1], n: [0, 1], h: 2.7, mat: 'paper', openings: [{ at: 2.3, w: 3.2, h: 2.3, sill: 0, kind: 'slider', open: 'right' }] },
      { id: 'left', a: [-2.3, 2.3], b: [-2.3, -2.1], n: [1, 0], h: 2.7, mat: 'cobalt' },
      { id: 'right', a: [2.3, -2.1], b: [2.3, 2.3], n: [-1, 0], h: 2.7, mat: 'paper' },
    ],
    props: [
      { id: 'reformer', kind: 'reformer', x: 0.15, z: 0.0, w: 0.68, d: 2.45, h: 0.7, ry: -0.42, color: 'yellow', landmark: true },
      { id: 'agility ladder', kind: 'ladder', x: -0.2, z: 1.45, w: 3.2, d: 0.45, h: 0, ry: 0.06 },
      { id: 'drum fan', kind: 'fan', x: 1.85, z: -1.05, w: 0.8, d: 0.4, h: 0.95, ry: -Math.PI / 2, color: 'red',
        boost: { kind: 'wind', dir: [-0.3, 0.65, -0.7], accel: 12, x: [-1.7, 1.6], y: [0.25, 2.2], z: [-1.9, -0.3] } },
      { id: 'mirror', kind: 'mirror', x: -2.2, z: 0.35, w: 0.08, d: 0.8, h: 0, ry: Math.PI / 2, onWall: 'left' },
      { id: 'floor lamp', kind: 'floorLamp', x: 1.95, z: -1.75, w: 0.36, d: 0.36, h: 1.7, color: 'cobalt' },
      { id: 'plant', kind: 'plant', x: -1.95, z: -1.8, w: 0.4, d: 0.4, h: 0.85, color: 'tangerine' },
      { id: 'screen cage', kind: 'screenCage', x: 0, z: -4.15, w: 4.6, d: 4.1, h: 2.6, doorAt: 0.575, doorW: 1.15 },
      { id: 'egg chair', kind: 'eggChair', x: -0.9, z: -4.2, w: 0.9, d: 0.9, h: 1.35, ry: 0.5, color: 'magenta' },
      { id: 'egg chair 2', kind: 'eggChair', x: 1.85, z: -3.4, w: 0.9, d: 0.9, h: 1.35, ry: -0.6, color: 'tangerine' },
      { id: 'side table', kind: 'sideTable', x: 0.45, z: -3.3, w: 0.45, d: 0.45, h: 0.55, color: 'cobalt' },
      { id: 'plant stand', kind: 'plantStand', x: -1.7, z: -5.6, w: 0.6, d: 0.4, h: 1.15, ry: 0.3 },
      { id: 'lanai mat', kind: 'mat', x: 0.8, z: -2.5, w: 0.9, d: 0.55, h: 0 },
    ],
    exterior: 'lanai',
    launch: { x: [0.65, 1.35], y: 1.5, z: 2.3, note: 'the gym door' },
    gate: { z: -6.2, x: [0, 1.15], y: [0, 2.0], note: 'the screen door' },
    par: 3,
    course: 'over the reformer and through the open right pane; the fan lifts the plane and drifts it left, just enough to meet the screen door on the right',
    views: {
      diorama: { target: [0, 0.5, -1.4], yaw: 30, el: 38, dist: 11, fov: 38 },
      eye:     { target: [-0.2, 0.9, -1.6], yaw: 12, el: 9, dist: 4.4, fov: 62 },
      detail:  { target: [0.1, 0.35, 0.1], yaw: 52, el: 22, dist: 3.4, fov: 44 },
    },
    refs: ['pilates-1', 'pilates-2', 'pilates-3'],
  },
  {
    key: 'backyard', n: 4, title: 'THE BACKYARD', caption: 'Meanwhile, out back…',
    note: 'From the screen door: the hedge, the clothesline with the washing out, the lime sprinkler throwing its fan of water, the lawn down to the cyan pond, and the white fence with its gate between the three palms.',
    spots: ['tangerine', 'cobalt', 'lawn', 'hedge'], accent: null,
    wrong: { id: 'sprinkler', what: 'one lime sprinkler in the bed' },
    landmark: 'the three palms behind the gate', anim: 'the sprinkler rocks on twos; fronds sway; clouds drift on ones',
    look: Object.assign({}, INTERIOR_LOOK, { lightDir: [0.5, 0.72, 0.48], lightCol: '#fff4d6', shadowTint: '#2f5f8a', fillCol: '#b8e07a', rimCol: '#d8f0ff',
      fogStart: 14, fogEnd: 150, fogMax: 0.85, horizon: '#e4f2f7', sky: ['#4ea9e2', '#86c6ee', '#c6e6f5', '#e4f2f7'], skyEdges: [0.04, 0.13, 0.3] }),
    floors: [{ mat: 'lawn', x: [-40, 40], z: [-9, 2], y: -0.07 }, { mat: 'mulch', x: [-20, 20], z: [-1.3, -0.2], y: -0.02 }, { mat: 'lawn', x: [-40, -14], z: [-11.4, -9], y: -0.07 }, { mat: 'lawn', x: [14, 40], z: [-11.4, -9], y: -0.07 },
      { mat: 'pond', x: [-14, 14], z: [-11.4, -9], y: -0.3 }, { mat: 'lawn', x: [-80, 80], z: [-40, -11.4], y: -0.1 }],
    ceilings: [],
    walls: [],
    props: [
      { id: 'hedge', kind: 'hedge', x: 0, z: -0.75, w: 13, d: 1.0, h: 1.0, count: 7 },
      { id: 'sprinkler', kind: 'sprinkler', x: 1.8, z: -6.0, w: 2.4, d: 0.8, h: 1.6 },
      { id: 'clothesline', kind: 'clothesline', x: 0, z: -3.5, w: 4.4, d: 0.1, h: 1.9, lineY: 1.6, items: [{ x: [-1.6, -0.9], y: 0.9, color: 'cyan' }, { x: [0.7, 1.2], y: 1.0, color: 'yellow' }, { x: [1.5, 2.05], y: 0.5, color: 'magenta' }] },
      { id: 'cardinal', kind: 'cardinal', x: 2.1, z: -3.5, w: 0.2, d: 0.1, y: 1.6, h: 0 },
      { id: 'leaf blower', kind: 'leafBlower', x: 1.35, z: -0.95, w: 0.55, d: 0.25, h: 0.35, color: 'tangerine', boost: { kind: 'push', dir: [0.12, 0.3, -0.94], accel: 5.5, x: [-1.7, 1.3], y: [0.2, 2.6], z: [-7.2, -3.7] } },
      { id: 'live oak', kind: 'oak', x: 4.5, z: -7.0, w: 8, d: 8, h: 6.5 },
      { id: 'palms', kind: 'palms', x: -3.5, z: -14.5, w: 6, d: 4, h: 9, landmark: true },
      { id: 'fence', kind: 'fence', x: 0, z: -13, w: 60, d: 0.2, h: 1.95, gateAt: 0, gateW: 1.2 },
    ],
    exterior: 'yard',
    launch: { x: [0.15, 1.0], y: 1.5, z: 0, note: 'the screen door' },
    gate: { z: -13, x: [-0.6, 0.6], y: [0, 1.9], note: 'the gate in the fence' },
    par: 3,
    course: 'over the hedge, under the clothesline through the wide gap in the washing, into the leaf blower\'s stream, over the pond, through the gate',
    views: {
      diorama: { target: [0, 1.4, -6], yaw: 22, el: 16, dist: 16, fov: 52 },
      eye:     { target: [0.2, 1.0, -8], yaw: 2, el: 2.5, dist: 9, fov: 60 },
      detail:  { target: [1.8, 0.6, -6.0], yaw: 28, el: 14, dist: 3.9, fov: 46 },
    },
    refs: ['backyard-1', 'backyard-2', 'backyard-3'],
  },
];

export const VIEW_NAMES = { diorama: 'DIORAMA', eye: 'EYE LEVEL', detail: 'DETAIL' };

/** where a camera sits for a view (yaw 0 = at +z looking −z, el degrees above) */
export function viewPose(v) {
  const y = v.yaw * Math.PI / 180, e = v.el * Math.PI / 180, t = v.target;
  return { pos: [t[0] + v.dist * Math.sin(y) * Math.cos(e), t[1] + v.dist * Math.sin(e), t[2] + v.dist * Math.cos(y) * Math.cos(e)], target: t, fov: v.fov };
}
