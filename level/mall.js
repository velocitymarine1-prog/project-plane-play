/* level/mall.js — LEVEL 4 · THE SHOPPING MALL, built greybox from its pass-5 idea (level/ideas/mall.js) · design pass 7 (jumpr t49)
 * The twist: the run climbs a storey. The atrium's updraft (or THE ESCALATOR, a carry that rises) takes the plane to the balcony at 4.5 m;
 * from there the floor is the second floor, the bridge crosses the koi pool below, the ball pit is the exam and the theatre doors the finish.
 * The mezzanine at 2.5 m is the solver pass's fallback (pass 5, open decision 6): one number in the idea's zones. */
import idea from './ideas/mall.js';
import { buildLevel } from './build.js';
/** THE MEZZANINE: pass 5's fallback for the climb (open decision 6), taken by the greybox. With the balcony at 4.5 m no throw of 57 645 finished at
 *  arm 8 / plane 20 (five reached the rail's gap; the lift that carries a plane that high leaves it no speed to glide the corridor); with the upper
 *  storey at 2.5 m, 92 do. The drop is applied to pass 5's data at build time (the file itself is untouched): every upper-storey height comes down
 *  2.0 m (the floors, the rail, the shopfronts, the banners, the bubbles, the beanbags, the booth, the ball pit, the checkpoints, the escalator's
 *  rise, the updraft's top). The mall's solver pass decides whether the balcony goes back up with a road that reaches it. */
const MEZZANINE = 2.5, DROP = 4.5 - MEZZANINE;
export const TWEAKS = {
  zones: { entrance: { floorMat: 'terrazzo' }, foodcourt: { floorMat: 'terrazzo' }, atrium: { floorMat: 'terrazzo', ceiling: 8.0 }, upper: { floorMat: 'terrazzo', ceiling: MEZZANINE + 3.0, groundMat: 'terrazzo' }, cinema: { floorMat: 'rubber', ceiling: MEZZANINE + 3.0, groundMat: 'terrazzo' } },
  toGo: 'TO THE THEATRE DOORS', pop: { pop: 'TOSS!', hit: 'DOUGHED' }, sliceColor: 'yellow',
  letters: { 'THE FOUNTAIN': 'SPLOOSH!', 'THE BRIDGE & THE KOI POOL': 'SPLOOSH!', 'THE BALL PIT': 'SWALLOWED', 'the bubbles': 'BUBBLED', 'THE ESCALATOR': 'GOING UP', 'THE BEANBAGS': 'FLUMP' },
  carries: { 'THE ESCALATOR': { dir: [0, 0.6, -0.8], speed: 1.2, ramp: [0, MEZZANINE] } },   // its top face rises from the floor at its near end to the mezzanine at its far end; 1.2 m/s (pass 5's 0.5 m/s is a 15 s ride: comic time)
  landings: { 'THE BEANBAGS': { land: 'FLUMP' } },                         // a landing that stays
  armUnlocks: { 1: 'the food court', 2: 'the pretzel gap', 3: 'the atrium and the mezzanine', 4: 'across the bridge', 5: 'the cinema lobby', 6: 'the ball pit\'s edge' },
  patch(idea) {
    for (const z of idea.zones) if (z.floor) z.floor -= DROP;
    for (const it of idea.items) { if (it.y0 != null && it.y0 >= 4.0) { it.y0 -= DROP; it.y1 -= DROP; } else if (it.y1 != null && it.y1 > 4.0) it.y1 -= DROP; }
    for (const cp of idea.checkpoints) if (cp.y[0] >= 4.0) { cp.y[0] -= DROP; cp.y[1] -= DROP; }
    idea.checkpoints[2].note = 'the mezzanine rail\'s gap where the escalator lands, half a storey up';
  },
};
export const LEVEL = buildLevel(idea, TWEAKS);
