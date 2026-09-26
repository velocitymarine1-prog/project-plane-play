/* level/index.js — the six levels in the play order, with their unlock rule and price factor · design pass 7 (jumpr t49), 25 September 2026
 *
 * Design pass 5's framework (§3.3–3.4): a level is a fresh run of the same three cards on the same spine, ALLOWANCE carries, the finish of
 * level n unlocks level n + 1, prices are the house's × 1.4 a level. The order is pass 5's recommendation (open decision 1): the school
 * first (the most native fantasy, the fewest new pieces), the factory last (the finale); the numbers follow this play order.
 * Pure data (no Three.js, no DOM): game/main.js imports a level's module by id; the level select and the save read this list.
 */
export const LEVELS = [
  { id: 'house', n: 1, title: 'THE HOUSE', line: 'THE HOUSE IN ONE!', next: 'school',
    tagline: 'Throw your paper plane through the house and out over the back fence. Every throw pays.' },
  { id: 'school', n: 2, title: 'THE SCHOOL', line: 'THE SCHOOL IN ONE!', next: 'store',
    tagline: 'Down the locker hall, over the desks, through the lab\'s transom, across the gym, out to the playground and over the sandbox.' },
  { id: 'store', n: 3, title: 'THE GROCERY STORE', line: 'THE STORE IN ONE!', next: 'mall',
    tagline: 'In through the automatic doors, past the produce, down aisle 5, over the spill, out the loading dock.' },
  { id: 'mall', n: 4, title: 'THE SHOPPING MALL', line: 'THE MALL IN ONE!', next: 'zoo',
    tagline: 'Past the map kiosk, through the food court, up the atrium to the second floor, across the bridge, over the ball pit into the cinema.' },
  { id: 'zoo', n: 5, title: 'THE ZOO', line: 'THE ZOO IN ONE!', next: 'factory',
    tagline: 'Through the gate, past the monkeys, up the aviary, along the savannah, over the penguin pool to the exit.' },
  { id: 'factory', n: 6, title: 'THE FACTORY', line: 'THE FACTORY IN ONE!', next: null,
    tagline: 'The paper mill: past the rolls, through the four-colour press, over the conveyors and the pulp vat, off the shipping dock.' },
];
/** the price factor a level: the house's ladder × 1.4 ^ (n − 1) (pass 5 §3.3; each level's journeys re-set it) */
export const PRICE_STEP = 1.4;
for (const L of LEVELS) L.priceMul = +Math.pow(PRICE_STEP, L.n - 1).toFixed(4);
export const byId = id => LEVELS.find(l => l.id === id) || null;
export const nextOf = id => { const l = byId(id); return l && l.next ? byId(l.next) : null; };
export const prevOf = id => LEVELS.find(l => l.next === id) || null;
/** a level is open when the one before it has been finished once (the house always); derived from the save, never stored */
export function unlocked(id, save) {
  const l = byId(id); if (!l) return false; const p = prevOf(id); if (!p) return true;
  const s = save && save.levels && save.levels[p.id]; return !!(s && s.finishes >= 1);
}
/** the level's module, relative to game/ (main.js imports it by id) */
export const fileOf = id => `../level/${id}.js`;
