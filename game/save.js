/* game/save.js — the save in localStorage: project-plane.v2 (design pass 7), one slot per level with ALLOWANCE on the root.
 *   { v: 2, allowance, current, levels: { house: { cash, arm, plane, runs, best, milestones[5], finishes, firstFinishRun }, school: … }, twos }
 * A v1 save (project-plane.v1, one flat state) migrates once: its allowance lifts to the root, the rest becomes the house's slot (the
 * pennant, the best, the milestones and the cards survive), the v2 is written and the v1 key removed. Every read and write is in
 * try/catch; a corrupt save is replaced, a newer one is kept and the game plays in memory; RESET THIS LEVEL empties one slot, RESET
 * EVERYTHING empties the save. Which level is open is derived from the slots (level/index.js unlocked()), never stored. */
import { freshSlot } from './economy.js';
export const KEY = 'project-plane.v2', OLD_KEY = 'project-plane.v1';
export const status = { storage: 'ok', note: '' };   // 'ok' | 'blocked' | 'newer'
export const freshSave = () => ({ v: 2, allowance: 1, current: 'house', levels: { house: freshSlot() }, twos: 1 });
const num = (v, min = 0) => typeof v === 'number' && isFinite(v) && v >= min;
/** a slot as read from storage, held to its shape (throws on a broken one) */
function cleanSlot(s) {
  if (!s || typeof s !== 'object') throw new Error('slot');
  const out = Object.assign(freshSlot(), s);
  for (const k of ['cash', 'arm', 'plane', 'runs', 'finishes']) if (!num(out[k])) throw new Error(k);
  if (!Array.isArray(out.milestones)) out.milestones = freshSlot().milestones; while (out.milestones.length < 5) out.milestones.push(false);
  out.arm = Math.max(1, Math.floor(out.arm)); out.plane = Math.max(1, Math.floor(out.plane)); out.cash = Math.floor(out.cash); out.runs = Math.floor(out.runs); out.finishes = Math.floor(out.finishes);
  if (out.best && !num(out.best.d)) out.best = null; if (out.firstFinishRun != null && !num(out.firstFinishRun)) out.firstFinishRun = null;
  delete out.allowance; delete out.v; delete out.twos; delete out.current; delete out.levels;
  return out;
}
const twosOf = v => [0, 1, 2].includes(v) ? v : 1;
/** a v1 state → a v2 save: the allowance on the root, the rest the house's slot */
export function migrateV1(s) { const sv = freshSave(); sv.allowance = num(s.allowance, 1) ? Math.floor(s.allowance) : 1; sv.twos = twosOf(s.twos); sv.levels.house = cleanSlot(s); return sv; }
export function load() {
  let raw = null, old = null;
  try { raw = localStorage.getItem(KEY); old = localStorage.getItem(OLD_KEY); } catch (e) { status.storage = 'blocked'; status.note = 'Storage is blocked here, so progress lives in memory until the tab closes.'; return freshSave(); }
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (!s || typeof s !== 'object' || typeof s.v !== 'number') throw new Error('shape');
      if (s.v > 2) { status.storage = 'newer'; status.note = 'A save from a newer version of the game was found and left alone; this session plays in memory.'; return freshSave(); }
      const sv = freshSave(); sv.allowance = num(s.allowance, 1) ? Math.floor(s.allowance) : 1; sv.twos = twosOf(s.twos); sv.current = typeof s.current === 'string' ? s.current : 'house'; sv.levels = {};
      for (const [id, slot] of Object.entries(s.levels && typeof s.levels === 'object' ? s.levels : {})) sv.levels[id] = cleanSlot(slot);
      if (!sv.levels.house) sv.levels.house = freshSlot();
      return sv;
    } catch (e) { try { localStorage.removeItem(KEY); } catch (_) { } status.note = 'The old save was unreadable and was reset.'; return freshSave(); }
  }
  if (old) {
    try {
      const s = JSON.parse(old);
      if (!s || typeof s !== 'object' || typeof s.v !== 'number' || s.v > 1) throw new Error('shape');
      const sv = migrateV1(s); if (save(sv)) { try { localStorage.removeItem(OLD_KEY); } catch (_) { } }
      status.note = 'The save moved to the new format: the house\'s progress came along.'; return sv;
    } catch (e) { try { localStorage.removeItem(OLD_KEY); } catch (_) { } status.note = 'The old save was unreadable and was reset.'; return freshSave(); }
  }
  return freshSave();
}
/** a level's slot, with `allowance` reaching the save's root (a getter, never written into the slot) */
export function slot(sv, id) {
  if (!sv.levels[id]) sv.levels[id] = freshSlot(); const s = sv.levels[id];
  if (!Object.getOwnPropertyDescriptor(s, 'allowance')) Object.defineProperty(s, 'allowance', { get: () => sv.allowance, set: v => { sv.allowance = v; }, enumerable: false, configurable: true });
  return s;
}
export function save(sv) { if (status.storage !== 'ok') return false; try { localStorage.setItem(KEY, JSON.stringify(sv)); return true; } catch (e) { return false; } }
/** RESET THIS LEVEL: a fresh slot; the other levels and the allowance stay */
export function resetLevel(sv, id) { sv.levels[id] = freshSlot(); return slot(sv, id); }
/** RESET EVERYTHING: the save gone, a fresh v2 */
export function resetAll() { try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch (_) { } return freshSave(); }
