// src/render/hexmap3d/worldObjects/decorEmphasis.js
// Pure per-tile de-emphasis rules for hex decorations.
//
// A tile's center is the most prominent spot. When it is claimed by an
// occupant (champion/mob/trader) or a feature, lower-priority things are no
// longer removed — they are pushed aside instead, so the terrain still reads
// as decorated:
//
//   occupant > feature > terrain decoration
//
// The highest-priority thing on a tile stays at the hex center; everything
// below it is de-emphasized. This module is pure (no THREE, no game state) so
// the rules are unit-testable; mesh builders apply the returned transforms.
//
// De-emphasis modes:
//   dispersed — shrink and move outward (forest/deep-wood trees, reeds, grass,
//               displaced features). A single item always lands on the same
//               anchor: the upper-left corner of the hex, just inside the
//               edge, so the visual language is consistent across every
//               single-item case.
//   sunk      — shrink and descend below the tile surface (hill mounds, which
//               cannot spread out).
//   hidden    — not rendered at all (a decoration behind a feature + occupant).

import { hexCornersXZ, HEX_RADIUS } from '../hexWorldSpace.js';
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { DECOR_DEEMPHASIS } from '../../../params/render/geometryParams.js';

/** De-emphasis state labels. */
export const DECOR_STATE = Object.freeze({
  NORMAL: 'normal',
  DISPERSED: 'dispersed',
  SUNK: 'sunk',
  HIDDEN: 'hidden',
});

/** Terrain decoration kinds the rules know how to de-emphasize. One per
 *  decor-producing terrain (the decor's id IS the terrain's id), plus
 *  GENERIC for biome-override decor (a supernatural biome's replacement
 *  ground decor — spreads out like any ground decor). */
export const DECORATION = Object.freeze({
  FOREST: 'forest',     // forest terrain decor — round trees (spreads out)
  DEEP_WOOD: 'deepWood', // deepWood terrain decor — conical pines (spreads out)
  HILL: 'hill',         // raised mound on hill terrain (sinks)
  PLATEAU: 'plateau',   // flat-top mound on plateau terrain (sinks)
  MARSH: 'marsh',       // reed cluster on marsh (spreads out)
  PLAINS: 'plains',     // grass blades on plains (spreads out)
  DESERT: 'desert',     // scrub cluster on desert (spreads out)
  BEACH: 'beach',       // driftwood on beach (spreads out)
  GENERIC: 'generic',   // biome decor override (titanflesh, yetlands, ...) — spreads out
});

/** Decorations that sink below the surface instead of spreading out. */
const SUNK_DECORATIONS = new Set([DECORATION.HILL, DECORATION.PLATEAU]);

/** Scale multiplier applied to dispersed items (cluster and single alike). */
export const DISPERSED_SCALE = DECOR_DEEMPHASIS.scale;

/**
 * De-emphasis state for the terrain decoration on a tile, or null when the
 * tile has no decoration to de-emphasize.
 *
 * @param {object}   p
 * @param {boolean}  p.hasOccupant - champion/mob/trader on the tile
 * @param {boolean}  p.hasFeature  - feature on the tile
 * @param {string|null} p.decoration - one of DECORATION, or null
 * @returns {string|null} one of DECOR_STATE, or null
 */
export function decorState({ hasOccupant, hasFeature, decoration }) {
  if (!decoration) return null;
  if (hasOccupant && hasFeature) return DECOR_STATE.HIDDEN;
  if (hasOccupant || hasFeature) {
    return SUNK_DECORATIONS.has(decoration) ? DECOR_STATE.SUNK : DECOR_STATE.DISPERSED;
  }
  return DECOR_STATE.NORMAL;
}

/**
 * De-emphasis state for a feature: an occupant displaces it; otherwise it
 * stays central and prominent.
 */
export function featureState({ hasOccupant }) {
  return hasOccupant ? DECOR_STATE.DISPERSED : DECOR_STATE.NORMAL;
}

/**
 * Set of "q,r" hex keys currently occupied by a champion, mob, or trader.
 * Mesh builders precompute this once per build and pass it down, so the
 * per-tile lookups stay O(1).
 *
 * @param {object} state - Game state ({ champions, mobs, traders })
 * @returns {Set<string>}
 */
export function occupiedKeys(state) {
  const keys = new Set();
  const add = (list) => {
    for (const e of list || []) {
      // Champions inside a dungeon are hidden — they claim no hex center.
      if (e.dungeon) continue;
      keys.add(coordKey(e.pos));
    }
  };
  add(state.champions);
  add(state.mobs);
  add(state.traders);
  return keys;
}

/** Whether the occupant-key set contains the given tile's hex. */
export function isTileOccupied(occupants, tile) {
  return !!occupants && occupants.has(`${tile.q},${tile.r}`);
}

/**
 * Offset for a single dispersed item — the shared "moved aside" anchor.
 * Every single-item dispersal (one tree, one displaced feature) lands at the
 * same spot so the visual language is consistent: the upper-left corner of
 * the hex, just inside the edge.
 *
 * @param {number} [hexRadius=HEX_RADIUS]
 * @returns {{ dx: number, dz: number }} offset from the hex center
 */
export function dispersedSingleOffset(hexRadius = HEX_RADIUS) {
  const corner = hexCornersXZ(0, 0, hexRadius)[DECOR_DEEMPHASIS.singleCorner];
  const inset = DECOR_DEEMPHASIS.singleInset;
  return { dx: corner.x * inset, dz: corner.z * inset };
}

/**
 * Offsets for a dispersed multi-item group (a grove): items spread to a ring
 * near the hex edge, evenly spaced with deterministic jitter from `hash`.
 *
 * @param {number} count - number of items to place
 * @param {number} hash  - deterministic per-tile hash, stable across rebuilds
 * @param {number} [hexRadius=HEX_RADIUS]
 * @returns {{ dx: number, dz: number }[]} offsets from the hex center
 */
export function dispersedRingOffsets(count, hash, hexRadius = HEX_RADIUS) {
  const { ringMin, ringMax } = DECOR_DEEMPHASIS;
  const maxR = ringMax * hexRadius;
  const minR = ringMin * hexRadius;
  const offsets = [];
  for (let i = 0; i < count; i++) {
    const r = minR + (maxR - minR) * frac100(hash + i * 7 + 3);
    const angle = (i / count) * Math.PI * 2 + (frac100(hash * 5 + i * 11) - 0.5) * 0.6;
    offsets.push({ dx: Math.cos(angle) * r, dz: Math.sin(angle) * r });
  }
  return offsets;
}

/**
 * Transform for sunk decorations (hill mounds): shrink and descend below the
 * tile surface so the decoration reads as tucked away.
 *
 * @returns {{ scale: number, yOffset: number }}
 */
export function sunkTransform() {
  return {
    scale: DECOR_DEEMPHASIS.sinkScale,
    yOffset: -DECOR_DEEMPHASIS.sinkDepth,
  };
}

/** Deterministic [0, 1) fraction with a wide spread for small integer hashes. */
function frac100(h) {
  return (((h * 97) % 100) + 100) % 100 / 100;
}
