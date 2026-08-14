/**
 * terrainOverrides.js — Per-biome terrain supersede.
 *
 * Supernatural biomes replace the underlying terrain's presentation (and
 * movement cost) so entering one reads as a distinct, disruptive region.
 * A biome declares `terrainOverrides: { [terrainKey]: { name, movementCost? } }`
 * on its archetype; these helpers resolve the effective values.
 *
 * Pure rules — no state, no mutation.
 */
import { TERRAIN } from './terrainTypes.js';
import { getArchetype } from './archetypes.js';

/**
 * The terrain override a biome declares for a terrain, or null.
 * @param {string|null} biomeId — tile's biomeId (null/undefined = no override)
 * @param {string} terrain — a TERRAIN key
 * @returns {{ name?: string, movementCost?: number }|null}
 */
export function terrainOverride(biomeId, terrain) {
  if (!biomeId) return null;
  const def = getArchetype(biomeId);
  return def?.terrainOverrides?.[terrain] ?? null;
}

/**
 * Effective display name for a terrain under a biome: the biome's override
 * name, else the global terrain label.
 * @param {string|null} biomeId
 * @param {string} terrain
 * @returns {string}
 */
export function terrainDisplayName(biomeId, terrain) {
  return terrainOverride(biomeId, terrain)?.name ?? TERRAIN[terrain]?.label ?? terrain;
}
