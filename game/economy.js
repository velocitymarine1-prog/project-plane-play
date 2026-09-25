/* game/economy.js — the pay, the cards, the prices · design pass 3 §4.4 (pure) */
import { LEVEL } from '../level/house.js';
import { ARM, PLANE, ALLOWANCE, PAY, priceOf, cardOf } from '../level/ladder.js';

/** a fresh player */
export const freshState = () => ({ v: 1, cash: 0, arm: 1, plane: 1, allowance: 1, runs: 0, best: null, milestones: LEVEL.checkpoints.map(() => false).concat([false]), finishes: 0, firstFinishRun: null, twos: 1 });
export const cardNow = st => cardOf(st.arm, st.plane);
/** the pay for one run: distance d (the high-water mark, m), finished or not; mutates the state (cash, milestones, runs, best, finishes) */
export function settle(st, d, finished, landing) {
  st.runs++;
  const mult = ALLOWANCE.mult(st.allowance), metres = Math.round(d) * PAY.perMetre;
  const base = Math.round((PAY.perThrow + metres) * mult); let total = base; const firsts = [];
  LEVEL.checkpoints.forEach((c, i) => { if ((finished || d >= c.at) && !st.milestones[i]) { st.milestones[i] = true; total += c.bonus; firsts.push({ i, text: `${c.first}: +$${c.bonus}` }); } });
  let finishBonus = 0; if (finished) { st.finishes++; if (st.firstFinishRun === null) st.firstFinishRun = st.runs; if (!st.milestones[LEVEL.checkpoints.length]) { st.milestones[LEVEL.checkpoints.length] = true; finishBonus = LEVEL.finishBonus; total += finishBonus; } }
  const record = !st.best || d > st.best.d + 1e-9; if (record) st.best = { d: +d.toFixed(2), x: landing ? +landing[0].toFixed(2) : 0, z: landing ? +landing[2].toFixed(2) : LEVEL.launch.z - d, run: st.runs };
  st.cash += total;
  return { d, finished, mult, metres, base, total, firsts, finishBonus, record, perThrow: PAY.perThrow };
}
/** the three cards as the start line shows them */
export function cards(st) {
  const arm = { key: 'arm', title: 'THE ARM', level: st.arm, maxed: st.arm >= ARM.max, price: st.arm >= ARM.max ? null : priceOf('arm', st.arm),
    now: `${ARM.cap(st.arm).toFixed(1)} m/s`, next: st.arm >= ARM.max ? 'MAXED' : `${ARM.cap(st.arm).toFixed(1)} → ${ARM.cap(st.arm + 1).toFixed(1)} m/s`, unlock: ARM.unlocks[st.arm + 1] ? 'opens ' + ARM.unlocks[st.arm + 1] : 'more gauge' };
  const np = PLANE.nextPrint(st.plane);
  const plane = { key: 'plane', title: 'THE PLANE', level: st.plane, maxed: false, price: priceOf('plane', st.plane),
    now: `glide ${PLANE.ratio(st.plane).toFixed(1)}`, next: `glide ${PLANE.ratio(st.plane).toFixed(1)} → ${PLANE.ratio(st.plane + 1).toFixed(1)}`,
    unlock: (PLANE.damp(st.plane + 1) > PLANE.damp(st.plane) ? 'steadier · ' : '') + (np && np[0] === st.plane + 1 ? `becomes ${np[1]}` : 'about a metre further'), print: PLANE.print(st.plane) };
  const allowance = { key: 'allowance', title: 'ALLOWANCE', level: st.allowance, maxed: false, price: priceOf('allowance', st.allowance),
    now: `×${ALLOWANCE.mult(st.allowance).toFixed(1)}`, next: `×${ALLOWANCE.mult(st.allowance).toFixed(1)} → ×${ALLOWANCE.mult(st.allowance + 1).toFixed(1)}`, unlock: 'every throw pays more' };
  for (const c of [arm, plane, allowance]) c.affordable = !c.maxed && st.cash >= c.price;
  return [arm, plane, allowance];
}
/** buy a card if affordable; returns what changed or null */
export function buy(st, key) {
  const c = cards(st).find(c => c.key === key); if (!c || !c.affordable) return null;
  st.cash -= c.price; st[key]++;
  return { key, level: st[key], price: c.price, printChanged: key === 'plane' && PLANE.prints.some(p => p[0] === st.plane) };
}
export { ARM, PLANE, ALLOWANCE, PAY, priceOf, cardOf };
