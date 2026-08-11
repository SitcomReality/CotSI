/**
 * rev.js — REV champion variant: body + head + halo ring accent.
 *
 * Composed from the shared building blocks (champions/shared.js). Saving REV
 * in the geometry editor rewrites this file as a self-contained variant block.
 */
import { BODY, HEAD, ACCENTS } from './shared.js';

export const REV_VARIANT = {
  id: 'REV',
  parts: [BODY, HEAD, ...ACCENTS.REV],
};
