// src/render/hexmap3d/worldObjects/tileHash.js
// Deterministic per-tile / per-tree hashing — the source of all tile-driven
// variation. Shared by the descriptor
// pipeline (descriptors/recordBuilder.js). Stable across chunk rebuilds: the
// same tile always produces the same records.

import { TREE_VARIANT_HASH_SEEDS } from '../../../params/render/geometryParams.js';

/** Tile hash from hex coords — the roll every per-tile tree decision starts from. */
export function tileHash(tile) {
  return ((tile.q * TREE_VARIANT_HASH_SEEDS[0] + tile.r * TREE_VARIANT_HASH_SEEDS[1]) * TREE_VARIANT_HASH_SEEDS[2]) % TREE_VARIANT_HASH_SEEDS[3];
}

/** Per-tree sub-hash derived from the tile hash — stable across chunk rebuilds. */
export function treeHash(tileH, i) {
  return (tileH * 17 + i * 29 + 5) % 89;
}

/**
 * Per-item hash for cluster members — a well-mixed 32-bit hash of (tileH, i)
 * returning a uniform float in [0, 1).
 *
 * treeHash is a linear progression in i (step 29, mod 89): 3·29 ≡ −2 (mod 89),
 * so every third index nearly repeats and cluster members would pile into the
 * same 3 spots — same angle, distance, rotation, and size. itemHash mixes the
 * index in multiplicatively, so consecutive items are decorrelated and a
 * cluster spreads instead of clumping. Item 0 of a cluster keeps its legacy
 * treeHash draw (a lone object renders unchanged); members (i > 0) draw from
 * itemHash.
 */
export function itemHash(tileH, i) {
  let h = Math.imul(tileH + 1, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca77);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return (h >>> 0) / 0x100000000;
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
