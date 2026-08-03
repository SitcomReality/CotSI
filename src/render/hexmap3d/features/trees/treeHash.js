// src/render/hexmap3d/features/trees/treeHash.js
// Deterministic per-tile / per-tree hashing — the source of all tree variation.
// Stable across chunk rebuilds: the same tile always produces the same trees.

import { TREE_VARIANT_HASH_SEEDS } from '../../../../params/render/geometryParams.js';

/** Tile hash from hex coords — the roll every per-tile tree decision starts from. */
export function tileHash(tile) {
  return ((tile.q * TREE_VARIANT_HASH_SEEDS[0] + tile.r * TREE_VARIANT_HASH_SEEDS[1]) * TREE_VARIANT_HASH_SEEDS[2]) % TREE_VARIANT_HASH_SEEDS[3];
}

/** Per-tree sub-hash derived from the tile hash — stable across chunk rebuilds. */
export function treeHash(tileH, i) {
  return (tileH * 17 + i * 29 + 5) % 89;
}

export function frac(h) {
  return (h % 100) / 100;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}
