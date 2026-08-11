/**
 * msk.js — MSK base variant: tower + cap + spire.
 *
 * Composed from the shared building blocks (bases/shared.js). Saving MSK in
 * the geometry editor rewrites this file as a self-contained variant block.
 */
import { TOWER, CAP, SPIRE } from './shared.js';

export const MSK_VARIANT = {
  id: 'MSK',
  parts: [TOWER, CAP, SPIRE],
};
