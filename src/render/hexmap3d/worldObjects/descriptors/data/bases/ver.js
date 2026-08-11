/**
 * ver.js — VER base variant: tower + cap + 8 leaning crown spikes.
 *
 * Composed from the shared building blocks (bases/shared.js). Saving VER in
 * the geometry editor rewrites this file as a self-contained variant block.
 */
import { TOWER, CAP, spikes } from './shared.js';

export const VER_VARIANT = {
  id: 'VER',
  parts: [TOWER, CAP, ...spikes('crown', 8, 0.76, 0.28, 0.04, 0.08)],
};
