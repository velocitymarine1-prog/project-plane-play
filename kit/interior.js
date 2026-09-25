/* interior.js — assembles THE HOUSE scenes from kit/house-spec.js out of THE PARTS (kit/parts.js) · 23 September 2026
 * pass 2 (the fun-house print), rebuilt on the parts library 24 September (jumpr t36, the style book)
 *
 * buildScene(world, scene, { hullMat, seed, textures, mats, sky, exterior }) → THREE.Group with
 *   userData.update(t, t12, stepped)   the one thing that moves on twos (+ clouds on ones)
 *   userData.cutaway(cameraPosition)    hides walls between the camera and the room, ceilings below it
 *
 * Every floor, wall, opening and prop is a piece of the parts library, built from the thirteen shapes under the shape law
 * (the facet ladder, hard and soft, the thickness floor, materials by role). This file only places them: the house's
 * palette fills the parts' colour slots, a prop rests at the height the scene gives it (or the kind's REST: counters,
 * walls, ceilings), landmarks ink heavier, and the exteriors seen through the doors are dressed here.
 */
import { THREE, ComicMaterial, HullMaterial, inkAll, skyDome, ridgeSilhouette, mulberry32, rng, mix } from './comic3d.js';
import { HOUSE, DERIVED, ENV } from './house-spec.js';
import { REST, LANDMARK_MUL } from './parts-spec.js';
import { makeKit, makeTextures as kitTextures, makeMats as kitMats, PIECE, floorMesh, ceilingMesh, wallGroup, windDashes, shrubG, cloudOutline, cutout, ring } from './parts.js';

/** the house's fill of the palette contract: HOUSE (the three sets and the spot hues) + DERIVED (counter, bark, mulch, glass, pond, sky) */
export const HOUSE_PALETTE = Object.assign({}, HOUSE, DERIVED);
function makeTextures() { return kitTextures(HOUSE_PALETTE); }
function makeMats(world, T) { return kitMats(world, T, HOUSE_PALETTE); }

/* ───────────────────────── exteriors seen through doors and sliders (the house's own dressing) ───────────────────────── */
function exterior(kind, K, r, g, look, world) {
  const M = K.M, anim = {};
  if (kind === 'front') { for (const x of [-3.2, 3.2]) { const s = shrubG(M, r, 1.2); s.position.set(x, 0, 4.7); g.add(s); } }
  if (kind === 'lanai') {
    const hedge = PIECE.hedge(K, { w: 16, count: 9 }, r); hedge.position.set(0, -0.1, -7.2); g.add(hedge);
    const oak = PIECE.oak(K, {}, r); oak.position.set(4.5, -0.1, -17); g.add(oak);
    const fence = PIECE.fence(K, { w: 60, gateAt: 0, gateW: 1.2 }); fence.position.set(0, -0.3, -28); g.add(fence);
  }
  if (kind === 'yard') {
    const rip = []; for (let i = 0; i < 6; i++) { const R0 = rng(r, 1.2, 3.2), arc = rng(r, 0.8, 1.6); const t = ring(R0, 0.05, M.ripple, rng(r, -18, 16), -0.83, rng(r, -11.2, -9.2), { rx: -Math.PI / 2, noInk: true, arc }); g.add(t); rip.push(t); } anim.ripples = rip;
    const far = ridgeSilhouette(r, { width: 520, base: -30, bumps: 70, wMin: 5, wMax: 11, hMin: 4, hMax: 8 });
    const t1 = new THREE.Mesh(far, new ComicMaterial({ world, unlit: true, color: mix(HOUSE.hedge, look.horizon, 0.45), inkWeight: 0, fog: false })); t1.position.set(0, -0.5, -90); t1.userData.noInk = true; t1.name = 'treeline'; g.add(t1);
    const far2 = ridgeSilhouette(mulberry32(77), { width: 700, base: -30, bumps: 60, wMin: 8, wMax: 16, hMin: 3, hMax: 6 });
    const t2 = new THREE.Mesh(far2, new ComicMaterial({ world, unlit: true, color: mix(HOUSE.hedge, look.horizon, 0.7), inkWeight: 0, fog: false })); t2.position.set(0, -0.5, -150); t2.userData.noInk = true; t2.name = 'treeline2'; g.add(t2);
  }
  if (kind) {                                                   // cut-paper clouds, drifting on ones
    const clouds = new THREE.Group(); for (let i = 0; i < 9; i++) { const c = cutout(cloudOutline(r), 0.8, M.cloud, rng(r, -150, 150), rng(r, 26, 48), rng(r, -190, -90)); c.scale.setScalar(rng(r, 0.8, 1.4)); clouds.add(c); } g.add(clouds); anim.clouds = clouds;
  }
  return anim;
}

/* ───────────────────────── a whole scene ───────────────────────── */
export function buildScene(world, sc, o = {}) {
  const T = o.textures || makeTextures(); const M = o.mats || makeMats(world, T); const K = makeKit(world, { palette: HOUSE_PALETTE, textures: T, mats: M });
  const r = mulberry32((o.seed ?? 7) * 101 + sc.n);
  const g = new THREE.Group(); g.name = 'scene-' + sc.key;
  if (o.sky !== false) g.add(skyDome(world, { bands: sc.look.sky, edges: sc.look.skyEdges, bandW: 0.03 }));
  const arch = new THREE.Group(); arch.name = 'architecture'; g.add(arch);
  for (const f of sc.floors) arch.add(floorMesh(K, f));
  const ceilings = sc.ceilings.map(c => ceilingMesh(K, c)); ceilings.forEach(c => arch.add(c));
  const walls = sc.walls.map(w => wallGroup(K, w)); walls.forEach(w => arch.add(w));
  const props = new THREE.Group(); props.name = 'props'; g.add(props); const by = {}; const winds = [];
  for (const p of sc.props) {
    const make = PIECE[p.kind]; if (!make) continue; const k = make(K, p, r); k.name = p.id;
    k.position.set(p.x, p.y ?? REST[p.kind] ?? 0, p.z);         // a piece is built at its origin; it rests where the scene (or its kind) says
    let ry = p.ry || 0; if (p.kind === 'door' || p.kind === 'stormDoor') { const sign = p.hinge === 'L' ? -(p.into || 1) : (p.into || 1); ry += (p.open || 0) * Math.PI / 180 * sign; if (p.onWall === 'right') { ry += Math.PI / 2; k.position.x -= 0.07; } }
    k.rotation.y = ry; k.userData.baseRy = ry;
    if (p.landmark) k.traverse(m => { if (m.isMesh && m.material.uniforms && m.material.uniforms.uInkWeight && m.material.uniforms.uInkWeight.value >= ENV.ink.furniture) m.userData.inkMul = (m.userData.inkMul || 1) * LANDMARK_MUL; });
    if (p.onWall) k.userData.wall = walls.find(w => w.name === 'wall-' + p.onWall);
    if (p.kind === 'flushLight') k.userData.ceilY = p.y;
    props.add(k); by[p.id] = k;
    if (p.boost) { const wd = windDashes(K, p.boost, r, p.id); g.add(wd); winds.push(wd); }
  }
  const anim = o.exterior === false ? {} : exterior(sc.exterior, K, r, g, sc.look, world);
  const hullMat = o.hullMat || new HullMaterial({ world });
  inkAll(props, hullMat, 400 + sc.n * 50); for (const w of walls) inkAll(w, hullMat, 900 + sc.n * 50);
  for (const c of g.children) if (c !== props && c !== arch && c.isGroup && !c.name.startsWith('wind-')) inkAll(c, hullMat, 1300 + sc.n * 50);

  g.userData = {
    key: sc.key, walls, ceilings, props: by, mats: M, textures: T, kit: K,
    cutaway(cam) {
      for (const w of walls) { const { a, n } = w.userData.cut; w.visible = (cam.x - a[0]) * n[0] + (cam.z - a[1]) * n[1] > -0.05; }
      for (const c of ceilings) c.visible = cam.y < c.userData.ceilY;
      for (const k of props.children) { if (k.userData.wall) k.visible = k.userData.wall.visible; if (k.userData.ceilY) k.visible = cam.y < k.userData.ceilY; }
    },
    update(t, t12, stepped) {
      if (anim.clouds) anim.clouds.position.x = (t * 1.2) % 60;
      if (!stepped) return;
      const f = Math.floor(t12 * 12);
      if (by['storm door']) by['storm door'].rotation.y = by['storm door'].userData.baseRy + Math.sin(t12 * 1.7) * 0.05;
      if (by.kettle) by.kettle.userData.puffs.forEach((p, i) => { const k = (f + i) % 4; p.scale.setScalar(0.7 + k * 0.18); p.position.y = 0.24 + ((i + f * 0.25) % 4) * 0.1; });
      if (by['drum fan']) by['drum fan'].userData.blades.rotation.z = f * 1.1;
      for (const wd of winds) wd.userData.tick(f);
      if (by.sprinkler) by.sprinkler.userData.head.rotation.z = Math.sin(t12 * 2.2) * 0.35;
      if (by.palms) by.palms.userData.crowns.forEach((c, i) => { c.rotation.z = Math.sin(t12 * 1.3 + i) * 0.05; c.rotation.x = Math.cos(t12 * 1.1 + i * 2) * 0.04; });
      if (anim.ripples) anim.ripples.forEach((rp, i) => rp.scale.setScalar(1 + ((f + i * 3) % 6) * 0.06));
      if (by.cardinal) by.cardinal.userData.head.rotation.y = ((f >> 3) % 3 - 1) * 0.5;
    },
  };
  return g;
}
export { makeTextures, makeMats };
