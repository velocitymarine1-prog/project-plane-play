/* level/factory.js — LEVEL 6 · THE FACTORY, built greybox from its pass-5 idea (level/ideas/factory.js) · design pass 7 (jumpr t49)
 * The finale: the paper mill where the comic is printed. The shredder belt is the exam (a hard stop: SHRED!), the low belt the level's
 * one carry, the dock door's head at 3.4 m the sill rule; the ink stations' prints are the pieces card's (a cosmetic effect). */
import idea from './ideas/factory.js';
import { buildLevel } from './build.js';
export const TWEAKS = {
  zones: { rolls: { floorMat: 'steel', ceiling: 3.5 }, press: { floorMat: 'steel' }, conveyors: { floorMat: 'steel' }, warehouse: { floorMat: 'steel' }, dock: { floorMat: 'steel', ceiling: 4.0 } },
  toGo: 'TO THE DOCK DOOR', pop: { pop: 'JAM!', hit: 'CRUMPLED' }, sliceColor: 'stock',
  letters: { 'THE PULP VAT': 'PULPED', 'THE SHREDDER BELT': 'SHRED!', 'THE WRAPPER': 'WRAPPED', 'the low belt': 'SLIDE…' },
  landings: { 'THE BUNDLE STACK': { bounce: { e: 0.8, keep: 0.5, vmax: 4.5 } } },
  armUnlocks: { 1: 'the press hall', 2: 'the guard rail\'s gap', 3: 'the line and the curtain', 4: 'over the vat', 5: 'the shipping dock', 6: 'the shredder\'s edge' },
};
export const LEVEL = buildLevel(idea, TWEAKS);
