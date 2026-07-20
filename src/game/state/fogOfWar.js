/**
 * fogOfWar.js — Sight, fog-of-war, human view aggregation.
 * Depends on champion data shape and map geometry (distance, parseKey).
 */
import { distance, parseKey } from '../../engine/rules/hexGrid.js';

export function visibleKeysFor(state, champ) {
  const sight = champ.sight + (champ.artifact === 'lens' ? 1 : 0);
  return Object.keys(state.tiles).filter(k => distance(champ.pos, parseKey(k)) <= sight);
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
  return {
    visible: new Set(humans.flatMap(c => c.visible || [])),
    explored: new Set(humans.flatMap(c => c.explored || [])),
  };
}