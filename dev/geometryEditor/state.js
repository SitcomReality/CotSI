/**
 * state.js — Shared mutable state for the geometry editor page.
 *
 * Other modules import `S` and read/write its properties directly.
 * No local project imports — a true leaf module.
 */

export const S = {
  /** Currently selected, normalized descriptor (schema.js), or null */
  descriptor: null,

  /** Tile hash — drives all per-tile variation (cluster count, size, scatter) */
  tileH: 1,

  /** Whether the hex center is claimed by an occupant (displacement demo) */
  displaced: false,

  /** Part id currently selected in the parts list, or null */
  selectedPartId: null,
};
