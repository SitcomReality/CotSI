/**
 * ver.js — VER champion variant: body + head + leaf accent.
 *
 * Composed from the shared building blocks (champions/shared.js). Saving VER
 * in the geometry editor rewrites this file as a self-contained variant block.
 */
import { BODY, HEAD, ACCENTS } from './shared.js';

export const VER_VARIANT = {
  id: 'VER',
  parts: [BODY, HEAD, ...ACCENTS.VER],
};
