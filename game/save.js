/* game/save.js — the save in localStorage (project-plane.v1), every read and write in try/catch; a corrupt save is replaced, a newer one is kept
   and the game plays in memory; RESET clears it. */
import { freshState } from './economy.js';
export const KEY = 'project-plane.v1';
export const status = { storage: 'ok', note: '' };   // 'ok' | 'blocked' | 'newer'
export function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { status.storage = 'blocked'; status.note = 'Storage is blocked here, so progress lives in memory until the tab closes.'; return freshState(); }
  if (!raw) return freshState();
  try {
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object' || typeof s.v !== 'number') throw new Error('shape');
    if (s.v > 1) { status.storage = 'newer'; status.note = 'A save from a newer version of the game was found and left alone; this session plays in memory.'; return freshState(); }
    const f = freshState(); const out = Object.assign(f, s);
    for (const k of ['cash', 'arm', 'plane', 'allowance', 'runs', 'finishes']) if (typeof out[k] !== 'number' || !isFinite(out[k]) || out[k] < 0) throw new Error(k);
    if (!Array.isArray(out.milestones)) out.milestones = f.milestones; while (out.milestones.length < f.milestones.length) out.milestones.push(false);
    out.arm = Math.max(1, Math.floor(out.arm)); out.plane = Math.max(1, Math.floor(out.plane)); out.allowance = Math.max(1, Math.floor(out.allowance)); out.cash = Math.floor(out.cash);
    if (out.best && (typeof out.best.d !== 'number' || !isFinite(out.best.d))) out.best = null;
    return out;
  } catch (e) { try { localStorage.removeItem(KEY); } catch (_) { } status.note = 'The old save was unreadable and was reset.'; return freshState(); }
}
export function save(st) { if (status.storage !== 'ok') return false; try { localStorage.setItem(KEY, JSON.stringify(st)); return true; } catch (e) { return false; } }
export function reset() { try { localStorage.removeItem(KEY); } catch (_) { } return freshState(); }
