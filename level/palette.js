/* level/palette.js — the two looks of the house as pure numbers (no Three.js, no DOM): design pass 9's THE VIVID SET and design pass 10's THE REAL SET.
 *
 * Pass 9 (26 September 2026, jumpr t50; Isaac: "it still feels a little bland… make the colors a little more vibrant") found two things in the
 * built house's own frames (docs/design/09-life.md §3.1): the palette's hues sat at 50–80 % saturation, and the shading the style book tuned
 * for its dollhouse camera turned every surface the drone sees from the shadow side (the right-hand wall and every ceiling) the same brown.
 * Pass 10 (26 September 2026, jumpr t51; Isaac: "make the game feel like an actual room… gather a few images of an average real-life house…
 * base it off that") measured ten photographs of ordinary rooms (docs/design/ref/) and refilled the same slots from them: white walls, honey oak,
 * white cabinets, olive lawns, a pool the colour of a pool, one strong colour per room (docs/design/10-real-house.md §3, §4.4).
 *
 *   VIVID / REAL     the palette contract refilled (the kit's pieces name slots, the world fills them); the ink, steel and rubber never move;
 *                    THE PLANE keeps PAGE ONE's own inks (it is the hero, not the room). tools/design-pass-10/palette.mjs prints both beside the house's.
 *   *_MATS           the shading knobs the game turns on the kit's materials (game/world.js tuneMats): the key wash (keyMix, the lit face mixed
 *                    toward the light's colour) cut to 0.6 of the style's; the shadow band lifted (shadowMul) and its sienna mix cut, most on the
 *                    walls and the ceilings; the bounce plane a touch stronger. The bands, the dots, the hatching and the ink are the law's.
 *   *_LOOK           the light of the scenes: the shadow tint per kind of scene, and (the real set) the sky's bands.
 *   LOOKS            the two by name; the game applies one at boot (game/main.js: the real set unless ?look=comic; ?vivid=0 turns the shading off
 *                    for pass 8's frame). Nothing in kit/ changes: the kit's buildScene fills its kit from the exported HOUSE_PALETTE object, which
 *                    the game rewrites before any scene is built.
 */
export const VIVID = {
  cyan: '#12b6f0', magenta: '#f6388f', yellow: '#ffcf1f',       // the process set: S +12 … +14
  oak: '#cf7d2e', paver: '#d3552f', stucco: '#ffe48c',          // the grounds: warmer, more chroma
  cobalt: '#2458e6', red: '#f4262f', tangerine: '#ff7f14', teal: '#0fb1a0',   // the spot hues
  lawn: '#78cf2f', hedge: '#33a52f', lime: '#b9f635',           // the greens, the wrong colour
  pond: '#12b6f0',                                              // DERIVED: the pond and the pool follow the cyan
};
/** the shading knobs per material role (game/world.js tuneMats): keyMix is scaled, shadowMul and shadowMix are set, fillAmt scaled */
export const VIVID_MATS = {
  keyWash: 0.6,                                   // every material's keyMix × 0.6 (the style's 0.30 → 0.18; a wall's 0.25 → 0.15)
  wall:    { shadowMul: 0.74, shadowMix: 0.18 },  // the walls (M.arch): the shadow side of paper is #bda58d, warm sand (it was #907360, mud)
  ceiling: { shadowMul: 0.86, shadowMix: 0.12, bias: 0.8 },   // the ceilings (the top third of every frame): lighter still, a little more of the room's light
  floor:   { shadowMul: 0.66, shadowMix: 0.22 },  // the floors (oak, paver, rubber, lawn, mulch)
  furn:    { shadowMul: 0.62, shadowMix: 0.22 },  // furniture, fixtures, clutter, foliage: the shadow keeps the thing's own hue
  fill: 1.2,                                      // the bounce plane × 1.2
};
/** the scenes' light: the shadow tint per kind of scene (interior = a scene with a ceiling) */
export const VIVID_LOOK = {
  interior: { shadowTint: '#b8623a' },   // was #9a4a2a: a lighter, more orange sienna (the shadow stays warm; the mauve of house pass 1 stays cut)
  outdoor:  { shadowTint: '#3f70a4' },   // was #2f5f8a: the yard's cool shadow, a shade lighter
};

/* ── design pass 10: THE REAL SET, every slot from a measured colour of the ten photographs (docs/design/10-real-house.md §4.4) ── */
export const REAL = {
  paper: '#f6f0e4',                                             // the walls: living-unsplash #ededea, kitchen-ewing #f2e2cc, warmed; the same off-white in every room
  stock: '#fbf8f2',                                             // the trim, the ceilings, the cushions, and now the cabinets, the doors, the fans, the shed: white
  oak: '#b8895a',                                               // the floor: kitchen-ewing's #b5a289 / #947f64, a honey oak
  paver: '#b5674b',                                             // Isaac's terracotta pavers at the chroma of a real clay tile
  stucco: '#e8dcc3',                                            // the outside: a sand stucco
  counter: '#ede8dd',                                           // DERIVED: a white quartz with terrazzo chips (kitchen-ewing's granite #d1c1ad, lighter)
  cyan: '#5fb3c9',                                              // the pool #6cb2c5, the unsplash kitchen's tile #a1bcc1: a muted turquoise
  magenta: '#d36b5c',                                           // a coral (Florida's accent, not a process ink)
  yellow: '#e3b04b',                                            // a mustard
  cobalt: '#2a5da6',                                            // living-unsplash's sofa #056aa6 / #031227: THE FRONT DOOR, THE SOFA
  red: '#b9433a',                                               // a brick red: the cardinal, small things
  tangerine: '#c46a3d',                                         // a terracotta pot, the leaf blower
  teal: '#3f8f96',                                              // kitchen-unsplash's stools: THE KITCHEN CHAIRS
  lawn: '#6b9a3e',                                              // yard-escambia's lawn #506032, in sun
  hedge: '#3e6b35',                                             // the pines #313526 / #3c402d, lighter
  lime: '#a9d64a',                                              // the wrong colour: a lime kettle is a real kettle
  pond: '#5fb3c9',                                              // DERIVED: the pool and the pond, measured
};
export const REAL_MATS = Object.assign({}, VIVID_MATS, { wall: { shadowMul: 0.78, shadowMix: 0.18 } });   // a white wall in shadow is lighter than a cream one
export const REAL_LOOK = {
  interior: { shadowTint: '#9a7a62' },   // the shadow side of a white wall is grey-brown in every photograph, not orange
  outdoor:  { shadowTint: '#4f6f8f', sky: ['#9cc0dd', '#bcd3e6', '#dbe7ef', '#f0f4f7'], horizon: '#e2ebf1' },   // a hazy Florida sky (yard-escambia's is near white), not a poster blue: the dome's bands, and the horizon the fog fades to (the dome is fogged, so the horizon is most of the sky)
};
export const LOOKS = {
  comic: { palette: VIVID, mats: VIVID_MATS, look: VIVID_LOOK, print: { drift: 1, grain: 1 } },
  real:  { palette: REAL, mats: REAL_MATS, look: REAL_LOOK, print: { drift: 0.5, grain: 0.7 } },   // the print pass calmed: the registration drift halved, the grain × 0.7 (§4.6)
};
/** fill the kit's palette objects with a set (the game calls this once at boot, before any scene is built) */
export function fillPalette(set, ...targets) { const P = typeof set === 'string' ? LOOKS[set].palette : set; for (const t of targets) Object.assign(t, P); return P; }
/** give the level's scenes a look's light (interior = a scene with a ceiling) */
export function looks(scenes, set = 'real') { const L = typeof set === 'string' ? LOOKS[set].look : set; for (const sc of scenes) if (sc.look) Object.assign(sc.look, (sc.ceilings && sc.ceilings.length) ? L.interior : L.outdoor); return scenes; }
/** pass 9's name for the vivid light, kept for the tools */
export const vividLooks = scenes => looks(scenes, 'comic');
