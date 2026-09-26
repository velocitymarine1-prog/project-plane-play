/* level/ladder.js — the three cards, the prices, the pay, as pure numbers · design pass 3 (PACING) as built in pass 4
 *
 * THE ARM: the gauge's cap, 5.5 m/s at level 1, +0.5 a level, MAXED at level 8 (9.0 m/s); the first five cards each open a room.
 * THE PLANE: the glide ratio 5.0 + 0.4 a level, the damping stepped at 5 / 10 / 15, the trim never moves (7 m/s); the print evolves
 *            at 1 / 5 / 10 / 15 / 20 (the silhouette never changes).
 * ALLOWANCE: the pay multiplier, ×1.0 + 0.1 a level, no cap.
 * Prices: pass 1's ladders × 3.5 (pass 8: × 1.5 again), ×1.32 a level (ALLOWANCE ×1.4), flattening to ×1.15 after the tenth card.
 * Pay: $10 a throw + $1 a metre reached (the high-water mark), × the allowance; the milestones paid once per save; the finish $150 once.
 */
export const ARM = { base: 5.5, step: 0.5, max: 8,
  cap: L => 5.5 + 0.5 * (Math.min(L, 8) - 1),
  unlocks: { 1: 'the living room', 2: 'the kitchen door', 3: 'the Pilates room and the lanai', 4: 'over the pond', 5: 'the deck', 6: 'the pool\'s edge' } };
export const PLANE = { trim: 7.0,
  ratio: L => 5.0 + 0.4 * (L - 1),
  damp: L => L >= 15 ? 1.5 : L >= 10 ? 1.3 : L >= 5 ? 1.1 : 0.9,
  prints: [[1, 'NAPKIN', 'napkin'], [5, 'NOTEBOOK PAGE', 'notebook'], [10, 'PAGE ONE', 'pageone'], [15, 'CARDSTOCK', 'cardstock'], [20, 'FOIL', 'foil']],
  /* a level's paper is its own five names on the same steps (pass 5: PAGE ONE at 10 everywhere); the house's are the default */
  print: (L, paper = PLANE.prints) => { let p = paper[0]; for (const q of paper) if (L >= q[0]) p = q; return p; },
  nextPrint: (L, paper = PLANE.prints) => paper.find(q => q[0] > L) || null };
export const ALLOWANCE = { mult: L => 1 + 0.1 * (L - 1) };
export const PRICES = { arm: 158, plane: 185, allowance: 132, ratio: 1.32, allowanceRatio: 1.4, flattenAfter: 10, flatRatio: 1.15 };   // pass 8: ×1.5 of pass 3's 105 / 123 / 88, so the roomier house keeps pass 3's pacing (docs/design/08-quality.md §3.7)
/** the price of the NEXT level of a card, given the level held now (L → L + 1); mul = the level's price factor (pass 5: ×1.4 a level) */
export function priceOf(card, L, mul = 1) {
  const base = PRICES[card], r = card === 'allowance' ? PRICES.allowanceRatio : PRICES.ratio;
  const n = L - 1, steep = Math.min(n, PRICES.flattenAfter), flat = Math.max(0, n - PRICES.flattenAfter);
  return Math.round(base * Math.pow(r, steep) * Math.pow(PRICES.flatRatio, flat) * mul);
}
export const PAY = { perThrow: 10, perMetre: 1, milestones: [10, 25, 60, 100], finish: 150 };
/** the card as the sim wants it */
export const cardOf = (armL, planeL) => ({ cap: ARM.cap(armL), ratio: PLANE.ratio(planeL), damp: PLANE.damp(planeL), trim: PLANE.trim });
