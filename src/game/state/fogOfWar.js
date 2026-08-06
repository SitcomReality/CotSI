/**
 * fogOfWar.js — Sight, fog-of-war, human view aggregation.
 * Depends on champion data shape and map geometry (distance, parseKey).
 */
import { hexesWithinRadius, coordKey, parseKey } from '../../engine/rules/hexGrid.js';
import { rotatedPoint } from '../../engine/rules/hexProjection.js';
import { ARTIFACT_SIGHT_BONUS } from '../../params/game/championParams.js';

export function visibleKeysFor(state, champ) {
  const sight = champ.sight + (champ.artifact === 'lens' ? ARTIFACT_SIGHT_BONUS : 0);
  return hexesWithinRadius(sight)
    .map(c => coordKey({ q: c.q + champ.pos.q, r: c.r + champ.pos.r }))
    .filter(k => k in state.tiles);
}

/**
 * Grow a rotated-space bounds rect to include a hex. Returns a fresh rect.
 * The rotation matches the minimap projection (hexProjection.js), so the
 * bounds are directly usable as the minimap's fit extent.
 */
function growBounds(bounds, q, r) {
  const { x, z } = rotatedPoint(q, r);
  if (!bounds) return { minX: x, maxX: x, minZ: z, maxZ: z };
  return {
    minX: Math.min(bounds.minX, x),
    maxX: Math.max(bounds.maxX, x),
    minZ: Math.min(bounds.minZ, z),
    maxZ: Math.max(bounds.maxZ, z),
  };
}

/**
 * Union of the living human champions' explored hexes, plus exact
 * rotated-space bounds. Only human exploration counts — bot exploration must
 * not leak into the human minimap or fog view.
 */
function collectExplored(state) {
  const set = new Set();
  let bounds = null;
  for (const c of state.champions) {
    if (c.controller !== 'human') continue;
    for (const k of c.explored || []) {
      if (set.has(k)) continue;
      set.add(k);
      const p = parseKey(k);
      bounds = growBounds(bounds, p.q, p.r);
    }
  }
  return { set, bounds };
}

/**
 * Rebuild the cached explored set/bounds from the champions' explored arrays.
 * Needed when explored state changes outside refreshVision (dev cheats).
 */
export function rebuildExploredCache(state) {
  const { set, bounds } = collectExplored(state);
  state._exploredSet = set;
  state._exploredBounds = bounds;
}

export function refreshVision(state) {
  // Seed the shared explored cache once (champions may carry pre-explored
  // history); afterwards it grows incrementally so getHumanView stays
  // O(newly visible), never O(explored) per refresh.
  let exploredSet = state._exploredSet;
  let bounds = state._exploredBounds;
  if (!exploredSet) {
    const collected = collectExplored(state);
    exploredSet = collected.set;
    bounds = collected.bounds;
    state._exploredSet = exploredSet;
    state._exploredBounds = bounds;
  }
  for (const c of state.champions) {
    if (!c.alive) continue;
    const vis = visibleKeysFor(state, c);
    c.visible = vis;
    c.explored = Array.from(new Set([...(c.explored || []), ...vis]));
    if (c.controller === 'human') {
      for (const k of vis) {
        if (exploredSet.has(k)) continue;
        exploredSet.add(k);
        const p = parseKey(k);
        bounds = growBounds(bounds, p.q, p.r);
      }
    }
  }
  state._exploredSet = exploredSet;
  state._exploredBounds = bounds;
  // Bump revision counters so caches (fog masks, minimap terrain) know to redraw
  state._fogRevision = (state._fogRevision || 0) + 1;
  state._minimapRevision = (state._minimapRevision || 0) + 1;
}

export function getHumanView(state) {
  const humans = state.champions.filter(c => c.controller === 'human' && c.alive);
  // No human players → permanently revealed map, no fog of war. Built per call
  // so lazily generated chunks stay revealed (end-of-game state, not a hot path).
  if (humans.length === 0) {
    const keys = Object.keys(state.tiles);
    return {
      visible: new Set(keys),
      explored: new Set(keys),
      exploredBounds: null,
    };
  }
  // The explored set is cached on state and maintained incrementally by
  // refreshVision; fall back to unioning the arrays when the cache is absent
  // (e.g. fixtures that never ran refreshVision).
  const cached = state._exploredSet;
  const explored = cached && cached.size > 0
    ? cached
    : new Set(humans.flatMap(c => c.explored || []));
  return {
    visible: new Set(humans.flatMap(c => c.visible || [])),
    explored,
    exploredBounds: state._exploredBounds || null,
  };
}