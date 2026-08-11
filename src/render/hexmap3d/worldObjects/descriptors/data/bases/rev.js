/**
 * rev.js — REV base variant: tower + cap + flat ring.
 *
 * Composed from the shared building blocks (bases/shared.js). Saving REV in
 * the geometry editor rewrites this file as a self-contained variant block.
 */
import { TOWER, CAP, RING } from './shared.js';

export const REV_VARIANT = {
  id: 'REV',
  parts: [TOWER, CAP, RING],
};
