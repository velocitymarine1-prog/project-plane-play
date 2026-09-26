/* level/palette.js — design pass 9: A LITTLE MORE LIFE. THE VIVID SET and the shading the rooms take when seen from inside, as pure numbers
 * (no Three.js, no DOM) · 26 September 2026 (jumpr t50). Isaac: "it still feels a little bland… make the colors a little more vibrant".
 *
 * Two things made the built house bland, measured in its own frames (docs/design/09-life.md §3.1): the palette's hues sit at 50–80 %
 * saturation, and the shading the style book tuned for its dollhouse camera (the key from over the reader's shoulder, the shadow band at
 * 0.55 mixed 30 % into sienna) turns every surface the drone looks at from the shadow side, which is the right-hand wall and every
 * ceiling of every room, into the same brown. So:
 *   VIVID        the palette contract refilled: the spot hues and the process inks gain 10–16 points of chroma at the same lightness, the
 *                grounds (the oak, the pavers, the stucco, the lawn, the hedge) gain chroma and a little warmth; the paper, the stock,
 *                the ink, steel and rubber do not move (the walls stay the page; one ink for the whole house). The plane (PAGE ONE) keeps
 *                the book's own inks: it is the hero, not the room. tools/design-pass-9/palette.mjs prints the move of every slot.
 *   VIVID_MATS   the shading knobs the game turns on the kit's materials (game/world.js tuneMats): the key wash (keyMix, the lit face
 *                mixed toward the light's colour) cut to 0.6 of the style's, so a lit red sofa is red and a lit cyan wall is cyan; the
 *                shadow band lifted (shadowMul) and its sienna mix cut, most on the walls and the ceilings, so the shadow side of a cream
 *                wall is warm sand, not mud; the bounce plane a touch stronger. The bands, the dots, the hatching and the ink are the law's.
 *   VIVID_LOOK   the light of the scenes: a lighter, more orange sienna in the interiors' shadow tint (the yard keeps its cool blue, a
 *                shade lighter); the key, the fill and the rim as they were.
 * The game applies all three at boot (game/main.js, ?vivid=0 turns them off for a comparison); nothing in kit/ changes: the kit's
 * buildScene fills its kit from the exported HOUSE_PALETTE object, which the game rewrites before any scene is built.
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
/** fill the kit's palette objects with the vivid set (the game calls this once at boot, before any scene is built) */
export function fillPalette(...targets) { for (const t of targets) Object.assign(t, VIVID); return VIVID; }
/** give the level's scenes the vivid light */
export function vividLooks(scenes) { for (const sc of scenes) if (sc.look) Object.assign(sc.look, (sc.ceilings && sc.ceilings.length) ? VIVID_LOOK.interior : VIVID_LOOK.outdoor); return scenes; }
