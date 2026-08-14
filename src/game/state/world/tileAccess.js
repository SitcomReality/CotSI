/**
 * tileAccess.js — Chunk-aware tile CRUD accessors.
 *
 * Low-level operations to get, set, and delete individual tiles
 * from the chunked storage (state.chunks).
 */
import { tileToChunk, chunkKey, localCoord, localKey } from '../../../engine/rules/chunkGrid.js';
import { ensureChunkForTile } from './chunkManager.js';

// ---------------------------------------------------------------------------
// Low-level chunk access
// ---------------------------------------------------------------------------

/**
 * Look up a tile by global coordinates.
 * Lazily generates the containing chunk from the seed when an in-map tile is
 * read before its chunk exists (generation on demand). Out-of-map tiles
 * return undefined and never generate.
 * @param {object} state  - Game state with state.chunks Map
 * @param {number} q      - Global q coordinate
 * @param {number} r      - Global r coordinate
 * @returns {object|undefined}
 */
export function getTile(state, q, r) {
  const { cq, cr } = tileToChunk(q, r);
  const ck = chunkKey(cq, cr);
  let chunk = state.chunks.get(ck);
  if (!chunk) {
    chunk = ensureChunkForTile(state, q, r);
    if (!chunk) return undefined;
  }
  const { lq, lr } = localCoord(cq, cr, q, r);
  return chunk.tiles.get(localKey(lq, lr));
}

/**
 * Set or update a tile. Marks the chunk as dirty.
 * @param {object} state
 * @param {number} q
 * @param {number} r
 * @param {object} tileData
 */
export function setTile(state, q, r, tileData) {
  const { cq, cr } = tileToChunk(q, r);
  const ck = chunkKey(cq, cr);
  let chunk = state.chunks.get(ck);
  if (!chunk) {
    // Materialize the full base chunk first so a chunk is never left
    // partially generated (a lone modified tile over a missing base).
    chunk = ensureChunkForTile(state, q, r);
    if (!chunk) {
      chunk = { tiles: new Map(), dirty: true, generated: true };
      state.chunks.set(ck, chunk);
    }
  }
  const { lq, lr } = localCoord(cq, cr, q, r);
  chunk.tiles.set(localKey(lq, lr), tileData);
  chunk.dirty = true;
}

/**
 * Delete a tile from its chunk. Marks the chunk as dirty.
 * @param {object} state
 * @param {number} q
 * @param {number} r
 */
export function deleteTile(state, q, r) {
  const { cq, cr } = tileToChunk(q, r);
  const ck = chunkKey(cq, cr);
  const chunk = state.chunks.get(ck);
  if (!chunk) return;
  const { lq, lr } = localCoord(cq, cr, q, r);
  chunk.tiles.delete(localKey(lq, lr));
  chunk.dirty = true;
}
