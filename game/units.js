/* game/units.js — design pass 10 (A REAL HOUSE): the page shows feet and miles an hour, the physics, the save and the solvers stay metric.
 * The conversion happens at the last moment, where a number becomes a string. `?units=m` keeps metres on the page (the solver work reads
 * the same numbers the tools print). Pure: no DOM, no Three.js. */
export const UNITS = { imperial: true };
/** metres → whole feet (43.9 m → 144) */
export const ft = m => Math.round(m * 3.28084);
/** m/s → whole miles an hour (5.5 m/s → 12; the arm's eight levels 12 · 13 · 15 · 16 · 17 · 18 · 19 · 20 are all distinct) */
export const mph = ms => Math.round(ms * 2.23694);
/** a distance for the page: '144 FT' or '43.9 m' (upper = the flight's slot and the pay panel, lower = the pennant) */
export function dist(m, { upper = true } = {}) {
  if (!UNITS.imperial) return `${Math.max(0, m).toFixed(1)} m`;
  return `${ft(Math.max(0, m))} ${upper ? 'FT' : 'ft'}`;
}
/** a speed for the cards: '12 mph' or '5.5 m/s' */
export const speed = ms => UNITS.imperial ? `${mph(ms)} mph` : `${ms.toFixed(1)} m/s`;
/** a short length in words for the plane card: 'a few feet farther' / 'about a metre farther' */
export const aBit = () => UNITS.imperial ? 'a few feet farther' : 'about a metre farther';
