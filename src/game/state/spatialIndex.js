/**
 * spatialIndex.js — Entity-by-hex spatial index for O(1) occupancy lookups.
 * Maps "q,r" keys to { type, entity } records. Must be rebuilt on entity
 * spawn and updated on entity move / death.
 */
import { coordKey } from '../../engine/rules/hexGrid.js';

export function rebuildSpatialIndex(state) {
  const idx = new Map();
  for (const c of state.champions) {
    if (c.alive) idx.set(coordKey(c.pos), { type: 'champion', entity: c });
  }
  for (const m of state.mobs) {
    if (m.alive) idx.set(coordKey(m.pos), { type: 'mob', entity: m });
  }
  for (const t of state.traders) {
    idx.set(coordKey(t.pos), { type: 'trader', entity: t });
  }
  state.spatialIndex = idx;
}

export function updateSpatialIndex(state, oldKey, newKey, entity, type) {
  if (oldKey) state.spatialIndex.delete(oldKey);
  if (newKey) state.spatialIndex.set(newKey, { type, entity });
}

export function removeFromSpatialIndex(state, key) {
  state.spatialIndex.delete(key);
}
