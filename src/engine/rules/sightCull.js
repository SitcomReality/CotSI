/**
 * sightCull.js — Hard render cap for geometry visibility.
 *
 * Pure hex math deciding which chunks/hexes may be rendered at all on
 * arbitrarily large maps. The cap is independent of actual champion sight
 * (base 2 + lens 1 → max 3): nothing beyond SIGHT_RENDER_CAP hexes of a
 * living human champion is ever built or drawn, explored or not. This bounds
 * both memory (chunk meshes) and per-frame overlay work to the small disc
 * around each champion, whatever the map radius.
 *
 * No human champions → spectator mode: the callers treat an empty cull set
 * as "no culling" and render everything.
 */
import { hexesWithinRadius, coordKey } from './hexGrid.js';
import { chunkKey, tileToChunk } from './chunkGrid.js';
import { SIGHT_RENDER_CAP } from '../../params/game/championParams.js';

// Offset hexes within the cap, computed once (pure, deterministic).
const CAP_OFFSETS = hexesWithinRadius(SIGHT_RENDER_CAP);

/**
 * Extract the positions of living human champions.
 * @param {{pos:{q:number,r:number}, controller:string, alive:boolean}[]} champions
 * @returns {{q:number,r:number}[]}
 */
export function humanChampionPositions(champions) {
  return champions
    .filter(c => c && c.controller === 'human' && c.alive)
    .map(c => c.pos);
}

/**
 * Hex keys ("q,r") within the render cap of any living human champion.
 * Empty when there are no living human champions.
 * @param {Object[]} champions - Game champions array
 * @returns {Set<string>}
 */
export function hexKeysWithinCap(champions) {
  const set = new Set();
  for (const o of humanChampionPositions(champions)) {
    for (const c of CAP_OFFSETS) {
      set.add(coordKey({ q: o.q + c.q, r: o.r + c.r }));
    }
  }
  return set;
}

/**
 * Chunk keys that intersect the render-cap discs around any living human
 * champion. Only these chunks may have meshes built. Empty when there are no
 * living human champions (caller then treats every chunk as renderable).
 * @param {Object[]} champions - Game champions array
 * @returns {Set<string>}
 */
export function chunkKeysWithinCap(champions) {
  const set = new Set();
  for (const o of humanChampionPositions(champions)) {
    for (const c of CAP_OFFSETS) {
      const { cq, cr } = tileToChunk(o.q + c.q, o.r + c.r);
      set.add(chunkKey(cq, cr));
    }
  }
  return set;
}
