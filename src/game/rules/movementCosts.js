/**
 * movementCosts.js — Effective per-entity terrain movement costs.
 *
 * Single source of truth for terrain movement costs (dev/docs/movementAndOccupation.md
 * §2): passability is unified into cost — a hex is enterable iff the effective
 * cost is finite. Pure rules: no state access, no mutation.
 *
 *   effectiveCost(entity, terrain) = entity overrides ?? TERRAIN base
 *
 * Override sources:
 *   - champion → `terrainCosts` on the faction entry (factionData.js)
 *   - mob      → `terrainCosts` on the mob archetype (archetypeData/mobs.js),
 *                resolved through the mob entity's `archetypeId`
 *   - trader / unknown → base ladder only
 *
 * Every cost in the ladder is a divisor of 60 (the daily AP pool), so all
 * spending is exact and division stays clean.
 */

import { TERRAIN } from './terrainTypes.js';
import { FACTIONS } from './factionData.js';
import { getArchetype } from './archetypes.js';

/**
 * Sparse per-entity terrain-cost overrides, or null when the entity has none.
 * @param {object|null} entity — champion / mob / trader entity (null → base only)
 * @returns {object|null} sparse map of terrain → cost
 */
export function terrainCostOverrides(entity) {
  if (!entity) return null;
  if (entity.controller) {
    // Champion (humans and bots both carry `controller`).
    return FACTIONS[entity.faction]?.terrainCosts ?? null;
  }
  if (entity.archetypeId) {
    // Mob — resolved from the archetype registry.
    return getArchetype(entity.archetypeId)?.terrainCosts ?? null;
  }
  return null;
}

/**
 * Effective AP cost for an entity stepping onto a terrain. Infinity = blocked.
 * @param {object|null} entity
 * @param {string} terrain — a TERRAIN key
 * @returns {number}
 */
export function terrainCost(entity, terrain) {
  const base = TERRAIN[terrain]?.movementCost ?? Infinity;
  const overrides = terrainCostOverrides(entity);
  return overrides?.[terrain] ?? base;
}

/**
 * Whether a terrain is impassable for the entity (effective cost is ∞).
 * @param {object|null} entity
 * @param {string} terrain
 * @returns {boolean}
 */
export function isTerrainBlocked(entity, terrain) {
  return !Number.isFinite(terrainCost(entity, terrain));
}
