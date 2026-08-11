/**
 * arc.js — ARC champion variant: body + head + orb accent.
 *
 * Composed from the shared building blocks (champions/shared.js). Saving ARC
 * in the geometry editor rewrites this file as a self-contained variant block.
 */
import { BODY, HEAD, ACCENTS } from './shared.js';

export const ARC_VARIANT = {
  id: 'ARC',
  parts: [BODY, HEAD, ...ACCENTS.ARC],
};
