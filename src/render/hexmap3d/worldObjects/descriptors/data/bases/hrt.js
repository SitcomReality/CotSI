/**
 * hrt.js — HRT base variant: tower + cap + dome.
 *
 * Composed from the shared building blocks (bases/shared.js). Saving HRT in
 * the geometry editor rewrites this file as a self-contained variant block.
 */
import { TOWER, CAP, DOME } from './shared.js';

export const HRT_VARIANT = {
  id: 'HRT',
  parts: [TOWER, CAP, DOME],
};
