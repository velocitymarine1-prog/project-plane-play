/* game/gesture.js — the throw: drag back, swipe forward · design pass 1 §4.2 as built for a phone (pass 4 §3.4)
 *
 * Pure mapping first (testable in node), the pointer binding after it.
 *   readPull(dx, dy, short, cap, G)       the pull's offset from the grab point (px; dy > 0 = down the screen = back) → power, speed, yaw
 *   loftOf(dx, dy, G)                     the release point's offset from the grab point → one of the five lofts (the fan's angle)
 *   decide(samples, short, cap, G)        the whole drag → { action: 'throw' | 'cancel', reason, power, speed, yaw, loft, locked }
 *   attach(el, G, hooks)                  pointer events on the canvas: one finger, the live state on every move, the decision on the lift
 * G = LEVEL.gauge: { min, max, lofts, yaw, pullFrac, yawFrac, cancelPx, swipePxPerS, swipeMs }
 */
export const LOFT_BANDS = [10, 35, 58, 75];   // the release angle above the grab point, degrees: the boundaries between the five notches

/** the pull as the gauge reads it: the pull length back on the absolute gauge (4 → 12 m/s), clamped at the card's cap (the hatched tail) */
export function readPull(dx, dy, short, cap, G) {
  const full = G.pullFrac * short, back = Math.max(0, dy);
  const speedRaw = G.min + (G.max - G.min) * Math.min(1, back / full);
  const locked = speedRaw > cap, speed = Math.min(speedRaw, cap);
  const power = (speed - G.min) / (cap - G.min);
  const yaw = Math.max(-G.yaw, Math.min(G.yaw, -dx / (G.yawFrac * short) * G.yaw));   // a pull to the left points the nose right (a slingshot)
  return { speed, speedRaw, power, yaw, locked, back, full };
}
/** the loft: the angle of the release point above the grab point, snapped to the fan's five notches */
export function loftIndex(dx, dy) {
  const elev = Math.atan2(-dy, Math.abs(dx)) * 180 / Math.PI;     // dy < 0 = above the grab point
  let i = 0; while (i < LOFT_BANDS.length && elev >= LOFT_BANDS[i]) i++; return i;
}
export const loftOf = (dx, dy, G) => G.lofts[loftIndex(dx, dy)];
/** the lift: samples = [{ t (ms), x, y }, …] from the grab (samples[0]) to the lift (the last) */
export function decide(samples, short, cap, G) {
  const s0 = samples[0], end = samples[samples.length - 1];
  let maxPull = 0; for (const s of samples) maxPull = Math.max(maxPull, Math.hypot(s.x - s0.x, s.y - s0.y));
  if (maxPull < G.cancelPx) return { action: 'cancel', reason: 'a tap' };
  // the swipe: the last swipeMs of motion, upward at swipePxPerS or more
  // the browser's lift repeats the last move's position a few ms later, so the window always reaches back at least two moving samples
  let k = samples.length - 1, moved = 0; while (k > 0 && (end.t - samples[k - 1].t <= G.swipeMs || moved < 2)) { k--; if (samples[k].x !== end.x || samples[k].y !== end.y) moved++; }
  const from = samples[k], dtS = Math.max(1, end.t - from.t) / 1000, up = (from.y - end.y) / dtS;
  if (!(up >= G.swipePxPerS)) return { action: 'cancel', reason: up <= 0 ? 'no swipe' : 'too slow' };
  // the swipe's start: walk back while the finger was rising (a deliberate follow-through can take 300 ms), so the power and the yaw are read before the swipe
  let j = samples.length - 1; while (j > 0 && samples[j - 1].y >= samples[j].y && end.t - samples[j - 1].t <= 400) j--;
  const start = samples[j];
  const pull = readPull(start.x - s0.x, start.y - s0.y, short, cap, G);
  if (pull.back < G.cancelPx) return { action: 'cancel', reason: 'no pull' };
  const li = loftIndex(end.x - s0.x, end.y - s0.y);
  return { action: 'throw', power: pull.power, speed: pull.speed, yaw: pull.yaw, loft: G.lofts[li], loftIndex: li, locked: pull.locked, swipe: up };
}
/** pointer binding: one finger; hooks.onStart(), hooks.onMove({ power, speed, yaw, locked, loftIndex, rising }), hooks.onEnd(decision) */
export function attach(el, G, hooks) {
  let active = null;   // { id, samples }
  const short = () => Math.min(el.clientWidth || innerWidth, el.clientHeight || innerHeight);
  const cap = () => hooks.cap();
  const live = (s) => { const A = active, s0 = A.samples[0]; const pull = readPull(s.x - s0.x, s.y - s0.y, short(), cap(), G);
    const n = A.samples.length, rising = n > 1 && A.samples[n - 2].y > s.y && s.y < s0.y + pull.back;
    return { power: pull.power, speed: pull.speed, yaw: pull.yaw, locked: pull.locked, back: pull.back, loftIndex: loftIndex(s.x - s0.x, s.y - s0.y), rising, pull }; };
  el.addEventListener('pointerdown', e => {
    if (active || !hooks.canStart(e)) return;
    try { el.setPointerCapture(e.pointerId); } catch (_) { }
    active = { id: e.pointerId, samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }] }; hooks.onStart(); e.preventDefault();
  });
  el.addEventListener('pointermove', e => {
    if (!active || e.pointerId !== active.id) return;
    const s = { t: e.timeStamp, x: e.clientX, y: e.clientY }; active.samples.push(s); if (active.samples.length > 240) active.samples.splice(1, 60);
    hooks.onMove(live(s)); e.preventDefault();
  });
  const finish = (e, cancelled) => {
    if (!active || e.pointerId !== active.id) return;
    const A = active; active = null; try { el.releasePointerCapture(e.pointerId); } catch (_) { }
    if (cancelled) { hooks.onEnd({ action: 'cancel', reason: 'cancelled' }); return; }
    A.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    hooks.onEnd(decide(A.samples, short(), cap(), G));
  };
  el.addEventListener('pointerup', e => finish(e, false));
  el.addEventListener('pointercancel', e => finish(e, true));
  el.addEventListener('lostpointercapture', e => { if (active && e.pointerId === active.id) finish(e, true); });
  return { cancel() { if (active) { active = null; hooks.onEnd({ action: 'cancel', reason: 'escape' }); } }, get active() { return !!active; } };
}
