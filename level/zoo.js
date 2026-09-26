/* level/zoo.js — LEVEL 5 · THE ZOO, built greybox from its pass-5 idea (level/ideas/zoo.js) · design pass 7 (jumpr t49)
 * The twist: the animals are the dynamics (the monkeys throw, the elephant sprays) and never collide (they are pictures until their
 * pieces card); the aviary's walls are net (soft) under a 6 m net overhead (a ceiling here until the pieces card makes it a flop). */
import idea from './ideas/zoo.js';
import { buildLevel } from './build.js';
export const TWEAKS = {
  zones: { gate: { outdoor: true, floorMat: 'paver' }, monkeys: { floorMat: 'terrazzo' }, aviary: { floorMat: 'mulch', ceiling: 6.0 }, savannah: { outdoor: true, floorMat: 'lawn' }, penguins: { outdoor: true, floorMat: 'stock' } },
  toGo: 'TO THE EXIT', pop: { pop: 'HOOT!', hit: 'BANANA\'D' }, sliceColor: 'yellow',
  letters: { 'THE LIONS\' MOAT': 'SPLOOSH!', 'THE PENGUIN POOL': 'SPLOOSH!', 'the elephant\'s spray': 'SOGGY!', 'THE ICE MOUND': 'SKRRT' },
  landings: { 'THE ICE MOUND': { land: 'SKRRT' } },                         // a plane that comes down on the ice skids to a stop
  /* the greybox's own numbers (pass 5's data untouched; the zoo's solver pass sets them for good): the bird lock's outer door as a double door
     (x −1.0..0.9, was −1.0..0.15: from the monkey house's door at x 0.5..1.5 the lock was a needle no throw could reach: 15 lines of 57 645
     passed it, none finished) and the waterfall's drift turned harder left (dir −0.45, 0.65, −0.6 at 14 m/s², was −0.3, 0.65, −0.7 at 12): 21 finishing lines at arm 8 / plane 20 */
  patch(idea) { const cp = idea.checkpoints[2]; cp.x = [-1.0, 0.9]; const g = idea.items.find(i => i.id === 'the bird lock'); g.x = 1.65; g.w = 1.1; const w = idea.items.find(i => i.id === 'THE WATERFALL'); w.dir = [-0.45, 0.65, -0.6]; w.accel = 14; },
  armUnlocks: { 1: 'the monkey house', 2: 'the saloon doors', 3: 'the aviary and the bird lock', 4: 'over the moat', 5: 'penguin beach', 6: 'the pool\'s edge' },
};
export const LEVEL = buildLevel(idea, TWEAKS);
