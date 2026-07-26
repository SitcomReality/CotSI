/**
 * fogOfWar.js — Sight, fog-of-war, human view aggregation.
 * Depends on champion data shape and map geometry (distance, parseKey).
 */
import { hexesWithinRadius, coordKey } from '../../engine/rules/hexGrid.js';
import { ARTIFACT_SIGHT_BONUS } from '../../params/game/championParams.js';

export function visibleKeysFor(state, champ) {
  const sight = champ.sight + (champ.artifact === 'lens' ? ARTIFACT_SIGHT_BONUS : 0);
  return hexesWithinRadius(sight)
    .map(c => coordKey({ q: c.q + champ.pos.q, r: c.r + champ.pos.r }))
    .filter(k => k in state.tiles);
}

export function refreshVision(state) {
  for (const c of state.champions) {
    if (!c.alive) continue;
    const vis = visibleKeysFor(state, c);
    c.visible = vis;
    c.explored = Array.from(new Set([...(c.explored || []), ...vis]));
  }
  // Bump revision counters so caches (fog masks, minimap terrain) know to redraw
  state._fogRevision = (state._fogRevision || 0) + 1;
  state._minimapRevision = (state._minimapRevision || 0) + 1;
}

export function getHumanView(state) {
  const humans = state.champions.filter(c => c.controller === 'human' && c.alive);
  // No human players → permanently revealed map, no fog of war.
  if (humans.length === 0) {
    return {
      visible: new Set(Object.keys(state.tiles)),
      explored: new Set(Object.keys(state.tiles)),
    };
  }
  return {
    visible: new Set(humans.flatMap(c => c.visible || [])),
    explored: new Set(humans.flatMap(c => c.explored || [])),
  };
}