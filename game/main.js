/* game/main.js — PROJECT PLANE, level 1: THE HOUSE IN ONE · the page: the loop, the throw, the flight's playback, the pay, the cards,
 * the cameras, the lettering, pause, the proofs · design pass 4 (25 September 2026), built from design passes 1–3
 *
 * States: BOOT → START LINE (the aim view, the cards) → AIM (the drag) → FLIGHT (the precomputed path played at the tempo) → END (the
 * lettering, the pay panel) → START LINE, or FINISH (THE HOUSE IN ONE!) → START LINE. PAUSE is an overlay.
 * Query flags: ?shot=1&t=N (a proof frame: fixed steps, then the title SHOT-READY) · ?launch=x,yaw,loft,v (throw a line on load) ·
 * ?card=A,P&cash=N (a card for proofs; not saved) · ?screen=aim|pay|finish|pause (stage a screen) · ?tempo=1 · ?dpr= · ?merge=0 · ?hud=0 · ?seed=
 */
import { THREE, ComicWorld, ComicMaterial, HullMaterial, ComicEngine, SteppedClock, mountHUD, TWOS_LABELS, parseQuery, installErrorTitle, inkAll, col, mix } from '../kit/comic3d.js';
import { buildPaperPlane } from '../kit/paper-plane.js';
import { LEVEL, HOUSE } from '../level/house.js';
import { stage, simulate, progressOf, toastAt, bonkLetters, endLetters } from './glide.js';
import { attach as attachGesture, readPull } from './gesture.js';
import { load, save, reset, status as saveStatus } from './save.js';
import { settle, cards, buy, cardNow, PLANE } from './economy.js';
import { buildWorld } from './world.js';
import { EXTRA } from './pieces.js';
import { applyPrint } from './prints.js';
import { mountGameHUD } from './hud.js';

/* ───────────── the page's flags ───────────── */
const Q = parseQuery(), QS = new URLSearchParams(location.search);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, coarse = matchMedia('(pointer: coarse)').matches;
const TEMPO = QS.has('tempo') ? Math.max(0.2, +QS.get('tempo') || 1) : LEVEL.tempo;
const NOSAVE = QS.has('card') || QS.has('cash') || Q.shot;
const G = LEVEL.gauge, ST = stage(), look0 = LEVEL.scenes[0].look;

/* ───────────── the world, the engine, the lettering ───────────── */
const world = new ComicWorld(Object.assign({ name: 'plane' }, look0));
const canvas = document.getElementById('c');
const kitHud = mountHUD({ ink: HOUSE.ink, paper: HOUSE.stock, accent: HOUSE.magenta, capBg: HOUSE.yellow, capText: HOUSE.ink, caption: LEVEL.caption, name: LEVEL.room, role: '', hint: '', counterLabel: 'THROW' });   // pass 6: the kit's caption, name card and counter stay hidden; the page keeps one slot
kitHud.boostBtn.hidden = true;
const hud = mountGameHUD(kitHud);
const dprMax = Q.dpr || Math.min(coarse ? 1.5 : 2, devicePixelRatio || 1); let dpr = dprMax;
let engine;
try { engine = new ComicEngine({ canvas, world, paper: look0.paper, flashCol: '#fff6c8', dpr, reduceMotion: reduce, preserve: Q.shot }); }
catch (e) { kitHud.message('This page needs WebGL 2 to draw the comic. ' + e.message); document.title = 'ERR ' + e.message; throw e; }
installErrorTitle(engine.renderer, m => kitHud.message('Render error: ' + m)); engine.renderer.info.autoReset = false;
try { await Promise.race([Promise.all([document.fonts.load('100px Bangers'), document.fonts.load('700 15px "Comic Neue"')]), new Promise(r => setTimeout(r, 3000))]); } catch (e) { /* the fallback stack */ }

const camera = new THREE.PerspectiveCamera(LEVEL.cameras.aim.fov, 1, 0.05, 900);
const hullMat = new HullMaterial({ world }), hullNoFog = new HullMaterial({ world, fog: false });
const W = buildWorld(world, { hullMat, seed: Q.seed, noMerge: QS.get('merge') === '0' });
const scene = W.scene;
const plane = buildPaperPlane(world, { hullMat: hullNoFog.withMul(0.45), seed: 21 }); plane.scale.setScalar(LEVEL.plane.scale); scene.add(plane);
const K0 = W.kits.foyer, KK = W.kits.kitchen;
const hand = EXTRA.hand(K0); inkAll(hand, hullNoFog.withMul(0.7), 61); scene.add(hand);
const fan = EXTRA.loftFan(K0, G.lofts); scene.add(fan);
const marks = EXTRA.bonkMarks(K0); inkAll(marks, hullMat, 62); scene.add(marks);
const slices = [0, 1].map(i => { const t = EXTRA.toast(KK); inkAll(t, hullMat, 63 + i); t.visible = false; scene.add(t); return t; });
const crumbs = EXTRA.puffBurst(K0, { color: mix(HOUSE.yellow, HOUSE.ink, 0.35), n: 9, r: 0.022, gravity: 4, life: 0.6, seed: 31 }); scene.add(crumbs);
const drips = EXTRA.puffBurst(K0, { color: mix(HOUSE.cyan, HOUSE.stock, 0.4), n: 12, r: 0.028, gravity: 6, life: 0.55, seed: 32 }); scene.add(drips);
const soot = EXTRA.puffBurst(K0, { n: 18, r: 0.026, gravity: -0.5, life: 0.8, grow: 1.2, seed: 33, soot: true }); scene.add(soot);
const fxPieces = [hand, fan, marks, ...slices, crumbs, drips, soot];
let pennant = null;
function placePennant(best) {
  if (!best) { if (pennant) pennant.visible = false; return; } const text = best.d.toFixed(1) + ' m';
  if (!pennant) { pennant = EXTRA.pennant(K0, text); inkAll(pennant, hullMat, 66); scene.add(pennant); fxPieces.push(pennant); } else pennant.userData.setText(text);
  pennant.visible = true; pennant.position.set(Math.max(-3, Math.min(3, best.x)), 0, Math.max(LEVEL.finish.z, Math.min(LEVEL.launch.z - 0.3, best.z)));
}
/* the ghost of the last throw and the preview of the next, as instanced ink dashes */
const dashGeo = new THREE.BoxGeometry(0.014, 0.014, 0.11);
function dashLine(color, n) { const im = new THREE.InstancedMesh(dashGeo, new ComicMaterial({ world, unlit: true, color, inkWeight: 0, fog: false }), n); im.count = 0; im.userData.noInk = true; im.frustumCulled = false; scene.add(im); return im; }
const ghost = dashLine(mix(HOUSE.ink, HOUSE.stock, 0.55), 400), preview = dashLine(HOUSE.magenta, 40);
const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(1, 1, 1), Z1 = new THREE.Vector3(0, 0, 1);
function drawDashes(im, path, every = 4, limit = Infinity) {
  let n = 0; for (let i = every; i < path.length && i < limit && n < im.instanceMatrix.count; i += every) { const a = path[i - every], b = path[i]; tmpV.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = tmpV.length() || 1e-6; tmpV.divideScalar(L);
    tmpQ.setFromUnitVectors(Z1, tmpV); tmpS.set(1, 1, Math.max(0.3, L / 0.11 * 0.6)); tmpM.compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), tmpQ, tmpS); im.setMatrixAt(n++, tmpM); }
  im.count = n; im.instanceMatrix.needsUpdate = true;
}
function applyLook(L) {
  const u = world.u, v3 = a => new THREE.Vector3().fromArray(a).normalize();
  u.uLightDir.value.copy(v3(L.lightDir)); u.uLightCol.value.set(L.lightCol); u.uShadowTint.value.set(L.shadowTint); u.uFillDir.value.copy(v3(L.fillDir)); u.uFillCol.value.set(L.fillCol);
  u.uRimCol.value.set(L.rimCol); u.uHorizon.value.set(L.horizon); u.uFogStart.value = L.fogStart; u.uFogEnd.value = L.fogEnd; u.uFogMax.value = L.fogMax;
  engine.renderer.setClearColor(col(L.horizon), 1); engine.printMat.uniforms.uPaper.value.set(L.paper);
}

/* ───────────── the player and the state ───────────── */
const P = load();
if (QS.has('card')) { const [a, p] = QS.get('card').split(',').map(Number); P.arm = Math.max(1, a || 1); P.plane = Math.max(1, p || 1); }
if (QS.has('cash')) P.cash = Math.max(0, +QS.get('cash') || 0);
let twos = Q.twos == null ? (P.twos ?? 1) : Q.twos; engine.twos = twos; kitHud.setTwos(TWOS_LABELS[twos]);
let hidden = !Q.hud, flash = 0, paused = false, handT = -9, squashT = -9, slicesLanded = [false, false];
const DEBUG = QS.get('debug') === '1';
const S = { mode: 'boot', x: 0.2, yaw: 0, loftI: 2, speed: 5.5, locked: false, pullBack: 0, dragging: false, run: null, tp: 0, fired: 0, reached: 0, crossed: 0, endT: 0, endPhase: 0, endInfo: null, pay: null,
  fwd: new THREE.Vector3(0, 0, -1), bank: 0, sBank: 0, tumble: 0, throws: P.runs, lastThrow: null, sootUntil: -1, dripsUntil: -1 };
const stats = { avgMs: 0 };
applyPrint(plane, PLANE.print(P.plane)[2]); placePennant(P.best); hud.cash(P.cash);
if (saveStatus.note) { const n = document.getElementById('storageNote'); n.textContent = saveStatus.note; n.hidden = false; }

/* ───────────── the plane on the hand, the gauge, the readout ───────────── */
const handPoint = () => new THREE.Vector3(S.x, LEVEL.launch.y, LEVEL.launch.z);
const aimDir = (yawDeg, loftDeg) => { const y = yawDeg * Math.PI / 180, p = loftDeg * Math.PI / 180; return new THREE.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)); };
function poseOnHand() {
  const h = handPoint(), d = aimDir(S.yaw, G.lofts[S.loftI]);
  plane.position.copy(h).add(new THREE.Vector3(0, -0.02 * Math.min(1, S.pullBack), 0.3 * Math.min(1, S.pullBack))); plane.lookAt(plane.position.clone().sub(d)); plane.rotation.z = 0;
  hand.position.copy(plane.position); hand.rotation.y = -S.yaw * Math.PI / 180;
  fan.position.copy(handPoint()); fan.rotation.y = -S.yaw * Math.PI / 180; fan.userData.set(S.loftI);
}
const cap = () => cardNow(P).cap;
function refreshGauge() { const c = cap(); S.speed = Math.min(S.speed, c); }
function refreshReadout() { if (DEBUG) console.log(`yaw ${S.yaw.toFixed(0)}° · loft ${G.lofts[S.loftI]}° · ${S.speed.toFixed(2)} m/s · x ${S.x.toFixed(2)}${S.locked ? ' · LOCKED' : ''}`); }
function previewDots() {
  if (S.mode !== 'aim' && S.mode !== 'start') { preview.count = 0; preview.instanceMatrix.needsUpdate = true; return; }
  const c = cardNow(P); const r = simulate(ST, { x: S.x, yaw: S.yaw, loft: G.lofts[S.loftI], power: (S.speed - G.min) / (c.cap - G.min) }, c);
  drawDashes(preview, r.path, 4, 26);
}

/* ───────────── the throw and the flight ───────────── */
function throwPlane(L) {
  const card = cardNow(P); const r = simulate(ST, L, card); S.run = r; S.lastThrow = L; S.tp = 0; S.fired = 0; S.reached = 0; S.crossed = 0; S.mode = 'flight'; S.throws++; S.sootUntil = -1; S.dripsUntil = -1; S.tumble = 0;
  hud.showCards(false); hud.hint(false); hud.panel(null); S.speed = G.min + (card.cap - G.min) * L.power; refreshReadout(); hud.metres(0);
  const p = planeScreen(); sfx('THWIP!', p.x - 30, p.y - 80, 3);
  hand.userData.set(1); handT = clock.t; fan.visible = false; preview.count = 0; preview.instanceMatrix.needsUpdate = true;
  for (const s of slices) s.visible = false; slicesLanded = [false, false]; if (W.extras.toaster) W.extras.toaster.userData.arm(false);
  S.fwd.copy(aimDir(L.yaw, L.loft)); drone.init = false; marks.visible = false;
}
function fireEvent(e) {
  const p = planeScreen(); const at = (text, step, dy = -80) => sfx(text, p.x + 30, p.y + dy, step);
  switch (e.kind) {
    case 'wind': at(e.wind === 'lift' ? 'PSSST' : e.wind === 'smoke' ? 'FWOOSH' : 'WHOOSH', 3); if (e.wind === 'smoke') S.sootUntil = e.t + 2; break;
    case 'pop': { const T = W.extras.toaster; if (T) T.userData.pop(clock.t12); const sp = toScreen(new THREE.Vector3(LEVEL.toast.x, LEVEL.toast.y + 0.25, LEVEL.toast.z)); sfx('TING!', sp.x - 20, sp.y - 20, 1); if (!Q.shot) setTimeout(() => sfx('POP!', sp.x + 16, sp.y - 70, 3), 130); break; }
    case 'crumb': at('CRUMB!', 2); crumbs.userData.burst(plane.position.clone(), clock.t12, 5, 0.6); break;
    case 'scrape': at(e.kind2 === 'hedge' ? 'RUSTLE' : e.kind2 === 'screenCage' ? 'FLOP' : 'SCRAPE!', 2); break;
    case 'soggy': at('SOGGY!', 2); drips.userData.burst(plane.position.clone(), clock.t12, 6, 0.8); S.dripsUntil = e.t + 2; break;
    case 'bonk': { const { text, step } = bonkLetters(e.sn); at(text, step); const n = new THREE.Vector3(...e.n); marks.userData.show(new THREE.Vector3(e.x, e.y, e.z).addScaledVector(n, -0.08), n, e.ceiling, clock.t12); drone.kick.addScaledVector(n, 0.12); if (step >= 5) S.tumble = 3; squashT = clock.t12; break; }
    case 'boing': at('BOING!', 3); if (W.extras.trampoline) W.extras.trampoline.userData.boing(clock.t12); break;
  }
}
function cutTo(i) {
  const cp = LEVEL.checkpoints[i]; const next = LEVEL.scenes.find(s => s.key === (cp.key === 'pond' ? 'backyard' : LEVEL.scenes[LEVEL.scenes.findIndex(s2 => s2.key === cp.key) + 1].key));
  if (next && next.look) applyLook(next.look); const p = planeScreen(); sfx(cp.letter, p.x + 40, p.y - 130, 4);
  if (i === 0 && W.extras.toaster) W.extras.toaster.userData.arm(true);   // the toaster hears you coming: its slots glow after the hall
}
function endFlight() {
  const r = S.run, { msg, what } = endLetters(r); const p = planeScreen(); sfx(msg, p.x + 40, p.y - 70, r.result === 'gate' ? 5 : r.result === 'crumple' ? 4 : 3);
  if (r.result === 'gate') flash = 0.35; drawDashes(ghost, r.path, 5); S.mode = 'end'; S.endT = 0; S.endPhase = 0; S.endInfo = { msg, what };
}
function payOut() {
  const r = S.run, d = r.result === 'gate' ? LEVEL.length : progressOf(ST, r.path), fin = r.result === 'gate', last = r.path[r.path.length - 1];
  const pay = settle(P, d, fin, last); if (!NOSAVE) save(P); hud.cash(P.cash); S.pay = pay;
  const lines = [`<b>${d.toFixed(1)} m · ${S.endInfo.msg}</b>`, `<span class="line">+$${pay.perThrow} for the throw · +$${pay.metres} for the metres${pay.mult > 1 ? ` · ×${pay.mult.toFixed(1)}` : ''}</span>`];
  for (const f of pay.firsts) lines.push(`<span class="line first">${f.text}</span>`);
  if (pay.finishBonus) lines.push(`<span class="line first">THE HOUSE IN ONE: +$${pay.finishBonus}</span>`);
  if (pay.record && d > 0) { lines.push(`<span class="line rec">NEW RECORD!</span>`); placePennant(P.best); if (pennant) pennant.userData.hop(clock.t12); const p = planeScreen(); sfx('NEW RECORD!', p.x, p.y - 150, 3); }
  hud.panel(lines.join('')); hud.best(P.best);
}
function startLine() {
  hud.panel(null); S.mode = 'start'; S.pullBack = 0; S.locked = false; S.dragging = false; fan.visible = true; hand.visible = true; hand.userData.set(0);
  applyLook(look0); hud.best(P.best);
  hud.cards(cards(P), onBuy); hud.showCards(true); hud.hint((P.runs === 0 && !Q.shot) || QS.get('hint') === '1'); drone.init = false; refreshGauge(); refreshReadout(); previewDots();
}
function finishCard() {
  hud.panel(`<b>THE HOUSE IN ONE!</b><span class="line">throw ${P.runs} · ${LEVEL.length} m in one throw${P.firstFinishRun && P.firstFinishRun < P.runs ? ` · first on throw ${P.firstFinishRun}` : ''}</span>${S.pay && S.pay.finishBonus ? `<span class="line first">+$${S.pay.finishBonus}</span>` : ''}<span class="tap">TAP TO KEEP THROWING</span>`);
  S.mode = 'finish';
}
function onBuy(key) {
  const b = buy(P, key); if (!b) return; if (!NOSAVE) save(P); hud.cash(P.cash); hud.cards(cards(P), onBuy); refreshGauge(); previewDots();
  if (b.printChanged) applyPrint(plane, PLANE.print(P.plane)[2]);
  const el = hud.els.cards.querySelector(`[data-key="${key}"]`); const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 }; sfx(key === 'arm' ? 'STRONGER!' : key === 'plane' ? 'SLEEKER!' : 'RICHER!', r.left + r.width / 2, r.top - 30, 2);
}

/* ───────────── input: the gesture, the keyboard, the buttons ───────────── */
const gesture = attachGesture(canvas, G, {
  cap, canStart: e => (S.mode === 'start') && e.target === canvas && e.clientY > innerHeight * 0.28 && !paused,
  onStart() { S.mode = 'aim'; S.dragging = true; hud.showCards(false); hud.hint(false); S.pullBack = 0; },
  onMove(live) { S.speed = live.speed; S.locked = live.locked; S.yaw = live.yaw; S.pullBack = Math.min(live.back / live.pull.full, (cap() - G.min) / (G.max - G.min)); if (live.rising) S.loftI = live.loftIndex; previewDots(); },
  onEnd(d) { S.dragging = false; S.lastDecision = d; if (S.mode !== 'aim') return;
    if (d.action === 'throw') { S.yaw = d.yaw; S.loftI = d.loftIndex; S.speed = d.speed; throwPlane({ x: S.x, yaw: d.yaw, loft: d.loft, power: d.power }); }
    else { S.pullBack = 0; S.locked = false; const p = planeScreen(); if (d.reason !== 'a tap') sfx('…', p.x, p.y - 60, 1); S.mode = 'start'; hud.showCards(true); previewDots(); } },
});
canvas.addEventListener('pointerdown', e => { if (S.mode === 'finish') { startLine(); e.preventDefault(); } });
const keys = {};
window.addEventListener('keydown', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  if (k === 'Escape') { if (paused) closePause(); else if (S.mode === 'aim') { gesture.cancel(); } return; }
  if (k === 'p') { paused ? closePause() : openPause(); return; }
  if (k === 't') { setTwos((twos + 1) % 3); return; }
  if (k === 'h') { hidden = !hidden; hud.hide(hidden); return; }
  if (S.mode === 'finish' && (k === ' ' || k === 'Enter')) { startLine(); return; }
  if (S.mode !== 'start' || paused) return;
  const c = cap(); let changed = true;
  if (k === 'ArrowLeft' || k === 'a') S.yaw = Math.max(-G.yaw, S.yaw - 1); else if (k === 'ArrowRight' || k === 'd') S.yaw = Math.min(G.yaw, S.yaw + 1);
  else if (k === 'ArrowUp' || k === 'w') S.speed = Math.min(c, S.speed + 0.25); else if (k === 'ArrowDown' || k === 's') S.speed = Math.max(G.min, S.speed - 0.25);
  else if (k === 'q') S.x = Math.max(LEVEL.launch.x[0], +(S.x - G.step).toFixed(2)); else if (k === 'e') S.x = Math.min(LEVEL.launch.x[1], +(S.x + G.step).toFixed(2));
  else if (/^[1-5]$/.test(k)) S.loftI = +k - 1;
  else if (k === ' ' || k === 'Enter') { throwPlane({ x: S.x, yaw: S.yaw, loft: G.lofts[S.loftI], power: (S.speed - G.min) / (c - G.min) }); changed = false; }
  else if (k === 'r' && S.lastThrow) { throwPlane(S.lastThrow); changed = false; }
  else changed = false;
  if (changed) { refreshGauge(); refreshReadout(); previewDots(); }
});
window.addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
/* pause: twos, reset (hold 2 s), the frame rate, storage */
function openPause() { if (paused) return; paused = true; hud.pause(true); document.getElementById('twosBtn').textContent = TWOS_LABELS[twos]; }
function closePause() { paused = false; hud.pause(false); resetHold = null; document.getElementById('resetBtn').classList.remove('armed'); document.getElementById('resetBtn').querySelector('i').style.width = '0%'; }
function setTwos(n) { twos = n; engine.twos = twos; kitHud.setTwos(TWOS_LABELS[twos]); document.getElementById('twosBtn').textContent = TWOS_LABELS[twos]; P.twos = twos; if (!NOSAVE) save(P); }
hud.els.pauseBtn.addEventListener('click', () => paused ? closePause() : openPause());
document.getElementById('resumeBtn').addEventListener('click', closePause);
document.getElementById('twosBtn').addEventListener('click', () => setTwos((twos + 1) % 3));
let resetHold = null; const resetBtn = document.getElementById('resetBtn');
resetBtn.addEventListener('pointerdown', e => { resetHold = performance.now(); resetBtn.classList.add('armed'); e.preventDefault(); });
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) resetBtn.addEventListener(ev, () => { resetHold = null; resetBtn.classList.remove('armed'); resetBtn.querySelector('i').style.width = '0%'; });
function doReset() { Object.assign(P, reset()); S.throws = 0; S.speed = 5.5; placePennant(null); applyPrint(plane, 'napkin'); hud.cash(P.cash); ghost.count = 0; ghost.instanceMatrix.needsUpdate = true; closePause(); startLine(); }

/* ───────────── cameras ───────────── */
const drone = { pos: new THREE.Vector3(), look: new THREE.Vector3(), init: false, roll: 0, fov: LEVEL.cameras.aim.fov, kick: new THREE.Vector3() };
function placeCamera(dt, aspect) {
  const D = LEVEL.cameras.drone, A = LEVEL.cameras.aim; let base = A.fov;
  const aimView = S.mode === 'start' || S.mode === 'aim' || S.mode === 'boot';
  if (aimView) { const h = handPoint(), d = aimDir(S.yaw, 0); d.y = 0; d.normalize(); const want = h.clone().addScaledVector(d, -A.back).add(new THREE.Vector3(0, A.up, 0)), lookW = h.clone().addScaledVector(d, 2.2).add(new THREE.Vector3(0, -0.12, 0));
    if (!drone.init) { drone.pos.copy(want); drone.look.copy(lookW); drone.init = true; } const k = 1 - Math.exp(-dt * 10); drone.pos.lerp(want, k); drone.look.lerp(lookW, k);
    camera.position.copy(drone.pos); camera.up.set(0, 1, 0); camera.lookAt(drone.look); drone.roll += (0 - drone.roll) * k; camera.rotateZ(drone.roll); base = aspect < 1 ? A.fovPortrait : A.fov; }
  else { const f = S.fwd; const want = plane.position.clone().addScaledVector(f, -D.back).add(new THREE.Vector3(0, D.up, 0)), lookW = plane.position.clone().addScaledVector(f, D.ahead);
    if (!drone.init) { drone.pos.copy(want); drone.look.copy(lookW); drone.init = true; } const kP = 1 - Math.exp(-dt * D.lagPos), kL = 1 - Math.exp(-dt * D.lagLook); drone.pos.lerp(want, kP); drone.look.lerp(lookW, kL);
    { const rel = drone.pos.clone().sub(plane.position); rel.addScaledVector(f, -rel.dot(f) - D.back); drone.pos.copy(plane.position).add(rel); }
    drone.kick.multiplyScalar(Math.exp(-dt / 0.09));
    camera.position.copy(drone.pos).add(drone.kick); camera.up.set(0, 1, 0); camera.lookAt(drone.look); const wantRoll = S.sBank * 0.35; drone.roll += (wantRoll - drone.roll) * kP; camera.rotateZ(drone.roll);
    base = (aspect < 1 ? D.fovPortrait : D.fov) + D.fovBoost * boostNow(); }
  drone.fov += (base - drone.fov) * Math.min(1, dt * 6);
  if (Math.abs(camera.fov - drone.fov) > 0.01 || camera.aspect !== aspect) { camera.fov = drone.fov; camera.aspect = aspect; camera.updateProjectionMatrix(); }
}
const screenV = new THREE.Vector3();
function toScreen(v) { screenV.copy(v).project(camera); return { x: (screenV.x * 0.5 + 0.5) * innerWidth, y: (-screenV.y * 0.5 + 0.5) * innerHeight }; }
function planeScreen() { return toScreen(plane.position); }
function boostNow() { if (S.mode !== 'flight' || !S.run) return 0; const Pth = S.run.path, i = Math.min(Pth.length - 2, Math.floor(S.tp / LEVEL.glide.dt)); const a = Pth[i], b = Pth[i + 1]; const v = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / LEVEL.glide.dt; return Math.max(0, Math.min(1, (v - 6.5) / 2.5)); }
function sfx(text, x, y, step) { if (Q.shot && QS.get('sfx') !== '1') return; hud.sfx(text, x, y, step); }

/* ───────────── the loop ───────────── */
const clock = new SteppedClock();
function simulateFrame(dt) {
  const t = clock.t, t12 = clock.t12, aspect = (canvas.clientWidth || innerWidth) / (canvas.clientHeight || innerHeight), f = Math.floor(t12 * 12);
  if (S.mode === 'start' || S.mode === 'aim' || S.mode === 'boot') {
    poseOnHand(); plane.userData.update(t, t12, 0); if (S.mode === 'start') { const idle = reduce ? 0 : Math.sin(t * 1.4) * 0.006; plane.position.y += idle; hand.position.y += idle; }
  } else if (S.mode === 'flight') {
    const Pth = S.run.path, dtS = LEVEL.glide.dt; S.tp += dt * TEMPO; const fi = S.tp / dtS, i = Math.min(Pth.length - 2, Math.floor(fi)), fr = Math.min(1, fi - i);
    const a = Pth[i], b = Pth[i + 1]; plane.position.set(a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr, a[2] + (b[2] - a[2]) * fr);
    const j = Math.min(Pth.length - 1, i + 3), c = Pth[j]; const fv = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]); if (fv.lengthSq() > 1e-8) { fv.normalize(); S.fwd.lerp(fv, Math.min(1, dt * 12)).normalize(); }
    plane.lookAt(plane.position.clone().sub(S.fwd));
    const k = Math.max(0, Math.min(Pth.length - 4, i)); if (Pth.length > 4) { const ax = (Pth[k + 3][0] - 2 * Pth[k + 2][0] + Pth[k + 1][0]) / (dtS * dtS); S.bank = Math.max(-0.6, Math.min(0.6, -ax * 0.05)); }
    if (twos === 0 || clock.stepped) S.sBank = S.bank; plane.rotation.z += S.sBank;
    if (S.tumble > 0 && clock.stepped) { plane.rotateX(1.1); S.tumble--; }
    const sq = t12 - squashT; plane.scale.setScalar(LEVEL.plane.scale); if (sq >= 0 && sq < 0.17 && !reduce) plane.scale.y = LEVEL.plane.scale * 0.85;
    plane.userData.update(t, t12, boostNow());
    while (S.fired < S.run.events.length && S.run.events[S.fired].t <= S.tp) fireEvent(S.run.events[S.fired++]);
    if (S.run.popped && S.tp >= S.run.tPop) { const tau = S.tp - S.run.tPop; toastAt(tau).forEach((s, n) => { const m = slices[n]; if (s.air) { m.visible = true; m.position.set(s.x, s.y, s.z); m.userData.spin = n ? 0.9 : 0.35; }
      else if (m.visible && !slicesLanded[n]) { slicesLanded[n] = true; const onCounter = s.x > -1.4 && s.x < 1.2 && s.z > LEVEL.place.kitchen + 0.45 && s.z < LEVEL.place.kitchen + 1.45; m.position.set(s.x, (onCounter ? 0.94 : 0) + 0.008, s.z); m.userData.spin = 0; m.rotation.set(Math.PI / 2, 0, 0.4 * n); } }); }
    const d = LEVEL.launch.z - plane.position.z; if (d > S.reached) S.reached = d; hud.metres(S.reached);
    while (S.crossed < LEVEL.checkpoints.length && S.reached >= LEVEL.checkpoints[S.crossed].at) cutTo(S.crossed++);
    if (clock.stepped) { if (S.tp < S.sootUntil) soot.userData.burst(plane.position.clone().add(new THREE.Vector3(0, 0.02, 0.15)), t12, 1, 0.2); if (S.tp < S.dripsUntil && f % 3 === 0) drips.userData.burst(plane.position.clone(), t12, 1, 0.4); }
    if (fi >= Pth.length - 1) endFlight();
  } else if (S.mode === 'finish') { plane.userData.update(t, t12, 0);
  } else if (S.mode === 'end') {
    S.endT += dt; plane.userData.update(t, t12, 0); if (S.run.result !== 'gate' && S.run.result !== 'land' && !reduce) plane.rotateX(dt * 2);
    if (S.endPhase === 0 && S.endT > 0.9) { S.endPhase = 1; payOut(); }
    if (S.endPhase === 1 && S.endT > (Q.shot ? 99 : 2.3)) { S.endPhase = 2; if (S.run.result === 'gate') finishCard(); else startLine(); }
  }
  if (S.mode !== 'flight') plane.scale.setScalar(LEVEL.plane.scale);
  if (handT >= 0) { const ht = t - handT; if (ht > 0.34 && hand.userData.pose === 1) hand.userData.set(2); }
  flash = Math.max(0, flash - dt * 1.6);
  placeCamera(dt, aspect);
  W.cutaway(camera.position); W.cull(camera.position.z, QS.get('cull') !== '0');
  W.tick(t, t12, clock.stepped || twos === 0, f); if (clock.stepped) for (const p of fxPieces) if (p.userData.tick) p.userData.tick(f, t12);
  world.tick(t, t12, camera.position);
}
function resize(force) { const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; if (force) engine.w = 0; engine.resize(w, h, dpr); }
window.addEventListener('resize', () => resize(false)); if (window.visualViewport) visualViewport.addEventListener('resize', () => resize(false)); resize(true);
const perf = { acc: 0, n: 0, good: 0 };
function adapt(dt) { perf.acc += dt; perf.n++; if (perf.acc < 1) return; const avg = perf.acc / perf.n * 1000; stats.avgMs = avg; perf.acc = 0; perf.n = 0;
  hud.fps(`${Math.round(1000 / avg)} fps · render scale ${dpr.toFixed(2)} of ${dprMax.toFixed(2)} · ${engine.renderer.info.render.calls} draw calls · ${W.stats.meshes} meshes`);
  if (Q.shot || Q.dpr || document.hidden) return;
  if (avg > 19 && dpr > 1.0) { dpr = Math.max(1, +(dpr - 0.25).toFixed(2)); perf.good = 0; resize(true); }
  else if (avg < 12 && dpr < dprMax) { if (++perf.good >= 3) { dpr = Math.min(dprMax, +(dpr + 0.25).toFixed(2)); perf.good = 0; resize(true); } } else perf.good = 0; }
window.__plane = { stats: () => ({ calls: engine.renderer.info.render.calls, triangles: engine.renderer.info.render.triangles, meshes: W.stats.meshes, merged: W.stats.merged, dpr, avgMs: +stats.avgMs.toFixed(1), mode: S.mode, throws: S.throws, cash: P.cash, best: P.best, tempo: TEMPO }), S, P, W, throwLine: L => throwPlane(L) };

/* ───────────── boot ───────────── */
hud.hide(hidden); if (Q.shot && !Q.hud) hud.hide(true); if (Q.shot) document.body.classList.add('shot');
startLine();
if (QS.get('launch')) { const [x, yaw, loft, v] = QS.get('launch').split(',').map(Number); const c = cap(); S.x = Math.min(LEVEL.launch.x[1], Math.max(LEVEL.launch.x[0], x || 0)); const li = Math.max(0, G.lofts.indexOf(loft)); S.loftI = li; S.yaw = yaw || 0; S.speed = Math.min(c, Math.max(G.min, v || 6)); throwPlane({ x: S.x, yaw: S.yaw, loft: G.lofts[li], power: (S.speed - G.min) / (c - G.min) }); }
const SCREEN = QS.get('screen');
if (SCREEN === 'aim') { S.mode = 'aim'; hud.showCards(false); hud.hint(false); S.pullBack = Math.min(0.62, (cap() - G.min) / (G.max - G.min)); S.yaw = -4; S.loftI = 3; S.speed = Math.min(cap(), G.min + (G.max - G.min) * 0.62); S.locked = G.min + (G.max - G.min) * 0.62 > cap(); previewDots(); }
if (SCREEN === 'pay' || SCREEN === 'finish') { const c = cardNow(P); const fin = SCREEN === 'finish'; throwPlane(fin ? { x: 0, yaw: 5, loft: 14, power: (6.5 - G.min) / (c.cap - G.min) } : { x: 0.6, yaw: 2, loft: 26, power: 1 }); while (S.mode === 'flight') { clock.fixed(1 / 60); simulateFrame(1 / 60); } S.endT = 1; simulateFrame(0); if (fin) finishCard(); }
if (SCREEN === 'pause') openPause();
if (Q.shot) { const n = Math.round(Q.t * 60); for (let i = 0; i < n; i++) { clock.fixed(1 / 60); simulateFrame(1 / 60); } }
let shotFrames = 0;
function frame(now) {
  if (!Q.shot) { const dt = clock.tick(now); if (!paused) simulateFrame(dt); else { placeCamera(dt, (canvas.clientWidth || innerWidth) / (canvas.clientHeight || innerHeight)); world.tick(clock.t, clock.t12, camera.position); } adapt(dt); }
  if (!(twos === 2 && !clock.stepped && !Q.shot)) { engine.renderer.info.reset(); engine.render(scene, camera, { boost: boostNow(), flash }); }
  if (resetHold !== null) { const k = Math.min(1, (performance.now() - resetHold) / 2000); resetBtn.querySelector('i').style.width = (k * 100).toFixed(0) + '%'; if (k >= 1) { resetHold = null; doReset(); } }
  if (Q.shot && ++shotFrames === 4) { document.title = 'SHOT-READY'; return; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
