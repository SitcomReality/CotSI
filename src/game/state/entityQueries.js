/**
 * entityQueries.js — Low-level stateless accessors for champion, mob, trader lookups.
 * Depends only on map utilities (coordKey, parseKey, TERRAIN).
 */
import { coordKey, parseKey } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from '../rules/terrainTypes.js';

export function getChampion(state, id) {
  return state.champions.find(c => c.id === id);
}

export function occupiedByChampion(state, key) {
  return state.champions.find(c => c.alive && coordKey(c.pos) === key);
}

export function occupiedByMob(state, key) {
  return state.mobs.find(m => m.alive && coordKey(m.pos) === key);
}

export function occupiedByTrader(state, key) {
  return state.traders.find(t => coordKey(t.pos) === key);
}

export function isBlockedForMovement(state, key, movingId) {
  const tile = state.tiles[key];
  if (!tile || !TERRAIN[tile.terrain].passable) return true;
  if (tile.feature?.kind === 'base') return true;
  const champ = occupiedByChampion(state, key);
  if (champ && champ.id !== movingId) return true;
  if (occupiedByMob(state, key)) return true;
  return false;
}