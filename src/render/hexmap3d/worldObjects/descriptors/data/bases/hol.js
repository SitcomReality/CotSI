/**
 * hol.js — HOL base variant: tower + cap + inverted hanging spike.
 *
 * Composed from the shared building blocks (bases/shared.js). Saving HOL in
 * the geometry editor rewrites this file as a self-contained variant block.
 */
import { TOWER, CAP, HANG_SPIKE } from './shared.js';

export const HOL_VARIANT = {
  id: 'HOL',
  parts: [TOWER, CAP, HANG_SPIKE],
};
