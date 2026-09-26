/* level/store.js — LEVEL 3 · THE GROCERY STORE, built greybox from its pass-5 idea (level/ideas/store.js) · design pass 7 (jumpr t49)
 * The twist: the aisle's walls are shelves (soft, no rails to bonk along), and THE BELT is the first landing that moves the plane.
 * The dock drops 1.2 m to the flooded bay (the exam); the lot beyond it is at the bay's level. */
import idea from './ideas/store.js';
import { buildLevel } from './build.js';
export const TWEAKS = {
  zones: { entrance: { floorMat: 'terrazzo' }, produce: { floorMat: 'terrazzo' }, aisles: { floorMat: 'terrazzo' }, checkouts: { floorMat: 'terrazzo' }, dock: { floorMat: 'steel', ceiling: 4.0, floorAfter: -1.2 } },
  toGo: 'TO THE FENCE', pop: { pop: 'FIZZ!', hit: 'STICKY' }, sliceColor: 'rubber',
  letters: { 'THE SPILL': 'SPLOOSH!', 'THE BAY': 'SPLOOSH!', 'the bag carousel': 'BAGGED', 'THE BELT': 'BAGGED' },
  landings: { 'THE PALLET STACK': { bounce: { e: 0.8, keep: 0.5, vmax: 4.5 } } },
  armUnlocks: { 1: 'produce', 2: 'the deli gap', 3: 'aisle 5 and lane 4', 4: 'over the spill', 5: 'the stockroom', 6: 'the dock\'s edge' },
};
export const LEVEL = buildLevel(idea, TWEAKS);
