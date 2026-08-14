/**
 * tileProxy.js — Backward-compatible state.tiles Proxy.
 *
 * Creates a Proxy that behaves like the old flat `state.tiles` map
 * but reads/writes through chunk storage transparently.
 */
import { getTile, setTile, deleteTile } from './tileAccess.js';
import { allTileKeys } from './tileIteration.js';

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
