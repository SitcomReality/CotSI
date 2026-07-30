/**
 * tileIteration.js — Iteration helpers for chunked tile storage.
 *
 * Generator-based and callback-based iteration over all tiles
 * across all chunks, and a tile-count utility.
 */
import { coordKey } from '../../engine/rules/hexGrid.js';
import { getTile } from './tileAccess.js';

// ---------------------------------------------------------------------------
// Iteration helpers
// ---------------------------------------------------------------------------

/**
 * Generate all "q,r" keys across all chunks.
 * Uses a generator for memory efficiency — callers can iterate
 * without building the full array unless they spread it.
 */
export function* allTileKeys(state) {
  for (const [, chunk] of state.chunks) {
    for (const [lk, tile] of chunk.tiles) {
      yield coordKey(tile);
    }
  }
}

/**
 * Iterate all tiles with a callback.
 * @param {object} state
 * @param {function} fn - Called as fn(tile, key) for each tile
 */
export function forEachTile(state, fn) {
  for (const key of allTileKeys(state)) {
    const [q, r] = key.split(',').map(Number);
    fn(getTile(state, q, r), key);
  }
}

/**
 * Return the total number of tiles across all chunks.
 * @param {object} state
 * @returns {number}
 */
export function tileCount(state) {
  let n = 0;
  for (const [, chunk] of state.chunks) {
    n += chunk.tiles.size;
  }
  return n;
}
