/* level/school.js — LEVEL 2 · THE SCHOOL, built greybox from its pass-5 idea (level/ideas/school.js) · design pass 7 (jumpr t49)
 * The hand-written part pass 5 left to the level card: the floors, the tall gym, the outdoor playground, the letters and the slide's ride.
 * The twist: the gym's 7 m ceiling makes the lob a real line, and THE HOOP is a ring the plane flies through (SWISH!). */
import idea from './ideas/school.js';
import { buildLevel } from './build.js';
export const TWEAKS = {
  zones: { hall: { floorMat: 'terrazzo' }, classroom: { floorMat: 'oak' }, lab: { floorMat: 'terrazzo' }, gym: { floorMat: 'oak', ceiling: 7.0 }, playground: { outdoor: true, floorMat: 'lawn' } },
  toGo: 'TO THE FENCE', pop: { pop: 'CLAP!', hit: 'CHALKED' }, sliceColor: 'stock',
  letters: { 'THE FOAM PIT': 'FOAMED', 'THE SANDBOX': 'SANDED', 'the ball cart': 'DUSTED', 'THE SLIDE': 'WHEEE' },
  carries: { 'THE SLIDE': { dir: [0, -0.55, -0.83], speed: 1.5, ramp: [2.2, 0.4] } },   // a plane that comes down on the chute slides to the bottom and stops
  /* the greybox's own numbers (pass 5's data untouched; the school's solver pass sets them for good): the lab's back door stands open under its
     transom (the checkpoint from the floor to 2.7 m, was 1.9–2.7: pass 5's fallback for its narrowest checkpoint, "a second, lower opening in
     the door itself"; the transom alone let no line of 57 645 finish once the wall below it was made solid) */
  patch(idea) { idea.checkpoints[2].y = [0, 2.7]; idea.checkpoints[2].note = 'the lab\'s back door, open under its transom'; },
  armUnlocks: { 1: 'the classroom', 2: 'room 12\'s door', 3: 'the lab and the transom', 4: 'over the foam pit', 5: 'the playground', 6: 'the sandbox\'s edge' },
};
export const LEVEL = buildLevel(idea, TWEAKS);
