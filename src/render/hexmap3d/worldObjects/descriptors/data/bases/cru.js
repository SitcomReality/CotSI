/**
 * cru.js — CRU base variant: tower + cap + 6 leaning spikes.
 *
 * Composed from the shared building blocks (bases/shared.js). Saving CRU in
 * the geometry editor rewrites this file as a self-contained variant block.
 */
import { TOWER, CAP, spikes } from './shared.js';

export const CRU_VARIANT = {
  id: 'CRU',
  parts: [TOWER, CAP, ...spikes('spike', 6, 0.1, 0.28, 0.06, 0.1)],
};
