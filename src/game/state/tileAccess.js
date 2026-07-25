/**
 * tileAccess.js — Chunk-aware tile accessors and the state.tiles Proxy.
 *
 * Provides the bridge between the chunked storage (state.chunks) and the
 * flat-access API that all existing consumers use via state.tiles[key].
 *
 * The Proxy on state.tiles intercepts get/set/has/ownKeys to delegate to
 * chunk storage transparently.
 */
import {
  tileToChunk, chunkKey, localCoord, localKey, globalCoord,
} from '../../engine/rules/chunkGrid.js';
import { coordKey } from '../../engine/rules/hexGrid.js';

// ---------------------------------------------------------------------------
// Low-level chunk access
// ---------------------------------------------------------------------------

/**
 * Look up a tile by global coordinates.
 * @param {object} state  - Game state with state.chunks Map
 * @param {number} q      - Global q coordinate
 * @param {number} r      - Global r coordinate
 * @returns {object|undefined}
 */
export function getTile(state, q, r) {
  const { cq, cr } = tileToChunk(q, r);
  const chunk = state.chunks.get(chunkKey(cq, cr));
  if (!chunk) return undefined;
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
    chunk = { tiles: new Map(), dirty: true, generated: true };
    state.chunks.set(ck, chunk);
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

// ---------------------------------------------------------------------------
// Proxy — backward-compatible state.tiles access
// ---------------------------------------------------------------------------

/**
 * Create a Proxy object that behaves like the old flat `state.tiles` map
 * but reads/writes through chunk storage.
 *
 * Supported operations:
 *   state.tiles["q,r"]       → getTile(state, q, r)
 *   state.tiles["q,r"] = val → setTile(state, q, r, val)
 *   "q,r" in state.tiles     → has (needed by fogOfWar.js and others)
 *   Object.keys(state.tiles)  → allTileKeys(state) (via ownKeys trap)
 *   Object.values(...)        → via ownKeys + GPD
 *   Object.entries(...)       → via ownKeys + GPD
 *   delete state.tiles["q,r"] → deleteTile(state, q, r)
 *
 * @param {object} state - Game state with state.chunks
 * @returns {Proxy}
 */
export function createTileProxy(state) {
  return new Proxy({}, {
    get(_target, key) {
      // Handle Symbol properties (e.g. Symbol.toStringTag, Symbol.iterator)
      if (typeof key === 'symbol') return undefined;
      // Handle non-coordinate keys (e.g. .length — not supported on proxy)
      if (typeof key !== 'string' || !key.includes(',')) return undefined;
      const [q, r] = key.split(',').map(Number);
      if (isNaN(q) || isNaN(r)) return undefined;
      return getTile(state, q, r);
    },

    set(_target, key, value) {
      if (typeof key !== 'string' || !key.includes(',')) return false;
      const [q, r] = key.split(',').map(Number);
      if (isNaN(q) || isNaN(r)) return false;
      setTile(state, q, r, value);
      return true;
    },

    has(_target, key) {
      if (typeof key !== 'string' || !key.includes(',')) return false;
      const [q, r] = key.split(',').map(Number);
      if (isNaN(q) || isNaN(r)) return false;
      return getTile(state, q, r) !== undefined;
    },

    ownKeys(_target) {
      return [...allTileKeys(state)];
    },

    getOwnPropertyDescriptor(_target, key) {
      if (typeof key !== 'string' || !key.includes(',')) {
        return undefined;
      }
      const [q, r] = key.split(',').map(Number);
      if (isNaN(q) || isNaN(r)) return undefined;
      const tile = getTile(state, q, r);
      if (tile) {
        return {
          configurable: true,
          enumerable: true,
          value: tile,
        };
      }
      return undefined;
    },

    deleteProperty(_target, key) {
      if (typeof key !== 'string' || !key.includes(',')) return false;
      const [q, r] = key.split(',').map(Number);
      if (isNaN(q) || isNaN(r)) return false;
      deleteTile(state, q, r);
      return true;
    },
  });
}
