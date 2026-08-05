import { coordKey, neighbors } from '../../../../engine/rules/hexGrid.js';
import { WATER_LAND_GAP, RIVER_BED_DEPTH } from '../../../../params/game/worldParams.js';
import { TERRAIN } from '../../terrainTypes.js';

/**
 * waterRules.js — Post-classification invariants for water terrain.
 *
 * Enforces the water system's height rules on the assembled tile map:
 *   1. Water is always lower than any adjacent land.
 *   2. Every water hex in a stationary (non-river) body sits at the same height.
 *
 * Rivers (isRiver tiles) are exempt from both rules — they are flowing water,
 * carved into recessed channels by carveRiverBeds() so they read as beds that
 * descend toward the water body they empty into.
 *
 * Layer: game/rules/terrainGen — pure data transforms, deterministic per input.
 */

/**
 * Whether a tile is water terrain (lakes, ocean, river-water tiles).
 * Ice is a frozen surface, not water — treated as land by these rules.
 */
function isWater(tile) {
  return tile && tile.terrain === 'water';
}

/**
 * Rule 2: flatten every stationary water body, then Rule 1: raise any land
 * that sits at or below the water level of an adjacent water tile.
 *
 * - Stationary bodies are maximal connected components of water tiles that are
 *   NOT rivers. Each component converges to the lowest current elevation in it,
 *   so a highland lake and the ocean may sit at different (physical) levels,
 *   but a body never has two heights.
 * - River tiles (isRiver) are skipped by the flood-fill (flowing water may vary)
 *   but still act as water for the lower-than-land check.
 * - Only the display `tile.elevation` is touched; `elevationField` (the
 *   continuous [0,1] field) is left untouched.
 *
 * @param {object} tiles - Flat tile map keyed by "q,r"
 */
export function enforceWaterRules(tiles) {
  const keys = Object.keys(tiles);
  if (keys.length === 0) return;

  // ── Rule 2: uniform height per stationary component ──
  const visited = new Set();
  for (const key of keys) {
    const tile = tiles[key];
    if (!isWater(tile) || tile.isRiver || visited.has(key)) continue;

    // BFS the stationary component (river water tiles break adjacency here —
    // a river between two lakes keeps them separate bodies).
    const component = [];
    const queue = [key];
    visited.add(key);
    let minElev = tile.elevation;

    while (queue.length > 0) {
      const ck = queue.shift();
      const cur = tiles[ck];
      component.push(cur);
      if (cur.elevation < minElev) minElev = cur.elevation;

      for (const n of neighbors({ q: cur.q, r: cur.r })) {
        const nk = coordKey(n);
        if (visited.has(nk)) continue;
        const nb = tiles[nk];
        if (isWater(nb) && !nb.isRiver) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }

    for (const member of component) {
      member.elevation = minElev;
    }
  }

  // ── Rule 1: water lower than adjacent land ──
  // River tiles are exempt: they are the flow path, carved by carveRiverBeds().
  for (const key of keys) {
    const tile = tiles[key];
    if (!isWater(tile)) continue;
    const waterElev = tile.elevation;

    for (const n of neighbors({ q: tile.q, r: tile.r })) {
      const nb = tiles[coordKey(n)];
      if (!nb || isWater(nb) || nb.isRiver) continue;
      if (nb.elevation <= waterElev + WATER_LAND_GAP) {
        nb.elevation = waterElev + WATER_LAND_GAP;
      }
    }
  }
}

/**
 * Carve river paths into recessed channels below their banks.
 *
 * traceRiver() returns each path as an ordered list source → mouth; the mouth
 * tile is usually a water tile (the river empties there). Rivers descend
 * monotonically toward the mouth and sit at least RIVER_BED_DEPTH below the
 * minimum adjacent bank, so they read as channels rather than flat stripes.
 *
 * Constraints, applied walking the path backwards from the mouth:
 * - Water-terrain tiles on the path are not carved — they already sit at the
 *   enforced water level and simply set the terminal level for the channel.
 * - Impassable tiles (mountain, peak, floatingIsland) are not carved either —
 *   rivers are surface features of walkable terrain; hard rock and floating
 *   isles keep their elevation (the river overlay still marks the path).
 * - Each carved tile's elevation = max(downstream carved elevation,
 *   minBankElev - RIVER_BED_DEPTH): carved to its bank depth, but never lower
 *   than the tile downstream of it, so the channel descends (or stays level)
 *   toward the mouth instead of pooling at the mouth's level.
 * - Clamped to never go below the minimum elevation of any adjacent water tile
 *   (a channel must not dig under a neighbouring lake it is not the outlet of).
 *
 * Only `tile.elevation` is modified; terrain, isRiver flags, and fields are
 * left as-is. Deterministic and idempotent for identical paths.
 *
 * @param {object}      tiles      - Flat tile map keyed by "q,r"
 * @param {Array<{q,r}[]>} riverPaths - Ordered river paths from traceRiver
 */
export function carveRiverBeds(tiles, riverPaths) {
  for (const path of riverPaths) {
    let downstreamElev = null;

    for (let i = path.length - 1; i >= 0; i--) {
      const tile = tiles[coordKey(path[i])];
      if (!tile) continue;

      // Water tiles on the path set the level; they are never carved.
      if (isWater(tile)) {
        downstreamElev = tile.elevation;
        continue;
      }

      // Impassable terrain (mountain, peak, floatingIsland) keeps its elevation;
      // it is transparent to the carve (the channel continues past it).
      if (!TERRAIN[tile.terrain]?.passable) {
        continue;
      }

      // Minimum elevation of adjacent non-river, non-water tiles (the banks).
      // A tile with no qualifying bank (fully hemmed by river/water) keeps the
      // downstream level — it cannot be carved below what it flows into.
      let minBank = -Infinity;
      let hasBank = false;
      let minAdjWater = -Infinity;
      let hasAdjWater = false;

      for (const n of neighbors({ q: tile.q, r: tile.r })) {
        const nb = tiles[coordKey(n)];
        if (!nb) continue;
        if (isWater(nb)) {
          if (hasAdjWater) {
            if (nb.elevation < minAdjWater) minAdjWater = nb.elevation;
          } else {
            minAdjWater = nb.elevation;
            hasAdjWater = true;
          }
        } else if (!nb.isRiver) {
          if (hasBank) {
            if (nb.elevation < minBank) minBank = nb.elevation;
          } else {
            minBank = nb.elevation;
            hasBank = true;
          }
        }
      }

      // Depth target: carve RIVER_BED_DEPTH below the lowest bank.
      const bankTarget = hasBank ? minBank - RIVER_BED_DEPTH : -Infinity;
      // Monotonic cap: never below the downstream tile (descends toward mouth).
      const floor = downstreamElev !== null ? downstreamElev : -Infinity;
      // Never dig below a neighbouring water body's level.
      const waterFloor = hasAdjWater ? minAdjWater : -Infinity;

      const elev = Math.max(waterFloor, Math.max(bankTarget, floor));
      tile.elevation = elev;
      downstreamElev = elev;
    }
  }
}
