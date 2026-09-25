/* game/world.js — THE HOUSE in one scene: the four rooms from the kit's builder, the game's pieces beside them, the sky, the cutaway,
 * the static merge (a phone's draw calls) and the room culling · design pass 4 §3.7, §3.9
 *
 *   const W = buildWorld(world, { hullMat, seed }) → { scene, rooms, extras, kits, textures, mats, hullMat, tick(t, t12, stepped), cull(camZ), stats }
 * The kit's buildScene gets each scene without the kinds it does not know (and without the pool, which the game draws); nothing in kit/ changes.
 */
import { THREE, HullMaterial, skyDome, inkAll, mulberry32 } from '../kit/comic3d.js';
import { buildScene, makeTextures, makeMats } from '../kit/interior.js';
import { PIECE } from '../kit/parts.js';
import { LEVEL } from '../level/house.js';
import { EXTRA, KIT_DYNAMIC } from './pieces.js';

/** the scene as the kit can build it: the kinds it knows, the pool left out (the game draws it) */
function kitScene(sc) {
  return Object.assign({}, sc, { props: sc.props.filter(p => PIECE[p.kind] && !p.picture), floors: sc.floors.filter(f => f.id !== 'pool') });
}
/* ── the static merge: every mesh that never moves and is not tied to a wall or a ceiling, merged with the others of its material ── */
const matIds = new WeakMap(); let matN = 0;
function matKey(m) {
  if (m instanceof HullMaterial) return 'h|' + m.uniforms.uHullMul.value.toFixed(3) + '|' + m.uniforms.uFog.value + '|' + m.uniforms.uFadeMul.value + '|' + m.uniforms.uInkCol.value.getHexString();
  if (!matIds.has(m)) matIds.set(m, 'm' + (matN++)); return matIds.get(m);
}
function mergeItems(items) {
  const names = ['position', 'normal', 'uv', 'color', 'aSwell'].filter(n => items.every(it => it.geometry.attributes[n]));
  const out = {}; for (const n of names) out[n] = [];
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const it of items) {
    const g = it.geometry.index ? it.geometry.toNonIndexed() : it.geometry; nm.getNormalMatrix(it.matrix);
    for (const n of names) { const a = g.attributes[n], size = a.itemSize;
      for (let i = 0; i < a.count; i++) {
        if (n === 'position') { v.fromBufferAttribute(a, i).applyMatrix4(it.matrix); out[n].push(v.x, v.y, v.z); }
        else if (n === 'normal') { v.fromBufferAttribute(a, i).applyMatrix3(nm).normalize(); out[n].push(v.x, v.y, v.z); }
        else for (let k = 0; k < size; k++) out[n].push(a.array[i * size + k]);
      } }
    if (g !== it.geometry) g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  for (const n of names) geo.setAttribute(n, new THREE.Float32BufferAttribute(out[n], n === 'position' || n === 'normal' || n === 'color' ? 3 : n === 'uv' ? 2 : 1));
  geo.computeBoundingSphere(); return geo;
}
function mergeStatic(room) {
  const props = room.children.find(c => c.name === 'props'); if (!props) return { before: 0, after: 0 };
  room.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(room.matrixWorld).invert();
  const buckets = new Map(), removed = []; let before = 0;
  for (const piece of props.children.slice()) {
    let meshes = 0, ok = !(piece.userData.dynamic || piece.userData.wall || piece.userData.ceilY || KIT_DYNAMIC.has(piece.name));
    piece.traverse(o => { if (o.isInstancedMesh) ok = false; if (o.isMesh) meshes++; });
    if (!ok) continue; before += meshes;
    piece.traverse(o => { if (!o.isMesh || !o.visible) return; const key = matKey(o.material);
      let b = buckets.get(key); if (!b) { b = { material: o.material, items: [] }; buckets.set(key, b); }
      b.items.push({ geometry: o.geometry, matrix: new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld) }); });
    props.remove(piece); removed.push(piece);
  }
  let after = 0;
  for (const b of buckets.values()) { const geo = mergeItems(b.items); const mesh = new THREE.Mesh(geo, b.material); mesh.name = 'merged'; mesh.userData.noInk = true; mesh.userData.isHull = b.material instanceof HullMaterial; mesh.userData.merged = true; props.add(mesh); after++; }
  for (const p of removed) p.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
  return { before, after };
}

export function buildWorld(world, o = {}) {
  const scene = new THREE.Scene();
  const yardLook = LEVEL.scenes.find(s => s.key === 'backyard').look;
  scene.add(skyDome(world, { bands: yardLook.sky, edges: yardLook.skyEdges, bandW: 0.03 }));
  const textures = makeTextures(), mats = makeMats(world, textures), hullMat = o.hullMat || new HullMaterial({ world });
  const rooms = {}, extras = {}, kits = {}, dyn = []; const stats = { merged: {}, meshes: 0 };
  for (const sc of LEVEL.scenes) {
    const r = mulberry32((o.seed ?? 7) * 101 + sc.n + 40);
    const g = buildScene(world, kitScene(sc), { hullMat, textures, mats, seed: o.seed, sky: false, exterior: sc.key !== 'pilates' });
    g.position.z = LEVEL.place[sc.key]; rooms[sc.key] = g; scene.add(g); const K = g.userData.kit; kits[sc.key] = K;
    const props = g.children.find(c => c.name === 'props');
    const place = (piece, x, y, z, ry = 0) => { piece.position.set(x, y, z); piece.rotation.y = ry; inkAll(piece, hullMat, 500 + sc.n * 50 + props.children.length); props.add(piece); dyn.push(piece); return piece; };
    for (const p of sc.props) {
      if (p.kind === 'smoke') { extras[p.id] = place(EXTRA.ovenSmoke(K, p, r), p.x, p.y, p.z); continue; }
      const make = EXTRA[p.kind]; if (!make) continue;
      extras[p.id] = place(make(K, p, r), p.x, p.y ?? 0, p.z, p.ry || 0);
    }
    if (sc.key === 'kitchen') { const range = sc.props.find(p => p.id === 'range'); extras['oven door'] = place(EXTRA.ovenDoor(K, range), range.x, 0, range.z); }
    if (sc.key === 'backyard') { const pool = sc.floors.find(f => f.id === 'pool'); extras.pool = place(EXTRA.pool(K, pool, r), 0, 0, 0); }
    if (!o.noMerge) stats.merged[sc.key] = mergeStatic(g);
    g.userData.zRange = [LEVEL.place[sc.key] + Math.min(...sc.floors.map(f => f.z[0])), LEVEL.place[sc.key] + Math.max(...sc.floors.map(f => f.z[1]))];
  }
  scene.traverse(o2 => { if (o2.isMesh) stats.meshes++; });
  const roomList = Object.values(rooms);
  return {
    scene, rooms, extras, kits, textures, mats, hullMat, stats,
    /** the rooms' own motion on twos (the kit's) and the game's pieces */
    tick(t, t12, stepped, f) { for (const g of roomList) g.userData.update(t, t12, stepped); if (stepped) for (const d of dyn) if (d.userData.tick) d.userData.tick(f, t12); },
    /** the cutaway: the walls between the camera and the room vanish (the kit's rule) */
    cutaway(camPos) { for (const g of roomList) g.userData.cutaway(camPos.clone().sub(g.position)); },
    /** a room's props are drawn only within 3 m behind and 30 m ahead of the camera (the run flies toward −z) */
    cull(camZ, on = true) { for (const g of roomList) { const props = g.children.find(c => c.name === 'props'); if (!props) continue; const [z0, z1] = g.userData.zRange; props.visible = !on || (z0 < camZ + 3 && z1 > camZ - 30); } },
  };
}
