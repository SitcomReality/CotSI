/**
 * arc.js — ARC base variant: tower + cap + 4 satellite dots.
 *
 * Composed from the shared building blocks (bases/shared.js). Saving ARC in
 * the geometry editor rewrites this file as a self-contained variant block.
 */
import { TOWER, CAP, dots } from './shared.js';

export const ARC_VARIANT = {
  id: 'ARC',
  parts: [TOWER, CAP, ...dots('dot', 4, 0.52, 0.32)],
};
