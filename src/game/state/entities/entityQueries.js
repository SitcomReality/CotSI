/**
 * entityQueries.js — Low-level stateless accessors for champion, mob, trader lookups.
 * Depends only on map utilities (coordKey, parseKey, TERRAIN) and movementCosts.
 */
import { coordKey, parseKey } from '../../../engine/rules/hexGrid.js';
import { TERRAIN } from '../../rules/terrainTypes.js';
import { isTerrainBlocked } from '../../rules/movementCosts.js';

/**
 * A hex is considered "vacant" when it has no interactive features and no
 * entities. Used by mob/trader spawning and movement to ensure they only
 * occupy truly empty hexes.
 */
export function isVacant(state, key) {
  const tile = state.tiles[key];
  if (!tile || !TERRAIN[tile.terrain].passable) return false;
  if (tile.feature) return false;
  if (occupiedByChampion(state, key)) return false;
  if (occupiedByMob(state, key)) return false;
  if (occupiedByTrader(state, key)) return false;
  return true;
}

export function getChampion(state, id) {
  return state.champions.find(c => c.id === id);
}

export function occupiedByChampion(state, key) {
  const entry = state.spatialIndex?.get(key);
  if (entry?.type === 'champion' && !entry.entity.dungeon) return entry.entity;
  // Champions inside a dungeon are hidden — they occupy nothing on the map.
  return state.champions.find((c) => c.alive && !c.dungeon && coordKey(c.pos) === key);
}

export function occupiedByMob(state, key) {
  const entry = state.spatialIndex?.get(key);
  if (entry?.type === 'mob') return entry.entity;
  return state.mobs.find(m => m.alive && coordKey(m.pos) === key);
}

export function occupiedByTrader(state, key) {
  const entry = state.spatialIndex?.get(key);
  if (entry?.type === 'trader') return entry.entity;
  return state.traders.find(t => coordKey(t.pos) === key);
}

/**
 * A hex is blocked for an entity's movement when the terrain is impassable
 * for it (effective cost ∞ — dev/docs/movementAndOccupation.md §2) or the hex is
 * occupied by something that cannot be walked through (base feature, other
 * champion, mob, or trader). Occupancy rules are unchanged.
 * @param {object} state
 * @param {string} key
 * @param {object} entity — the moving champion
 */
export function isBlockedForMovement(state, key, entity) {
  const tile = state.tiles[key];
  if (!tile || isTerrainBlocked(entity, tile.terrain)) return true;
  if (tile.feature?.kind === 'base') return true;
  const champ = occupiedByChampion(state, key);
  if (champ && champ.id !== entity.id) return true;
  if (occupiedByMob(state, key)) return true;
  if (occupiedByTrader(state, key)) return true;
  return false;
}

/**
 * Whether a champion may enter a hex: terrain enterable (finite effective
 * cost) and unoccupied. Shared by pathfinding callers (bot AI, hexBridge).
 * @param {object} state
 * @param {string} key
 * @param {object} champ
 */
export function canChampionEnter(state, key, champ) {
  const tile = state.tiles[key];
  if (!tile || isTerrainBlocked(champ, tile.terrain)) return false;
  if (tile.feature?.kind === 'base') return false;
  const occ = occupiedByChampion(state, key);
  if (occ && occ.id !== champ.id) return false;
  if (occupiedByMob(state, key)) return false;
  if (occupiedByTrader(state, key)) return false;
  return true;
}