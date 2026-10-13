/**
 * The two records canmi.app keeps in the browser, one origin for every part behind its router,
 * declared as data; `@canmi/kit/behavior/state` executes them. Which facts go in which is read as
 * the console reads it, spec/console/state.md, and the mechanism is the lib's spec/kit/state.md.
 */
import { record } from '@canmi/kit/behavior/state';
import { places } from './place.ts';

/** What is true of the person. Pair it with `localStorage`. */
export const reader = record('state', []);

/** What is true of this sitting. Pair it with `sessionStorage`. */
export const tab = record('state', []);

/** Each path's place in the main area, kept in the sitting's record. */
export const kept = places(tab);
