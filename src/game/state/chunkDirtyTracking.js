/**
 * chunkDirtyTracking.js — Dirty-chunk tracking for tile storage.
 *
 * Tracks which chunks have been modified and need re-rendering.
 * Used by the render layer to skip unmodified chunks.
 */
import { tileToChunk, chunkKey } from '../../engine/rules/chunkGrid.js';

// ---------------------------------------------------------------------------
// Dirty tracking helpers
// ---------------------------------------------------------------------------

/**
 * Mark the chunk containing a given tile as dirty.
 * @param {object} state
 * @param {number} q
 * @param {number} r
 */
export function markChunkDirty(state, q, r) {
  const { cq, cr } = tileToChunk(q, r);
  const ck = chunkKey(cq, cr);
  const chunk = state.chunks.get(ck);
  if (chunk) chunk.dirty = true;
}

/**
 * Clear dirty flags on all chunks.
 * @param {object} state
 */
export function clearDirtyFlags(state) {
  for (const [, chunk] of state.chunks) {
    chunk.dirty = false;
  }
}

/**
 * Return an array of chunk keys where dirty === true.
 * @param {object} state
 * @returns {string[]}
 */
export function getDirtyChunks(state) {
  const dirty = [];
  for (const [ck, chunk] of state.chunks) {
    if (chunk.dirty) dirty.push(ck);
  }
  return dirty;
}
