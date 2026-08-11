/**
 * hol.js — HOL champion variant: body + head + pendant accent.
 *
 * Composed from the shared building blocks (champions/shared.js). Saving HOL
 * in the geometry editor rewrites this file as a self-contained variant block.
 */
import { BODY, HEAD, ACCENTS } from './shared.js';

export const HOL_VARIANT = {
  id: 'HOL',
  parts: [BODY, HEAD, ...ACCENTS.HOL],
};
