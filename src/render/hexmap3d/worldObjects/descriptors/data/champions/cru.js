/**
 * cru.js — CRU champion variant: body + head + top spike accent.
 *
 * Composed from the shared building blocks (champions/shared.js). Saving CRU
 * in the geometry editor rewrites this file as a self-contained variant block.
 */
import { BODY, HEAD, ACCENTS } from './shared.js';

export const CRU_VARIANT = {
  id: 'CRU',
  parts: [BODY, HEAD, ...ACCENTS.CRU],
};
