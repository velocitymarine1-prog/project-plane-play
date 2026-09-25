/* comic3d.js — THE COMIC 3D KIT · Isaac's house style · 23 September 2026
 *
 * One rendering law for every project from here on: 3D models as an armature for print design.
 * Quantized light bands, Ben-Day dots at the shadow boundary, deep spot blacks, expressive ink
 * of varying weight, CMYK registration drift, paper grain, and animation on twos. The numbers
 * are THE LAW (kit/law.js, pure data since 24 Sep 2026); the README explains each one and where it came from.
 * The realism dial (LAW.real, 0.4 since jumpr t36) and the anatomy flag (?stage=0..5) run through every pass.
 *
 * Pipeline (Three.js r180, WebGL2):
 *   pass 1  geometry → two render targets at once: colour (already banded + dotted) and
 *           world normal + ink weight, plus a depth texture
 *   pass 2  INK: depth/normal edge detection with weight-graded thickness, lines fade on the
 *           depth ladder, lines boil on twos
 *   pass 3  PRINT: registration drift (R/B plates offset), manga speed lines, paper grain,
 *           the world's paper tint, gate flash
 *
 * ESM. Import Three from a CDN via an import map ("three"). Nothing else is needed.
 */
import * as THREE from 'three';

THREE.ColorManagement.enabled = false;   // hex in = hex out; the band math is graphic, not photometric

/* ───────────────────────────────────────────── THE LAW (numbers) ───────────────────────────── */
// The numbers live in kit/law.js (pure, so the style book can print them); re-exported here for every page.
import { LAW, STAGES } from './law.js';
export { LAW, STAGES };
let STAGE = 9;                    // the anatomy of a frame (?stage=0..5, read by parseQuery); 9 = the whole frame
/** the frame rate of things animated on twos, with the dial: 12 fps at real 0, 24 at real 1 */
export const twosFps = () => LAW.twos.fps * (1 + LAW.real);

/* ───────────────────────────────────────────── seeded randomness ───────────────────────────── */
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const rng  = (r, a, b) => a + r() * (b - a);
export const rint = (r, a, b) => Math.floor(a + r() * (b - a + 1));
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

/* ───────────────────────────────────────────── colour algebra ──────────────────────────────── */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
export function rgb2hex(r, g, b) { const c = v => ('0' + clamp(Math.round(v), 0, 255).toString(16)).slice(-2); return '#' + c(r) + c(g) + c(b); }
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2, d = mx - mn;
  if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? ((b - r) / d + 2) : ((r - g) / d + 4); h *= 60; } return [h, s, l]; }
function hsl2rgb(h, s, l) { h = ((h % 360) + 360) % 360 / 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1); if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const t = x => { x = (x + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 0.5 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
  return [t(h + 1 / 3) * 255, t(h) * 255, t(h - 1 / 3) * 255]; }
/** shade(hex, ΔL, ΔH°, ΔS) — the one sanctioned way to derive a colour from another. */
export function shade(hex, dl, dh, ds) { const c = hex2rgb(hex), k = rgb2hsl(c[0], c[1], c[2]); const o = hsl2rgb(k[0] + (dh || 0), clamp(k[1] + (ds || 0), 0, 1), clamp(k[2] + (dl || 0), 0, 1)); return rgb2hex(o[0], o[1], o[2]); }
export function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
/** ink(hex) — a world's line colour: darkest thing in the world, never #000 (L−0.38, H+8°, S+0.12). */
export function ink(hex) { return shade(hex, -0.38, 8, 0.12); }
export const col = hex => new THREE.Color(hex);
export function ladder(nearHex, skyHex, n, gamma = 0.8) { const out = []; for (let i = 0; i < n; i++) out.push(mix(nearHex, skyHex, Math.pow((i + 1) / (n + 1), gamma))); return out; }

/* ───────────────────────────────────────────── GLSL fragments ──────────────────────────────── */
const GLSL_SCREENS = /* glsl */`
  // Ben-Day dot screen in SCREEN space (dots belong to the page, not the object).
  float c3dDots(vec2 px, float cell, float ang, float cov) {
    cov = clamp(cov, 0.0, 1.0);
    if (cov <= 0.002) return 0.0;
    if (cov >= 0.998) return 1.0;
    float s = sin(ang), c = cos(ang);
    vec2 p = vec2(c * px.x - s * px.y, s * px.x + c * px.y) / cell;
    vec2 f = fract(p) - 0.5;
    float r = sqrt(cov) * 0.76;
    float aa = 0.9 / cell;
    return 1.0 - smoothstep(r - aa, r + aa, length(f));
  }
  // line screen (crosshatch half): 1 on the line
  float c3dLines(vec2 px, float pitch, float ang, float w) {
    float s = sin(ang), c = cos(ang);
    float v = (c * px.x - s * px.y) / pitch;
    float f = abs(fract(v) - 0.5) * pitch;
    return 1.0 - smoothstep(w * 0.5 - 0.5, w * 0.5 + 0.5, f);
  }
  float c3dHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  // the depth ladder: hard rungs toward the horizon colour, dotted at each seam
  float c3dLadder(float d, float start, float end, float steps, vec2 px, float cell, float ang, float real) {
    float u = clamp((d - start) / max(end - start, 0.001), 0.0, 1.0);
    float q = floor(u * steps) / steps;
    float fr = fract(u * steps);
    float dd = c3dDots(px, cell, ang, smoothstep(0.62, 1.0, fr));
    return mix(min(q + dd / steps, 1.0), u, real);
  }
`;

/* shared per-world uniforms: every material references the SAME uniform objects */
export class ComicWorld {
  constructor(o) {
    const v3 = (x, y, z) => ({ value: new THREE.Vector3(x, y, z) });
    this.name = o.name || 'world';
    this.inkHex = o.ink; this.horizonHex = o.horizon;
    this.u = {
      uLightDir:  { value: new THREE.Vector3().fromArray(o.lightDir || [-0.45, 0.78, -0.42]).normalize() },
      uLightCol:  { value: col(o.lightCol || '#ffffff') },
      uShadowTint:{ value: col(o.shadowTint || '#202030') },
      uFillDir:   { value: new THREE.Vector3().fromArray(o.fillDir || [0.2, -0.9, 0.3]).normalize() },
      uFillCol:   { value: col(o.fillCol || '#8080ff') },
      uRimCol:    { value: col(o.rimCol || '#ffffff') },
      uInk:       { value: col(o.ink) },
      uHorizon:   { value: col(o.horizon) },
      uFogStart:  { value: o.fogStart ?? 40 },
      uFogEnd:    { value: o.fogEnd ?? 260 },
      uFogMax:    { value: o.fogMax ?? 0.86 },
      uFogSteps:  { value: LAW.fog.steps },
      uCamPos:    v3(0, 0, 0),
      uTime:      { value: 0 },
      uTime12:    { value: 0 },
      uCell:      { value: LAW.dots.cell },        // device px (set by engine)
      uFogCell:   { value: LAW.dots.fogCell },
      uSkyCell:   { value: LAW.dots.skyCell },
      uHatchPitch:{ value: LAW.hatch.pitch },
      uHatchW:    { value: LAW.hatch.width },
      uBands:     { value: new THREE.Vector4(LAW.bands.key, LAW.bands.shadowHi, LAW.bands.shadowLo, LAW.bands.deep) },
      uHullD:     { value: LAW.ink.hullD },
      uHullRef:   { value: LAW.ink.hullRef },
      uReal:      { value: o.real ?? LAW.real },   // the realism dial, shared by every material and pass
      uStage:     { value: o.stage ?? STAGE },     // the anatomy of a frame: stop after layer N (0 armature … 5 print; 9 = all)
    };
    this.materials = [];
  }
  setReal(v) { this.u.uReal.value = v; }
  setStage(n) { this.u.uStage.value = n; }
  setScale(s) { // s = device px per LAW px
    this.u.uCell.value = LAW.dots.cell * s; this.u.uFogCell.value = LAW.dots.fogCell * s; this.u.uSkyCell.value = LAW.dots.skyCell * s;
    this.u.uHatchPitch.value = LAW.hatch.pitch * s; this.u.uHatchW.value = Math.max(1.0, LAW.hatch.width * s);
  }
  tick(t, t12, camPos) { this.u.uTime.value = t; this.u.uTime12.value = t12; this.u.uCamPos.value.copy(camPos); }
}

/* ───────────────────────────────────────────── ComicMaterial ───────────────────────────────── */
const VERT_COMIC = /* glsl */`
  out vec3 vWorld; out vec3 vNormal; out vec2 vUv; out vec3 vLocal; out vec3 vIC;
  #ifdef USE_VCOL
  out vec3 vColor;
  #endif
  void main() {
    mat4 mm = modelMatrix;
    vIC = vec3(1.0);
    #ifdef USE_INSTANCING
    mm = modelMatrix * instanceMatrix;
    #endif
    #ifdef USE_INSTANCING_COLOR
    vIC = instanceColor;
    #endif
    vec4 w = mm * vec4(position, 1.0);
    vWorld = w.xyz; vNormal = normalize(mat3(mm) * normal); vUv = uv; vLocal = position;
    #ifdef USE_VCOL
    vColor = color;
    #endif
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const FRAG_COMIC = /* glsl */`
  in vec3 vWorld; in vec3 vNormal; in vec2 vUv; in vec3 vLocal; in vec3 vIC;
  #ifdef USE_VCOL
  in vec3 vColor;
  #endif
  uniform vec3 uColor, uColor2, uColor3, uEmissive;
  uniform float uStripeMode, uStripeFreq, uGradMode, uGradLo, uGradHi;
  uniform vec3 uStripeDir;
  uniform sampler2D uMap, uEmap; uniform float uHasMap, uHasEmap, uEmissiveAmt, uEmapScale; uniform vec2 uEmapScroll;
  uniform float uFlat, uHatch, uInkWeight, uKeyMix, uShadowMul, uShadowMix, uSpec, uGloss, uRim, uFillAmt, uUnlit, uFog, uFogBias, uBias, uReal, uStage;
  uniform vec3 uLightDir, uLightCol, uShadowTint, uFillDir, uFillCol, uRimCol, uInk, uHorizon, uCamPos;
  uniform float uFogStart, uFogEnd, uFogMax, uFogSteps, uTime, uTime12, uCell, uFogCell, uHatchPitch, uHatchW;
  uniform vec4 uBands;
  layout(location = 0) out vec4 oColor;
  layout(location = 1) out vec4 oNormal;
  ${GLSL_SCREENS}
  void main() {
    vec3 base = uColor * vIC;
    #ifdef USE_VCOL
    base *= vColor;
    #endif
    if (uHasMap > 0.5) { vec4 t = texture(uMap, vUv); base = mix(base, t.rgb, t.a); }
    if (uStripeMode > 0.5 && uStripeMode < 1.5) { float s = step(0.5, fract(dot(vLocal, uStripeDir) * uStripeFreq)); base = mix(base, uColor2, s); }
    else if (uStripeMode > 1.5 && uStripeMode < 2.5) { float s = step(0.5, fract((vUv.x + vUv.y * 0.35) * uStripeFreq)); base = mix(base, uColor2, s); }
    else if (uStripeMode > 2.5) { float s = step(0.5, fract(vUv.y * uStripeFreq)); base = mix(base, uColor2, s); }
    if (uGradMode > 0.5) { float g = clamp((vLocal.y - uGradLo) / (uGradHi - uGradLo), 0.0, 1.0); base = g < 0.34 ? uColor : (g < 0.67 ? uColor2 : uColor3); }

    vec3 Ns = normalize(vNormal);
    vec3 N = uFlat > 0.5 ? normalize(mix(normalize(cross(dFdx(vWorld), dFdy(vWorld))), Ns, uReal)) : Ns;   // the dial rounds the flat facets a little
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(uCamPos - vWorld);
    vec2 px = gl_FragCoord.xy;
    vec3 c = base;
    if (uUnlit < 0.5 && uStage > 0.5) {                               // stage 0 (the armature) stops here: flat colour and print
      float scr = step(1.5, uStage), wl = step(2.5, uStage);          // stage 1 = hard planes only; 2 adds the screens; 3 the world's light
      float n = dot(N, uLightDir) + uBias;   // bias: architecture is lit by the room, not only the key (THE HOUSE)
      vec3 keyC  = mix(base, uLightCol, uKeyMix);
      vec3 shC   = mix(base * uShadowMul, uShadowTint, uShadowMix);
      vec3 deepC = mix(shC, uInk, ${LAW.derive.deepMix.toFixed(2)});
      float aa = ${LAW.bands.aa.toFixed(3)};
      // HIGH KEY: one hard plane
      float kmask = smoothstep(uBands.x - aa, uBands.x + aa, n);
      c = mix(c, keyC, kmask);
      // light-side screen: dots of the key colour thinning away from the key plane
      float dK = c3dDots(px, uCell, ${(LAW.dots.keyAngle * Math.PI / 180).toFixed(4)}, smoothstep(uBands.x - ${LAW.dots.keyWidth.toFixed(2)}, uBands.x, n));
      c = mix(c, keyC, dK * (1.0 - kmask) * scr);
      // SHADOW: Ben-Day dots growing into the shadow plane
      float covS = smoothstep(uBands.y, uBands.z, n);
      float dS = mix(step(0.5, covS), c3dDots(px, uCell, ${(LAW.dots.angle * Math.PI / 180).toFixed(4)}, covS), scr);
      c = mix(c, shC, dS);
      // DEEP: the spot-black pool, hatched
      float deepMask = 1.0 - smoothstep(uBands.w - aa * 2.0, uBands.w + aa * 2.0, n);
      c = mix(c, deepC, deepMask);
      float h = c3dLines(px, uHatchPitch, ${(LAW.hatch.angle * Math.PI / 180).toFixed(4)}, uHatchW);
      c = mix(c, uInk, h * deepMask * uHatch * ${LAW.hatch.amount.toFixed(2)} * scr);
      // WORLD FILL: one hard bounce plane on the shadow side (the world's colour under the object)
      float f = dot(N, uFillDir);
      float fillMask = smoothstep(0.42, 0.48, f) * (1.0 - smoothstep(uBands.y - 0.05, uBands.y + 0.05, n));
      c = mix(c, uFillCol, fillMask * uFillAmt * wl);
      // RIM: a hard edge-light band, shadow side only
      float fr = 1.0 - max(dot(N, V), 0.0);
      float rimMask = smoothstep(0.74, 0.79, fr) * (1.0 - smoothstep(uBands.y, uBands.y + 0.12, n));
      c = mix(c, uRimCol, rimMask * uRim * wl);
      // SPEC: one hard highlight dot
      vec3 R = reflect(-uLightDir, N);
      float sp = pow(max(dot(R, V), 0.0), uGloss);
      c = mix(c, mix(keyC, vec3(1.0), ${LAW.derive.specWhite.toFixed(2)}), smoothstep(0.45, 0.55, sp) * uSpec * wl);
      // THE DIAL: the same light as a smooth painting (no planes, no dots, a soft fill, a soft rim, a soft highlight), blended in by uReal
      float ls = smoothstep(-0.25, 0.85, n);
      vec3 cs = mix(shC, keyC, ls);
      cs = mix(cs, uFillCol, smoothstep(0.2, 0.7, f) * (1.0 - ls) * uFillAmt * wl);
      cs = mix(cs, uRimCol, smoothstep(0.55, 0.95, fr) * (1.0 - ls) * uRim * 0.6 * wl);
      cs = mix(cs, mix(keyC, vec3(1.0), ${LAW.derive.specWhite.toFixed(2)}), sp * uSpec * wl);
      c = mix(c, cs, uReal);
    }
    if (uHasEmap > 0.5) { vec4 e = texture(uEmap, vUv * uEmapScale + uEmapScroll * uTime12); c = mix(c, uEmissive, e.a * uEmissiveAmt); }
    else if (uEmissiveAmt > 0.001) { c = mix(c, uEmissive, uEmissiveAmt); }
    if (uFog > 0.5) {
      float d = distance(vWorld, uCamPos) + uFogBias;
      float q = c3dLadder(d, uFogStart, uFogEnd, uFogSteps, px, uFogCell, ${(LAW.dots.fogAngle * Math.PI / 180).toFixed(4)}, uReal);
      c = mix(c, uHorizon, q * uFogMax);
    }
    oColor = vec4(c, 1.0);
    oNormal = vec4(N * 0.5 + 0.5, uInkWeight);
  }
`;

export class ComicMaterial extends THREE.ShaderMaterial {
  /** o: { world, color, color2, color3, stripe:{mode,freq,dir}, grad:{lo,hi}, map, emap, emapScale, emapScroll,
   *       emissive, emissiveAmt, flat, hatch, inkWeight, keyMix, shadowMul, shadowMix, spec, gloss, rim, fillAmt,
   *       unlit, fog, fogBias, bias (added to N·L before banding; 0 = the law), vertexColors, side, transparent } */
  constructor(o = {}) {
    const W = o.world; if (!W) throw new Error('ComicMaterial needs { world }');
    const u = {
      uColor: { value: col(o.color || '#ffffff') }, uColor2: { value: col(o.color2 || '#ffffff') }, uColor3: { value: col(o.color3 || '#ffffff') },
      uStripeMode: { value: o.stripe ? o.stripe.mode : 0 }, uStripeFreq: { value: o.stripe ? o.stripe.freq : 4 },
      uStripeDir: { value: new THREE.Vector3().fromArray(o.stripe && o.stripe.dir || [0, 1, 0]) },
      uGradMode: { value: o.grad ? 1 : 0 }, uGradLo: { value: o.grad ? o.grad.lo : 0 }, uGradHi: { value: o.grad ? o.grad.hi : 1 },
      uMap: { value: o.map || null }, uHasMap: { value: o.map ? 1 : 0 },
      uEmap: { value: o.emap || null }, uHasEmap: { value: o.emap ? 1 : 0 }, uEmapScale: { value: o.emapScale ?? 1 },
      uEmapScroll: { value: new THREE.Vector2().fromArray(o.emapScroll || [0, 0]) },
      uEmissive: { value: col(o.emissive || '#000000') }, uEmissiveAmt: { value: o.emissiveAmt ?? (o.emissive ? 1 : 0) },
      uFlat: { value: o.flat === false ? 0 : 1 }, uHatch: { value: o.hatch ?? 0 }, uInkWeight: { value: o.inkWeight ?? 0.7 },
      uKeyMix: { value: o.keyMix ?? LAW.derive.keyMix }, uShadowMul: { value: o.shadowMul ?? LAW.derive.shadowMul },
      uShadowMix: { value: o.shadowMix ?? LAW.derive.shadowMix }, uSpec: { value: o.spec ?? 0 }, uGloss: { value: o.gloss ?? 48 },
      uRim: { value: o.rim ?? 0 }, uFillAmt: { value: o.fillAmt ?? 0.35 }, uUnlit: { value: o.unlit ? 1 : 0 },
      uFog: { value: o.fog === false ? 0 : 1 }, uFogBias: { value: o.fogBias ?? 0 }, uBias: { value: o.bias ?? 0 },
    };
    for (const k in W.u) u[k] = W.u[k];
    super({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: VERT_COMIC, fragmentShader: FRAG_COMIC, defines: o.vertexColors ? { USE_VCOL: '' } : {},
      side: o.side ?? THREE.FrontSide, transparent: !!o.transparent, vertexColors: !!o.vertexColors, depthWrite: o.depthWrite !== false });
    this.world = W; W.materials.push(this);
  }
}

/* ───────────────────────────────────────────── ink hulls ───────────────────────────────────── */
const VERT_HULL = /* glsl */`
  in float aSwell;
  uniform float uHullD, uHullRef, uHullMul, uReal, uStage;
  out vec3 vWorld;
  void main() {
    if (uStage < 3.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vWorld = vec3(0.0); return; }   // no hulls before the ink stage
    mat4 mm = modelMatrix;
    #ifdef USE_INSTANCING
    mm = modelMatrix * instanceMatrix;
    #endif
    vec4 w = mm * vec4(position, 1.0);
    vec3 n = normalize(mat3(mm) * normal);
    float vz = max(0.1, -(viewMatrix * w).z);
    float d = uHullD * uHullMul * aSwell * mix(1.0, vz / uHullRef, ${LAW.ink.hullPersp.toFixed(2)}) * (1.0 - 0.5 * uReal);
    w.xyz += n * d;
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const FRAG_HULL = /* glsl */`
  in vec3 vWorld;
  uniform vec3 uInkCol, uHorizon, uCamPos; uniform float uFog, uFogStart, uFogEnd, uFogMax, uFogSteps, uFogCell, uFadeMul, uReal;
  layout(location = 0) out vec4 oColor;
  layout(location = 1) out vec4 oNormal;
  ${GLSL_SCREENS}
  void main() {
    vec3 c = uInkCol;
    if (uFog > 0.5) {
      float q = c3dLadder(distance(vWorld, uCamPos), uFogStart, uFogEnd, uFogSteps, gl_FragCoord.xy, uFogCell, ${(LAW.dots.fogAngle * Math.PI / 180).toFixed(4)}, uReal);
      c = mix(c, uHorizon, q * uFogMax * uFadeMul);
    }
    oColor = vec4(c, 1.0);
    oNormal = vec4(0.5, 0.5, 1.0, 0.0);
  }
`;
export class HullMaterial extends THREE.ShaderMaterial {
  constructor(o = {}) {
    const W = o.world; if (!W) throw new Error('HullMaterial needs { world }');
    const u = { uInkCol: { value: col(o.color || W.inkHex) }, uHullMul: { value: o.mul ?? 1 }, uFog: { value: o.fog === false ? 0 : 1 }, uFadeMul: { value: o.fade ?? 1 } };
    for (const k of ['uHullD', 'uHullRef', 'uHorizon', 'uCamPos', 'uFogStart', 'uFogEnd', 'uFogMax', 'uFogSteps', 'uFogCell', 'uReal', 'uStage']) u[k] = W.u[k];
    super({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: VERT_HULL, fragmentShader: FRAG_HULL, side: THREE.BackSide });
    this.world = W; this.opts = o;
  }
  /** a variant with a different weight multiplier (shares the world uniforms; never clone() a kit material) */
  withMul(mul) { return new HullMaterial(Object.assign({}, this.opts, { mul: (this.opts.mul ?? 1) * mul })); }
}

/** merge coincident vertices (position only) so the hull can be displaced along SMOOTH normals: no cracks at hard edges. */
export function mergeVertices(geo, tol = 1e-4) {
  const pos = geo.attributes.position; const map = new Map(); const out = []; const remap = new Int32Array(pos.count);
  const k = 1 / tol;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const key = Math.round(x * k) + '_' + Math.round(y * k) + '_' + Math.round(z * k);
    let id = map.get(key);
    if (id === undefined) { id = out.length / 3; map.set(key, id); out.push(x, y, z); }
    remap[i] = id;
  }
  const idx = [];
  if (geo.index) { const ix = geo.index; for (let i = 0; i < ix.count; i++) idx.push(remap[ix.getX(i)]); }
  else { for (let i = 0; i < pos.count; i++) idx.push(remap[i]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** hullGeometry: merged, smooth-normal copy with a per-vertex swell (the brush line breathes ±22%). */
export function hullGeometry(geo, seed = 1) {
  const g = mergeVertices(geo);
  const p = g.attributes.position; const sw = new Float32Array(p.count);
  const k = 2.3 + hash1(seed) * 1.4, ph = hash1(seed + 9) * 6.28;
  for (let i = 0; i < p.count; i++) sw[i] = 1 + LAW.ink.swell * Math.sin(k * (p.getX(i) + p.getY(i) * 1.3 + p.getZ(i) * 0.7) + ph);
  g.setAttribute('aSwell', new THREE.BufferAttribute(sw, 1));
  return g;
}
/** hullOf(mesh, material, seed, mul) → a BackSide ink shell that follows the mesh. Adds itself as a child. */
export function hullOf(mesh, hullMat, seed = 1, mul = 1) {
  const h = new THREE.Mesh(hullGeometry(mesh.geometry, seed), mul === 1 ? hullMat : hullMat.withMul(mul));
  h.name = (mesh.name || 'part') + '-ink';
  mesh.add(h);            // inherits transform
  return h;
}
/** inkAll(group, hullMat, seed): hull every Mesh in a group that has userData.ink !== false */
export function inkAll(group, hullMat, seed = 1, mul = 1) {
  let i = 0; const list = [];
  group.traverse(o => { if (o.isMesh && !o.userData.noInk && !o.name.endsWith('-ink') && !o.userData.isHull) list.push(o); });
  for (const m of list) { const h = hullOf(m, hullMat, seed + i++, m.userData.inkMul ?? mul); h.userData.isHull = true; }
  return group;
}

/* ───────────────────────────────────────────── sky dome ────────────────────────────────────── */
const FRAG_SKY = /* glsl */`
  in vec3 vWorld;
  uniform vec3 uBand0, uBand1, uBand2, uBand3; uniform vec3 uEdges; uniform float uBandW;
  uniform vec3 uSunDir, uSunCol, uSunInk; uniform float uSunR, uSunHalo, uSunOn;
  uniform vec3 uStarCol; uniform float uStars;
  uniform vec3 uCamPos; uniform float uSkyCell, uReal;
  layout(location = 0) out vec4 oColor;
  layout(location = 1) out vec4 oNormal;
  ${GLSL_SCREENS}
  void main() {
    vec3 dir = normalize(vWorld - uCamPos);
    float e = dir.y;
    vec2 px = gl_FragCoord.xy;
    float ang = 0.7854;
    // four hard bands bottom→top, each seam a dot screen of the upper band; the dial blends toward a plain gradient
    vec3 c = uBand3;
    c = mix(c, uBand2, c3dDots(px, uSkyCell, ang, smoothstep(uEdges.x - uBandW, uEdges.x + uBandW, e)));
    c = mix(c, uBand1, c3dDots(px, uSkyCell, ang, smoothstep(uEdges.y - uBandW, uEdges.y + uBandW, e)));
    c = mix(c, uBand0, c3dDots(px, uSkyCell, ang, smoothstep(uEdges.z - uBandW, uEdges.z + uBandW, e)));
    vec3 g = uBand3; g = mix(g, uBand2, smoothstep(uEdges.x - 0.1, uEdges.x + 0.1, e)); g = mix(g, uBand1, smoothstep(uEdges.y - 0.12, uEdges.y + 0.12, e)); g = mix(g, uBand0, smoothstep(uEdges.z - 0.16, uEdges.z + 0.16, e));
    c = mix(c, g, uReal);
    if (uStars > 0.001) {
      vec2 cellId = floor(dir.xz / max(dir.y, 0.05) * 22.0 + 100.0);
      float h = c3dHash(cellId);
      vec2 f = fract(dir.xz / max(dir.y, 0.05) * 22.0 + 100.0) - 0.5;
      float star = step(1.0 - uStars, h) * (1.0 - smoothstep(0.03, 0.06, length(f))) * smoothstep(0.02, 0.2, e);
      c = mix(c, uStarCol, star);
    }
    if (uSunOn > 0.5) {
      float a = dot(dir, uSunDir);
      float disc = smoothstep(cos(uSunR) - 0.0006, cos(uSunR) + 0.0006, a);
      float ring = smoothstep(cos(uSunR * 1.14) - 0.0006, cos(uSunR * 1.14) + 0.0006, a) - disc;
      float haloCov = smoothstep(cos(uSunR * 2.6), cos(uSunR * 1.14), a) * uSunHalo;
      c = mix(c, mix(c, uSunCol, 0.55), c3dDots(px, uSkyCell * 1.3, ang, haloCov));
      c = mix(c, uSunInk, ring);
      c = mix(c, uSunCol, disc);
    }
    oColor = vec4(c, 1.0);
    oNormal = vec4(0.5, 0.5, 1.0, 0.0);
  }
`;
export function skyDome(world, o) {
  const u = {
    uBand0: { value: col(o.bands[0]) }, uBand1: { value: col(o.bands[1]) }, uBand2: { value: col(o.bands[2]) }, uBand3: { value: col(o.bands[3]) },
    uEdges: { value: new THREE.Vector3().fromArray(o.edges || [0.02, 0.12, 0.30]) }, uBandW: { value: o.bandW ?? 0.03 },
    uSunDir: { value: new THREE.Vector3().fromArray(o.sunDir || [0.5, 0.5, -0.7]).normalize() }, uSunCol: { value: col(o.sunCol || '#ffe66b') },
    uSunInk: { value: col(o.sunInk || world.inkHex) }, uSunR: { value: (o.sunDeg ?? 7) * Math.PI / 180 }, uSunHalo: { value: o.sunHalo ?? 0.7 }, uSunOn: { value: o.sun ? 1 : 0 },
    uStarCol: { value: col(o.starCol || '#ffffff') }, uStars: { value: o.stars ?? 0 },
    uCamPos: world.u.uCamPos, uSkyCell: world.u.uSkyCell, uReal: world.u.uReal,
  };
  const mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, side: THREE.BackSide, depthWrite: false,
    vertexShader: `out vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: FRAG_SKY });
  const m = new THREE.Mesh(new THREE.SphereGeometry(o.radius || 900, 24, 12), mat);
  m.name = 'sky'; m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

/* ───────────────────────────────────────────── geometry kit ────────────────────────────────── */
function profR(rows, t) { let m = rows[rows.length - 1][1];
  for (let k = 0; k < rows.length - 1; k++) if (t >= rows[k][0] && t <= rows[k + 1][0]) { let u = (t - rows[k][0]) / Math.max(1e-6, rows[k + 1][0] - rows[k][0]); u = u * u * (3 - 2 * u); m = rows[k][1] + (rows[k + 1][1] - rows[k][1]) * u; break; }
  return m; }
/** latheZ(rows [[t, r]...], length, radial segments, points) → body along z; t=1 end at −z (the nose). */
export function latheZ(rows, L, seg = 8, nPts = 16) {
  const pts = []; for (let i = 0; i <= nPts; i++) { const t = i / nPts; pts.push(new THREE.Vector2(Math.max(0.004, profR(rows, t)), t * L)); }
  const g = new THREE.LatheGeometry(pts, seg); g.rotateX(-Math.PI / 2); g.translate(0, 0, L / 2); return g;
}
export function latheY(rows, H, seg = 10, nPts = 14) {
  const pts = []; for (let i = 0; i <= nPts; i++) { const t = i / nPts; pts.push(new THREE.Vector2(Math.max(0.004, profR(rows, t)), t * H)); }
  return new THREE.LatheGeometry(pts, seg);
}
/** plate(points [[x,y]...], thickness, bevel) → an extruded flat shape, centred on z. */
export function plate(points, thick, bevel = 0.04) {
  const s = new THREE.Shape(); s.moveTo(points[0][0], points[0][1]); for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, steps: 1 });
  g.translate(0, 0, -thick / 2); return g;
}
/** mergeGeometries(list of {geometry, matrix?}) → one non-indexed geometry with position/normal/uv (+color if all carry it). */
export function mergeGeometries(items) {
  const P = [], N = [], U = [], C = []; let hasC = true;
  for (const it of items) {
    let g = it.geometry || it; if (g.index) g = g.toNonIndexed();
    const m = it.matrix || null; const nm = m ? new THREE.Matrix3().getNormalMatrix(m) : null;
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, c = g.attributes.color; if (!c) hasC = false;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i)); if (m) v.applyMatrix4(m); P.push(v.x, v.y, v.z);
      v.set(n ? n.getX(i) : 0, n ? n.getY(i) : 1, n ? n.getZ(i) : 0); if (nm) v.applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z);
      U.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      if (c) C.push(c.getX(i), c.getY(i), c.getZ(i));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  if (hasC && C.length) g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return g;
}
/** faceColors(geo, fn(cx,cy,cz,nx,ny,nz) → [r,g,b] in 0..1) → non-indexed geometry with one flat colour per face. */
export function faceColors(geo, fn, quads = false) {
  const g = geo.index ? geo.toNonIndexed() : geo; const p = g.attributes.position; const cols = new Float32Array(p.count * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), n2 = new THREE.Vector3();
  const tri = (i, out) => { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2); out.copy(b).sub(a).cross(c.clone().sub(a)).normalize();
    return [(a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3]; };
  const stride = quads ? 6 : 3;
  for (let i = 0; i < p.count; i += stride) {
    let [cx, cy, cz] = tri(i, n);
    if (quads && i + 5 < p.count) { const [dx, dy, dz] = tri(i + 3, n2); cx = (cx + dx) / 2; cy = (cy + dy) / 2; cz = (cz + dz) / 2; n.add(n2).normalize(); }
    const rgb = fn(cx, cy, cz, n.x, n.y, n.z);
    for (let k = 0; k < stride && i + k < p.count; k++) { cols[(i + k) * 3] = rgb[0]; cols[(i + k) * 3 + 1] = rgb[1]; cols[(i + k) * 3 + 2] = rgb[2]; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals(); return g;
}
export const rgb01 = hex => { const c = hex2rgb(hex); return [c[0] / 255, c[1] / 255, c[2] / 255]; };
/** ridgeSilhouette: a flat cut-out (facing +z) whose top edge is a few large authored arcs. */
export function ridgeSilhouette(r, o) {
  const W = o.width, base = o.base ?? -40, n = o.bumps ?? 6, N = 160; const bumps = [];
  for (let i = 0; i < n; i++) bumps.push({ x: -W / 2 + (i + 0.5 + rng(r, -0.3, 0.3)) * W / n, w: rng(r, o.wMin ?? 120, o.wMax ?? 300), h: rng(r, o.hMin ?? 30, o.hMax ?? 90) });
  const f = x => { let y = 0; for (const b of bumps) { const u = Math.abs(x - b.x) / b.w; if (u < 1) y = Math.max(y, b.h * 0.5 * (1 + Math.cos(Math.PI * u))); } return y; };
  const pts = []; for (let i = 0; i <= N; i++) { const x = -W / 2 + W * i / N; pts.push([x, f(x)]); }
  pts.push([W / 2, base]); pts.push([-W / 2, base]);
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath();
  return new THREE.ShapeGeometry(s);
}

/* ───────────────────────────────────────────── canvas textures ─────────────────────────────── */
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

/* ───────────────────────────────────────────── the engine (passes 1–3) ─────────────────────── */
const VERT_QUAD = `out vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FRAG_INK = /* glsl */`
  in vec2 vUv;
  uniform sampler2D tColor, tNormal, tDepth; uniform vec2 uRes; uniform float uNear, uFar, uScale, uTime12, uFogStart, uFogEnd, uFogSteps, uFogCell, uReal, uStage;
  uniform vec3 uInk;
  out vec4 oColor;
  ${GLSL_SCREENS}
  float lin(float d) { return -(uNear * uFar) / ((uFar - uNear) * d - uFar); }
  const vec2 OFFS[8] = vec2[8](vec2(1,0), vec2(-1,0), vec2(0,1), vec2(0,-1), vec2(0.707,0.707), vec2(-0.707,0.707), vec2(0.707,-0.707), vec2(-0.707,-0.707));
  float edgeAt(vec2 uv, float r, float zc, vec3 nc, float creaseT) {
    vec2 px = 1.0 / uRes; float e = 0.0;
    for (int i = 0; i < 8; i++) {
      vec2 o = OFFS[i] * r * px;
      float z = lin(texture(tDepth, uv + o).r);
      if (z - zc > max(${LAW.ink.depthAbs.toFixed(3)}, zc * ${LAW.ink.depthRel.toFixed(3)})) e = 1.0;
      vec3 n = texture(tNormal, uv + o).xyz * 2.0 - 1.0;
      if (1.0 - dot(nc, n) > creaseT) e = 1.0;
    }
    return e;
  }
  void main() {
    vec3 c = texture(tColor, vUv).rgb;
    if (uStage < 3.5) { oColor = vec4(c, 1.0); return; }             // the anatomy of a frame: no ink before stage 4
    vec4 nw = texture(tNormal, vUv); vec3 nc = nw.xyz * 2.0 - 1.0; float w = nw.a;
    float zc = lin(texture(tDepth, vUv).r);
    // line boil: the detection point wobbles by a hair, re-rolled on twos
    vec2 blk = floor(gl_FragCoord.xy / (6.0 * uScale));
    vec2 jit = (vec2(c3dHash(blk + uTime12 * 3.1), c3dHash(blk + 7.7 + uTime12 * 1.7)) - 0.5) * ${LAW.ink.boil.toFixed(2)} * uScale / uRes * (1.0 - uReal);
    vec2 uv = vUv + jit;
    float creaseT = mix(1.25, ${LAW.ink.creaseHero.toFixed(2)}, clamp(w, 0.0, 1.0));
    if (w > 0.5 && w < 0.95) creaseT = ${LAW.ink.creaseWorld.toFixed(2)};
    float thin = 1.0 - 0.4 * uReal;                                   // the dial thins every line
    float line = edgeAt(uv, ${LAW.ink.detail.toFixed(2)} * uScale * thin, zc, nc, creaseT);
    if (w >= 0.6)  line = max(line, edgeAt(uv, ${LAW.ink.world.toFixed(2)} * uScale * thin, zc, nc, creaseT));
    if (w >= 0.95) line = max(line, edgeAt(uv, ${LAW.ink.hero.toFixed(2)} * uScale * thin, zc, nc, creaseT));
    line *= step(0.02, w);
    // lines thin out on the depth ladder, never smoothly
    float q = c3dLadder(zc, uFogStart, uFogEnd, uFogSteps, gl_FragCoord.xy, uFogCell, ${(LAW.dots.fogAngle * Math.PI / 180).toFixed(4)}, uReal);
    line *= 1.0 - q * ${LAW.ink.fade.toFixed(2)};
    // the dial: a little ambient occlusion from the depth buffer (contact shade where surfaces meet)
    if (uReal > 0.001 && zc < uFar * 0.5) {
      float ao = 0.0; float rr = 14.0 * uScale; float a0 = c3dHash(gl_FragCoord.xy) * 6.2832;
      for (int i = 0; i < 8; i++) { float a = a0 + float(i) * 0.7854; float rad = rr * (0.35 + 0.65 * fract(float(i) * 0.618 + a0));
        vec2 o = vec2(cos(a), sin(a)) * rad / uRes; float zs = lin(texture(tDepth, vUv + o).r); float dz = zc - zs;
        ao += clamp((dz - 0.02 * zc) / (0.25 + 0.03 * zc), 0.0, 1.0) * (1.0 - smoothstep(0.6, 1.4, dz)); }
      c *= 1.0 - (ao / 8.0) * 0.5 * uReal;
    }
    c = mix(c, mix(uInk, c * 0.35, uReal), line);                     // the dial: lines a little less black
    oColor = vec4(c, 1.0);
  }
`;
const FRAG_PRINT = /* glsl */`
  in vec2 vUv;
  uniform sampler2D tIn; uniform vec2 uRes, uDriftDir; uniform float uScale, uDrift, uDriftCorner, uGrain, uSpeed, uTime12, uFlash, uSeed, uReduce, uReal, uStage;
  uniform vec3 uInk, uFlashCol, uPaper, uSpeedCol;
  out vec4 oColor;
  ${GLSL_SCREENS}
  void main() {
    if (uStage < 4.5) { oColor = vec4(texture(tIn, vUv).rgb, 1.0); return; }   // the anatomy of a frame: no print before stage 5
    vec2 px = 1.0 / uRes; vec2 cc = vUv - 0.5; float rad = length(cc) * 2.0;
    float amt = (uDrift + uDriftCorner * rad * rad) * uScale * (1.0 - uReal);
    vec2 off = uDriftDir * amt * px;
    float r = texture(tIn, vUv + off).r; float g = texture(tIn, vUv).g; float b = texture(tIn, vUv - off).b;
    vec3 c = vec3(r, g, b);
    if (uSpeed > 0.001 && uReduce < 0.5) {
      vec2 d = (vUv - vec2(0.5, 0.52)) * vec2(uRes.x / uRes.y, 1.0);
      float ang = atan(d.y, d.x); float rr = length(d) / 0.9;
      float lanes = 96.0; float lane = (ang + 3.14159) / 6.28318 * lanes; float li = floor(lane);
      float h1 = c3dHash(vec2(li, floor(uTime12 * 12.0) + uSeed)); float h2 = c3dHash(vec2(li + 7.0, floor(uTime12 * 12.0) * 3.0)); float h3 = c3dHash(vec2(li * 3.0, floor(uTime12 * 12.0)));
      float start = 0.40 + 0.38 * h1; float len = 0.25 + 0.5 * h2; float w = 0.05 + 0.2 * h3;
      float f = abs(fract(lane) - 0.5);
      float taper = smoothstep(start, start + len * 0.45, rr);
      float on = step(start, rr) * step(rr, start + len) * (1.0 - smoothstep(w * 0.5 * taper, w * 0.5 * taper + 0.03, f)) * step(0.35, h1 + h2);
      c = mix(c, uSpeedCol, on * 0.8 * uSpeed);
    }
    float gN = c3dHash(floor(gl_FragCoord.xy / (2.0 * uScale)) + vec2(uSeed));
    c *= 1.0 + (gN - 0.5) * 2.0 * uGrain * (1.0 - uReal);
    c *= uPaper;
    c = mix(c, uFlashCol, uFlash);
    oColor = vec4(c, 1.0);
  }
`;

export class ComicEngine {
  /** o: { canvas, world, paper, flashCol, speedCol, dpr, reduceMotion, preserve } */
  constructor(o) {
    this.world = o.world; this.canvas = o.canvas;
    const R = this.renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!o.preserve });
    R.toneMapping = THREE.NoToneMapping; R.autoClear = true; R.setClearColor(new THREE.Color(o.world.horizonHex), 1);
    this.dpr = o.dpr || Math.min(2, window.devicePixelRatio || 1);
    this.reduce = !!o.reduceMotion;
    const quad = new THREE.BufferGeometry(); quad.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad = quad; this.qcam = new THREE.Camera();
    this.inkMat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false, vertexShader: VERT_QUAD, fragmentShader: FRAG_INK, uniforms: {
      tColor: { value: null }, tNormal: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uNear: { value: 0.5 }, uFar: { value: 1500 },
      uScale: { value: 1 }, uTime12: o.world.u.uTime12, uFogStart: o.world.u.uFogStart, uFogEnd: o.world.u.uFogEnd, uFogSteps: o.world.u.uFogSteps, uFogCell: o.world.u.uFogCell, uInk: o.world.u.uInk, uReal: o.world.u.uReal, uStage: o.world.u.uStage } });
    const a = LAW.drift.angleDeg * Math.PI / 180;
    this.printMat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false, vertexShader: VERT_QUAD, fragmentShader: FRAG_PRINT, uniforms: {
      tIn: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uDriftDir: { value: new THREE.Vector2(Math.cos(a), Math.sin(a)) }, uScale: { value: 1 },
      uDrift: { value: LAW.drift.centre }, uDriftCorner: { value: LAW.drift.corner }, uGrain: { value: LAW.paper.grain }, uSpeed: { value: 0 }, uTime12: o.world.u.uTime12,
      uFlash: { value: 0 }, uSeed: { value: 3.7 }, uReduce: { value: this.reduce ? 1 : 0 }, uInk: o.world.u.uInk, uReal: o.world.u.uReal, uStage: o.world.u.uStage, uFlashCol: { value: col(o.flashCol || '#ffffff') }, uPaper: { value: col(o.paper || '#ffffff') }, uSpeedCol: { value: col(o.speedCol || o.world.inkHex) } } });
    this.inkScene = new THREE.Scene(); this.inkScene.add(new THREE.Mesh(quad, this.inkMat));
    this.printScene = new THREE.Scene(); this.printScene.add(new THREE.Mesh(quad, this.printMat));
    this.rt = null; this.rt2 = null; this.w = 0; this.h = 0;
    this.twos = 1;              // 0 off · 1 ship+fx on twos · 2 everything on twos
    this._lastStep = -1;
  }
  resize(cssW, cssH, dpr) {
    if (dpr) this.dpr = dpr;
    const w = Math.max(2, Math.floor(cssW * this.dpr)), h = Math.max(2, Math.floor(cssH * this.dpr));
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h; this.cssW = cssW; this.cssH = cssH;
    this.renderer.setPixelRatio(1); this.renderer.setSize(w, h, false);
    if (this.rt) { this.rt.dispose(); this.rt2.dispose(); this.depthTex.dispose(); }
    this.depthTex = new THREE.DepthTexture(w, h); this.depthTex.format = THREE.DepthFormat; this.depthTex.type = THREE.UnsignedIntType;
    this.rt = new THREE.WebGLRenderTarget(w, h, { count: 2, depthTexture: this.depthTex, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
    this.rt2 = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, depthBuffer: false });
    const s = this.dpr * (cssH / LAW.refH);
    this.scale = s; this.world.setScale(s);
    this.inkMat.uniforms.uRes.value.set(w, h); this.inkMat.uniforms.uScale.value = s;
    this.printMat.uniforms.uRes.value.set(w, h); this.printMat.uniforms.uScale.value = s;
    this.inkMat.uniforms.tColor.value = this.rt.textures[0]; this.inkMat.uniforms.tNormal.value = this.rt.textures[1]; this.inkMat.uniforms.tDepth.value = this.depthTex;
    this.printMat.uniforms.tIn.value = this.rt2.texture;
  }
  /** render(scene, camera, {boost 0..1, flash 0..1}) */
  render(scene, camera, st) {
    const R = this.renderer; if (!this.rt) return;
    this.inkMat.uniforms.uNear.value = camera.near; this.inkMat.uniforms.uFar.value = camera.far;
    const boost = st && st.boost || 0;
    this.printMat.uniforms.uDrift.value = LAW.drift.centre * (1 + (LAW.drift.boost - 1) * boost);
    this.printMat.uniforms.uSpeed.value = boost;
    this.printMat.uniforms.uFlash.value = st && st.flash || 0;
    R.setRenderTarget(this.rt); R.clear(); R.render(scene, camera);
    R.setRenderTarget(this.rt2); R.render(this.inkScene, this.qcam);
    R.setRenderTarget(null); R.render(this.printScene, this.qcam);
  }
}

/* ───────────────────────────────────────────── time on twos ────────────────────────────────── */
export class SteppedClock {
  constructor() { this.t = 0; this.dt = 0; this.t12 = 0; this.step = -1; this.stepped = false; this._last = null; }
  tick(now) { if (this._last === null) this._last = now; this.dt = Math.min(0.05, (now - this._last) / 1000); this._last = now; this.t += this.dt; this._upd(); return this.dt; }
  fixed(dt) { this.dt = dt; this.t += dt; this._upd(); return dt; }
  _upd() { const f = twosFps(); this.t12 = Math.floor(this.t * f) / f; const s = Math.floor(this.t * f); this.stepped = s !== this.step; this.step = s; }
}

/* ───────────────────────────────────────────── the ship you fly ────────────────────────────── */
export class ShipControl {
  constructor(o) {
    Object.assign(this, { xmin: -11, xmax: 11, ymin: -3.5, ymax: 6.5, homeY: 1.5 }, o);
    this.x = 0; this.y = this.homeY; this.vx = 0; this.vy = 0; this.bank = 0; this.pitch = 0; this.bob = 0;
    this.sBank = 0; this.sPitch = 0; this.sBob = 0; this.boost = 0; this.boostHeld = false; this.manual = false; this.lastInput = -1e9;
    this.keys = {}; this.drag = null; this.autoBoost = o.autoBoost !== false; this.forceBoost = false; this.forceAuto = false;
  }
  attach(el) {
    const down = e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; this.keys[k] = true; this.lastInput = performance.now() / 1000;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault(); };
    const up = e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; this.keys[k] = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    window.addEventListener('blur', () => { this.keys = {}; });
    el.addEventListener('pointerdown', e => { if (e.target !== el) return; el.setPointerCapture && el.setPointerCapture(e.pointerId); this.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY }; this.lastInput = performance.now() / 1000; el.focus && el.focus(); });
    el.addEventListener('pointermove', e => { if (this.drag && e.pointerId === this.drag.id) { this.drag.x = e.clientX; this.drag.y = e.clientY; this.lastInput = performance.now() / 1000; } });
    const end = e => { if (this.drag && e.pointerId === this.drag.id) this.drag = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  update(dt, t, twosOn) {
    const L = LAW.ship; const K = this.keys;
    let ix = (K['ArrowRight'] || K['d'] ? 1 : 0) - (K['ArrowLeft'] || K['a'] ? 1 : 0);
    let iy = (K['ArrowUp'] || K['w'] ? 1 : 0) - (K['ArrowDown'] || K['s'] ? 1 : 0);
    if (this.drag) { const dx = (this.drag.x - this.drag.x0) / 90, dy = -(this.drag.y - this.drag.y0) / 90; ix = clamp(dx, -1, 1); iy = clamp(dy, -1, 1); }
    const held = !!(K['Shift'] || K[' '] || this.boostHeld);
    const now = performance.now() / 1000;
    if (ix || iy || held) this.lastInput = now;
    this.manual = !this.forceAuto && (now - this.lastInput) < L.idleAfter;
    let ax, ay;
    if (this.manual) { ax = ix * L.accel; ay = iy * L.accel; }
    else {
      const xr = (this.xmax - this.xmin) / 2, yr = (this.ymax - this.ymin) / 2, ymid = (this.ymax + this.ymin) / 2;
      const tx = 0.55 * xr * Math.sin(0.37 * t) + 0.25 * xr * Math.sin(0.91 * t + 1.3);
      const ty = ymid + 0.45 * yr * Math.sin(0.61 * t + 0.7);
      ax = clamp((tx - this.x) * 2.2 - this.vx * 0.6, -1, 1) * L.accel; ay = clamp((ty - this.y) * 2.2 - this.vy * 0.6, -1, 1) * L.accel;
    }
    this.vx += ax * dt; this.vy += ay * dt;
    this.vx -= this.vx * Math.min(1, L.drag * dt); this.vy -= this.vy * Math.min(1, L.drag * dt);
    this.vx = clamp(this.vx, -L.vmax, L.vmax); this.vy = clamp(this.vy, -L.vmax, L.vmax);
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.x < this.xmin) { this.x = this.xmin; this.vx = Math.max(0, this.vx); } if (this.x > this.xmax) { this.x = this.xmax; this.vx = Math.min(0, this.vx); }
    if (this.y < this.ymin) { this.y = this.ymin; this.vy = Math.max(0, this.vy); } if (this.y > this.ymax) { this.y = this.ymax; this.vy = Math.min(0, this.vy); }
    const wantBoost = this.forceBoost || (this.manual ? held : (this.autoBoost && (t % 11) > 8.2));
    this.boost += ((wantBoost ? 1 : 0) - this.boost) * Math.min(1, dt * 6);
    this.bank = -this.vx / L.vmax * L.bankDeg * Math.PI / 180; this.pitch = this.vy / L.vmax * L.pitchDeg * Math.PI / 180;
    this.bob = Math.sin(t * 2.1) * 0.08 + Math.sin(t * 3.7) * 0.04;
    if (!twosOn) { this.sBank = this.bank; this.sPitch = this.pitch; this.sBob = this.bob; }
    else { const s = Math.floor(t * twosFps()); if (s !== this._s) { this._s = s; this.sBank = this.bank; this.sPitch = this.pitch; this.sBob = this.bob; } }
  }
}

/* ───────────────────────────────────────────── the drone that follows ──────────────────────── */
export class ChaseCamera {
  constructor(camera, o = {}) {
    this.cam = camera; this.o = Object.assign({}, LAW.camera, o);
    this.pos = new THREE.Vector3(0, this.o.up, this.o.back); this.look = new THREE.Vector3(0, 0, -this.o.ahead); this.roll = 0; this.fov = this.o.fov; this.reduce = !!o.reduceMotion;
    this.init = false;
  }
  turntable(ship, aspect, yaw = 0.9) {
    this.cam.position.set(ship.x + Math.sin(yaw) * 9.5, ship.y + 3.2, Math.cos(yaw) * 9.5); this.cam.up.set(0, 1, 0); this.cam.lookAt(ship.x, ship.y, 0);
    this.cam.fov = aspect < 1 ? this.o.fovPortrait : this.o.fov; this.cam.aspect = aspect; this.cam.updateProjectionMatrix();
  }
  update(dt, t, ship, boost, aspect) {
    const o = this.o; const kP = 1 - Math.exp(-dt * o.lagPos), kL = 1 - Math.exp(-dt * o.lagLook);
    const want = new THREE.Vector3(ship.x * o.lateral, ship.y * 0.85 + o.up, o.back);
    const lookW = new THREE.Vector3(ship.x * 0.9, ship.y * 0.9 - o.lookDrop, -o.ahead);
    if (!this.init) { this.pos.copy(want); this.look.copy(lookW); this.init = true; }
    this.pos.lerp(want, kP); this.look.lerp(lookW, kL);
    const p = this.pos.clone();
    if (!this.reduce) p.add(new THREE.Vector3(Math.sin(t * 0.7) * o.bobAmp, Math.sin(t * 1.1) * o.bobAmp * 0.8, 0));
    this.cam.position.copy(p);
    this.cam.up.set(0, 1, 0);
    this.cam.lookAt(this.look);
    const wantRoll = ship.sBank * o.rollFollow + (this.reduce ? 0 : Math.sin(t * 0.5) * 0.005);
    this.roll += (wantRoll - this.roll) * kP;
    this.cam.rotateZ(this.roll);
    const base = aspect < 1 ? o.fovPortrait : o.fov;
    const wantFov = base + o.fovBoost * boost; this.fov += (wantFov - this.fov) * Math.min(1, dt * 5);
    if (Math.abs(this.cam.fov - this.fov) > 0.01 || this.cam.aspect !== aspect) { this.cam.fov = this.fov; this.cam.aspect = aspect; this.cam.updateProjectionMatrix(); }
  }
}

/* ───────────────────────────────────────────── the page: HUD, panel, lettering ─────────────── */
const HUD_CSS = `
.c3d-root{position:fixed;inset:0;pointer-events:none;font-family:"Comic Neue","Trebuchet MS",Arial,sans-serif;color:var(--c3d-ink);--gut:14px}
.c3d-panel{position:absolute;inset:var(--gut);border:4px solid var(--c3d-ink);pointer-events:none}
.c3d-cap{position:absolute;top:calc(var(--gut) + 8px + env(safe-area-inset-top,0px));left:calc(var(--gut) + 10px);background:var(--c3d-capbg);color:var(--c3d-captext);
  font-weight:700;font-size:15px;line-height:1.15;text-transform:uppercase;letter-spacing:.05em;padding:8px 12px;border:3px solid var(--c3d-ink);box-shadow:5px 5px 0 var(--c3d-ink);transform:rotate(-1.5deg);max-width:min(70vw,420px)}
.c3d-name{position:absolute;left:calc(var(--gut) + 10px);bottom:calc(var(--gut) + 10px + env(safe-area-inset-bottom,0px));background:var(--c3d-paper);border:3px solid var(--c3d-ink);box-shadow:4px 4px 0 var(--c3d-ink);padding:6px 12px 8px;max-width:min(78vw,380px)}
.c3d-name b{display:block;font-family:Bangers,Impact,"Arial Black",sans-serif;font-weight:400;font-size:26px;letter-spacing:.04em;color:var(--c3d-ink);line-height:1}
.c3d-name small{display:block;font-size:12px;line-height:1.3;color:var(--c3d-captext);opacity:.9;margin-top:4px}
.c3d-count{position:absolute;right:calc(var(--gut) + 14px);top:calc(var(--gut) + 6px + env(safe-area-inset-top,0px));text-align:right;font-family:Bangers,Impact,"Arial Black",sans-serif;font-size:40px;line-height:1;color:var(--c3d-accent);
  -webkit-text-stroke:2px var(--c3d-ink);paint-order:stroke fill;text-shadow:4px 4px 0 var(--c3d-ink);letter-spacing:.04em;font-variant-numeric:tabular-nums}
.c3d-count small{display:block;font-family:"Comic Neue","Trebuchet MS",Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;color:var(--c3d-paper);-webkit-text-stroke:0;text-shadow:2px 2px 0 var(--c3d-ink),-1px -1px 0 var(--c3d-ink),1px -1px 0 var(--c3d-ink),-1px 1px 0 var(--c3d-ink);margin-top:6px}
.c3d-sfx{position:absolute;font-family:Bangers,Impact,"Arial Black",sans-serif;font-size:72px;line-height:1;color:var(--c3d-paper);-webkit-text-stroke:3px var(--c3d-ink);paint-order:stroke fill;text-shadow:6px 6px 0 var(--c3d-ink);
  transform:translate(-50%,-50%) rotate(-8deg) scale(0.4);letter-spacing:.03em;white-space:nowrap;animation:c3dpop .6s steps(5,end) forwards}
@keyframes c3dpop{0%{transform:translate(-50%,-50%) rotate(-8deg) scale(.4);opacity:1}40%{transform:translate(-50%,-56%) rotate(-6deg) scale(1.15);opacity:1}100%{transform:translate(-50%,-70%) rotate(-4deg) scale(1.0);opacity:0}}
.c3d-boost{position:absolute;right:calc(var(--gut) + 12px);bottom:calc(var(--gut) + 12px + env(safe-area-inset-bottom,0px));width:112px;height:112px;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;
  background:var(--c3d-capbg);color:var(--c3d-ink);font-family:Bangers,Impact,"Arial Black",sans-serif;font-size:24px;letter-spacing:.06em;border:0;cursor:pointer;
  clip-path:polygon(50% 0%,61% 12%,76% 6%,78% 22%,94% 24%,86% 38%,100% 50%,86% 62%,94% 76%,78% 78%,76% 94%,61% 88%,50% 100%,39% 88%,24% 94%,22% 78%,6% 76%,14% 62%,0% 50%,14% 38%,6% 24%,22% 22%,24% 6%,39% 12%);
  filter:drop-shadow(4px 4px 0 var(--c3d-ink))}
.c3d-boost:active,.c3d-boost.on{background:var(--c3d-accent);color:var(--c3d-paper)}
.c3d-boost:focus-visible{outline:3px solid var(--c3d-accent);outline-offset:2px}
.c3d-msg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:var(--c3d-capbg);border:3px solid var(--c3d-ink);box-shadow:5px 5px 0 var(--c3d-ink);padding:14px 18px;font-weight:700;max-width:min(80vw,420px);text-align:center;color:var(--c3d-captext)}
.c3d-root.hide .c3d-cap,.c3d-root.hide .c3d-name,.c3d-root.hide .c3d-count,.c3d-root.hide .c3d-panel{display:none}
@media (max-width:600px){.c3d-cap{font-size:12px;padding:6px 9px}.c3d-name b{font-size:20px}.c3d-name small{font-size:11px}.c3d-count{font-size:30px}.c3d-sfx{font-size:52px}.c3d-boost{width:92px;height:92px;font-size:20px}}
@media (prefers-reduced-motion:reduce){.c3d-sfx{animation-duration:.01s}}
`;
export function mountHUD(o) {
  if (!document.getElementById('c3d-css')) { const s = document.createElement('style'); s.id = 'c3d-css'; s.textContent = HUD_CSS; document.head.appendChild(s); }
  const root = document.createElement('div'); root.className = 'c3d-root';
  root.style.setProperty('--c3d-ink', o.ink); root.style.setProperty('--c3d-paper', o.paper); root.style.setProperty('--c3d-accent', o.accent);
  root.style.setProperty('--c3d-capbg', o.capBg || '#ffe14a'); root.style.setProperty('--c3d-captext', o.capText || '#1a1a1a');
  root.innerHTML = `<div class="c3d-panel"></div><div class="c3d-cap">${o.caption}</div>
    <div class="c3d-name"><b>${o.name}</b><small>${o.role}</small><small class="c3d-hint">${o.hint}</small></div>
    <div class="c3d-count"><span class="c3d-n">${o.counterLabel} 00</span><small class="c3d-twos">ON TWOS · SHIP + FX</small></div>
    <button class="c3d-boost" type="button" aria-label="Boost (hold)">BOOST</button>`;
  document.body.appendChild(root);
  const nEl = root.querySelector('.c3d-n'), twosEl = root.querySelector('.c3d-twos'), boostBtn = root.querySelector('.c3d-boost');
  const api = {
    root, boostBtn,
    setCounter(n) { nEl.textContent = o.counterLabel + ' ' + String(n).padStart(2, '0'); },
    setTwos(label) { twosEl.textContent = label; },
    hide(h) { root.classList.toggle('hide', h); },
    message(html) { let m = root.querySelector('.c3d-msg'); if (!html) { if (m) m.remove(); return; } if (!m) { m = document.createElement('div'); m.className = 'c3d-msg'; root.appendChild(m); } m.innerHTML = html; },
    sfx(text, x, y) { const e = document.createElement('div'); e.className = 'c3d-sfx'; e.textContent = text; e.style.left = x + 'px'; e.style.top = y + 'px'; root.appendChild(e); setTimeout(() => e.remove(), 700); },
  };
  return api;
}
export const TWOS_LABELS = ['ON ONES · ALL SMOOTH', 'ON TWOS · SHIP + FX', 'ON TWOS · EVERYTHING'];

/* ───────────────────────────────────────────── shot mode (headless proof) ──────────────────── */
export function parseQuery() {
  const q = {}; for (const [k, v] of new URLSearchParams(location.search)) q[k] = v;
  if (q.real != null && !isNaN(parseFloat(q.real))) LAW.real = Math.max(0, Math.min(1, parseFloat(q.real)));   // ?real=0..1 turns the dial for this page
  const stage = q.stage != null && !isNaN(parseInt(q.stage, 10)) ? Math.max(0, Math.min(9, parseInt(q.stage, 10))) : 9;   // ?stage=0..5: the anatomy of a frame
  STAGE = stage;                  // every ComicWorld built after this starts at that stage (hulls collapse below 4 by themselves)
  return { shot: q.shot === '1', real: LAW.real, stage, t: parseFloat(q.t || '12'), seed: parseInt(q.seed || '7', 10), boost: q.boost === '1', hud: q.hud !== '0', twos: q.twos == null ? null : parseInt(q.twos, 10), dpr: q.dpr ? parseFloat(q.dpr) : null,
    turn: q.turn === '1', solo: q.solo === '1' };
}
export function installErrorTitle(renderer, onError) {
  const bad = m => { document.title = ('ERR ' + m).slice(0, 180); if (onError) onError(String(m)); };
  window.addEventListener('error', e => bad(e.message)); window.addEventListener('unhandledrejection', e => bad(String(e.reason)));
  if (renderer) renderer.debug.onShaderError = (gl, prog, vs, fs) => { bad('shader: ' + (gl.getShaderInfoLog(fs) || gl.getShaderInfoLog(vs) || gl.getProgramInfoLog(prog)).slice(0, 160)); };
}
export { THREE };
