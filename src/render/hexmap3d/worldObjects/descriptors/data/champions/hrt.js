/**
 * hrt.js — HRT champion variant: body + head + cap accent.
 *
 * Composed from the shared building blocks (champions/shared.js). Saving HRT
 * in the geometry editor rewrites this file as a self-contained variant block.
 */
import { BODY, HEAD, ACCENTS } from './shared.js';

export const HRT_VARIANT = {
  id: 'HRT',
  parts: [BODY, HEAD, ...ACCENTS.HRT],
};
