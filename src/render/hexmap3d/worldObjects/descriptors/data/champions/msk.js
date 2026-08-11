/**
 * msk.js — MSK champion variant: body + head + gem accent.
 *
 * Composed from the shared building blocks (champions/shared.js). Saving MSK
 * in the geometry editor rewrites this file as a self-contained variant block.
 */
import { BODY, HEAD, ACCENTS } from './shared.js';

export const MSK_VARIANT = {
  id: 'MSK',
  parts: [BODY, HEAD, ...ACCENTS.MSK],
};
