/* game/economy.js — the pay, the cards, the prices · design pass 3 §4.4 (pure); pass 7: per level
 * The unit is one flat state: a level's slot { cash, arm, plane, runs, best, milestones, finishes, firstFinishRun } with `allowance` on it
 * (the save's root, reached through the slot's getter; the harness's freshState() carries it as a plain field). The level supplies its
 * checkpoints and finish bonus (the milestones pay once per level), its price factor (×1.4 a level, the allowance's card included: it is
 * bought with the level's cash), its arm cards' unlock text and its paper; the house is the default, so every tool runs unchanged. */
import { LEVEL as HOUSE } from '../level/house.js';
import { ARM, PLANE, ALLOWANCE, PAY, priceOf, cardOf } from '../level/ladder.js';
import { UNITS, mph, speed, aBit } from './units.js';   // pass 10: the cards in plain words, the arm in mph

/** a level's fresh slot */
export const freshSlot = () => ({ cash: 0, arm: 1, plane: 1, runs: 0, best: null, milestones: [false, false, false, false, false], finishes: 0, firstFinishRun: null });
/** a fresh player as one flat state (the solver harness's unit): a slot with the allowance and the twos on it */
export const freshState = () => Object.assign(freshSlot(), { v: 1, allowance: 1, twos: 1 });
export const cardNow = st => cardOf(st.arm, st.plane);
/** the pay for one run: distance d (the high-water mark, m), finished or not; mutates the slot (cash, milestones, runs, best, finishes) */
export function settle(st, d, finished, landing, level = HOUSE) {
  st.runs++;
  const mult = ALLOWANCE.mult(st.allowance), metres = Math.round(d) * PAY.perMetre;
  const base = Math.round((PAY.perThrow + metres) * mult); let total = base; const firsts = [];
  while (st.milestones.length < level.checkpoints.length + 1) st.milestones.push(false);
  level.checkpoints.forEach((c, i) => { if ((finished || d >= c.at) && !st.milestones[i]) { st.milestones[i] = true; total += c.bonus; firsts.push({ i, text: `${c.first}: +$${c.bonus}` }); } });
  let finishBonus = 0; if (finished) { st.finishes++; if (st.firstFinishRun === null) st.firstFinishRun = st.runs; if (!st.milestones[level.checkpoints.length]) { st.milestones[level.checkpoints.length] = true; finishBonus = level.finishBonus; total += finishBonus; } }
  const record = !st.best || d > st.best.d + 1e-9; if (record) st.best = { d: +d.toFixed(2), x: landing ? +landing[0].toFixed(2) : 0, z: landing ? +landing[2].toFixed(2) : level.launch.z - d, run: st.runs };
  st.cash += total;
  return { d, finished, mult, metres, base, total, firsts, finishBonus, record, perThrow: PAY.perThrow };
}
/** the three cards as the start line shows them, at the level's prices */
export function cards(st, level = HOUSE) {
  const mul = level.priceMul || 1, unlocks = level.armUnlocks || ARM.unlocks, paper = level.paper || PLANE.prints;
  const arm = { key: 'arm', title: 'THE ARM', level: st.arm, maxed: st.arm >= ARM.max, price: st.arm >= ARM.max ? null : priceOf('arm', st.arm, mul),
    now: speed(ARM.cap(st.arm)), next: st.arm >= ARM.max ? 'MAXED' : UNITS.imperial ? `${mph(ARM.cap(st.arm))} → ${mph(ARM.cap(st.arm + 1))} mph` : `${ARM.cap(st.arm).toFixed(1)} → ${ARM.cap(st.arm + 1).toFixed(1)} m/s`, unlock: unlocks[st.arm + 1] ? 'reaches ' + unlocks[st.arm + 1] : 'throws harder' };
  const np = PLANE.nextPrint(st.plane, paper);
  const plane = { key: 'plane', title: 'THE PLANE', level: st.plane, maxed: false, price: priceOf('plane', st.plane, mul),
    now: `glide ${PLANE.ratio(st.plane).toFixed(1)}`, next: 'glides farther',
    unlock: (PLANE.damp(st.plane + 1) > PLANE.damp(st.plane) ? 'steadier · ' : '') + (np && np[0] === st.plane + 1 ? `becomes ${np[1]}` : aBit()), print: PLANE.print(st.plane, paper) };
  const allowance = { key: 'allowance', title: 'ALLOWANCE', level: st.allowance, maxed: false, price: priceOf('allowance', st.allowance, mul),
    now: `×${ALLOWANCE.mult(st.allowance).toFixed(1)}`, next: `+${Math.round((ALLOWANCE.mult(st.allowance + 1) - 1) * 100)} % on every throw`, unlock: 'every throw pays more, everywhere' };
  for (const c of [arm, plane, allowance]) c.affordable = !c.maxed && st.cash >= c.price;
  return [arm, plane, allowance];
}
/** buy a card if affordable; returns what changed or null */
export function buy(st, key, level = HOUSE) {
  const c = cards(st, level).find(c => c.key === key); if (!c || !c.affordable) return null;
  st.cash -= c.price; st[key]++;
  return { key, level: st[key], price: c.price, printChanged: key === 'plane' && (level.paper || PLANE.prints).some(p => p[0] === st.plane) };
}
export { ARM, PLANE, ALLOWANCE, PAY, priceOf, cardOf };
