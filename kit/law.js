/* law.js — THE LAW of the COMIC 3D house style, as numbers · 23 September 2026 (dial 0.4 since 24 September)
 *
 * Pure data, no Three.js: the engine (kit/comic3d.js, which re-exports LAW) renders by it, and the style book
 * (style/book.html) prints it, so the book and the frames cannot disagree. README.md explains every number.
 */
export const LAW = {
  refH: 1080,                     // every px value below is stated at a 1080-px-tall frame
  bands:  { key: 0.58, shadowHi: 0.36, shadowLo: 0.08, deep: -0.22, aa: 0.012 },
  derive: { keyMix: 0.30, shadowMul: 0.55, shadowMix: 0.30, deepMix: 0.70, specWhite: 0.7 },
  dots:   { cell: 7, angle: 45, keyAngle: 15, keyWidth: 0.14, fogCell: 8, fogAngle: 75, skyCell: 10 },
  hatch:  { pitch: 6, width: 1.3, angle: -45, amount: 0.55 },
  ink:    { hero: 2.6, world: 2.0, detail: 1.0, floor: 1.15, boil: 0.8, boilFps: 12,
            creaseHero: 0.36, creaseWorld: 0.60, depthRel: 0.035, depthAbs: 0.08, fade: 0.85,
            hullD: 0.025, hullRef: 12, hullPersp: 0.6, swell: 0.22 },
  drift:  { centre: 1.6, corner: 1.6, boost: 2.2, angleDeg: 135 },
  paper:  { grain: 0.035 },
  fog:    { steps: 4 },
  twos:   { fps: 12 },
  camera: { fov: 62, fovPortrait: 80, fovBoost: 9, back: 10.5, up: 5.0, ahead: 16, lookDrop: 1.0,
            lagPos: 5.5, lagLook: 8, lateral: 0.72, rollFollow: 0.35, bobAmp: 0.15 },
  ship:   { accel: 36, vmax: 15, drag: 5.5, bankDeg: 48, pitchDeg: 22, idleAfter: 2.5 },
  // THE REALISM DIAL: 0 = the comic law as written, 1 = as real as the kit goes. Pass 3 (23 Sep) set 0.2; Isaac asked for
  // another 20 % less comic on 24 Sep (jumpr t36), so the house style is 0.4. The brand lives between 0 and 0.5.
  real:   0.4,
  brandMaxReal: 0.5,
};

/** what the dial does at a setting, in the law's own units (the style book's dial table reads this) */
export function dialAt(r = LAW.real) {
  return {
    planes: 1 - r, smooth: r, dots: 1 - r, facetRound: r, ladder: 1 - r,
    hullCm: LAW.ink.hullD * (1 - 0.5 * r) * 100, lineScale: 1 - 0.4 * r, lineToSurface: r,
    boilPx: LAW.ink.boil * (1 - r), driftPx: LAW.drift.centre * (1 - r), grainPct: LAW.paper.grain * (1 - r) * 100,
    twosFps: LAW.twos.fps * (1 + r), contactShade: 0.5 * r,
  };
}

/** the anatomy of a frame: the layers `?stage=N` stops after (9 = everything) */
export const STAGES = [
  { n: 0, key: 'armature', name: 'ARMATURE', what: 'the model in flat colour and its print, unlit' },
  { n: 1, key: 'planes', name: 'PLANES', what: 'key, midtone, shadow and deep as hard steps' },
  { n: 2, key: 'screens', name: 'SCREENS', what: 'Ben-Day dots at the seams, hatching in the deep' },
  { n: 3, key: 'world', name: 'WORLD LIGHT', what: 'the bounce plane, the rim band, the spec dot' },
  { n: 4, key: 'ink', name: 'INK', what: 'hulls and weight-graded edge lines, boiling on twos' },
  { n: 5, key: 'print', name: 'PRINT', what: 'registration drift, grain, the paper tint' },
];
