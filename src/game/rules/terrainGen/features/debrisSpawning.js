// src/game/rules/terrainGen/features/debrisSpawning.js
// Debris kind selection for environmental scatter (grass tufts, rocks, flowers,
// bones, crystals, mushrooms, logs). Pure and deterministic: given the tile and
// a kind roll in [0, 1), the same input always yields the same kind.

import { TERRAIN } from '../../terrainTypes.js';

/**
 * Terrain-based debris kind pools, used when the biome archetype has no
 * explicit `debris` override. Keeping desert/bone, marsh/shroom, etc. separate
 * from the base green tuft/rock/flower trio makes biome scatter read correctly
 * (desert tiles no longer sprout grass tufts).
 *
 * Only passable terrains appear here — impassable tiles (mountain, peak, water,
 * ice, floatingIsland) never spawn debris.
 */
const TERRAIN_DEBRIS_POOLS = {
  desert:       ['bone', 'rock', 'tuft'],
  beach:        ['bone', 'rock', 'tuft'],
  marsh:        ['shroom', 'tuft', 'flower'],
  forest:       ['tuft', 'flower', 'rock', 'log'],
  denseForest:  ['tuft', 'flower', 'rock', 'log'],
  plains:       ['tuft', 'flower', 'rock'],
  hill:         ['tuft', 'flower', 'rock'],
};

/** Fallback for terrains without an explicit pool. */
const DEFAULT_DEBRIS_POOL = ['tuft', 'flower', 'rock'];

/**
 * Select the debris kind for a passable tile, or null when the tile shouldn't
 * carry debris (impassable, or already hosts a feature).
 *
 * Biome archetypes may define `debris: [...]` (ordered kind preference list)
 * to override the terrain-based pools — e.g. Edenfall grows crystals instead
 * of grass. The spawn/density gates (rock probability, DEBRIS_SPAWN_THRESHOLD)
 * stay in the caller so existing determinism is preserved.
 *
 * @param {object}  tile      - Tile with `terrain`, and optionally `feature`
 * @param {object}  [biomeDef]- Biome archetype def (may carry `debris` array)
 * @param {number}  kindRoll  - Deterministic roll in [0, 1) selecting the kind
 * @returns {string|null} Debris kind string, or null
 */
export function selectDebrisKind(tile, biomeDef, kindRoll) {
  if (!tile || !TERRAIN[tile.terrain]?.passable) return null;
  if (tile.feature) return null;

  const pool = biomeDef?.debris?.length
    ? biomeDef.debris
    : (TERRAIN_DEBRIS_POOLS[tile.terrain] || DEFAULT_DEBRIS_POOL);

  const index = Math.min(pool.length - 1, Math.floor(kindRoll * pool.length));
  return pool[index] ?? null;
}
