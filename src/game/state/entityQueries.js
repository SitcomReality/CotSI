/**
 * entityQueries.js — Low-level stateless accessors for champion, mob, trader lookups.
 * Depends only on map utilities (coordKey, parseKey, TERRAIN).
 */
import { coordKey, parseKey } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from '../rules/terrainTypes.js';

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
  if (entry?.type === 'champion') return entry.entity;
  return state.champions.find(c => c.alive && coordKey(c.pos) === key);
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

export function isBlockedForMovement(state, key, movingId) {
  const tile = state.tiles[key];
  if (!tile || !TERRAIN[tile.terrain].passable) return true;
  if (tile.feature?.kind === 'base') return true;
  const champ = occupiedByChampion(state, key);
  if (champ && champ.id !== movingId) return true;
  if (occupiedByMob(state, key)) return true;
  if (occupiedByTrader(state, key)) return true;
  return false;
}