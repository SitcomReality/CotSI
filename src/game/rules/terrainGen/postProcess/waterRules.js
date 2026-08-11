import { coordKey, neighbors } from '../../../../engine/rules/hexGrid.js';
import { WATER_LAND_GAP, RIVER_BED_DEPTH } from '../../../../params/game/terrainGenParams.js';

/**
 * waterRules.js — Post-classification invariants for water terrain.
 *
 * Enforces the water system's height rules on the assembled tile map:
 *   1. Water is always lower than any adjacent land.
 *   2. Every water hex in a stationary (non-river) body sits at the same height.
 *
 * Rivers (river terrain) are exempt from both rules — they are flowing water,
 * carved into recessed channels by carveRiverBeds() so they read as beds that
 * descend toward the water body they empty into.
 *
 * Layer: game/rules/terrainGen — pure data transforms, deterministic per input.
 */

/**
 * Whether a tile is water terrain (lakes, ocean).
 * Rivers are their own terrain type; ice is a frozen surface, not water —
 * both are treated as non-stationary by these rules.
 */
function isWater(tile) {
  return tile && tile.terrain === 'water';
}

/**
 * Rule 2: flatten every stationary water body, then Rule 1: raise any land
 * that sits at or below the water level of an adjacent water tile.
 *
 * - Stationary bodies are maximal connected components of water tiles. River
 *   terrain breaks adjacency (a river between two lakes keeps them separate
 *   bodies), and a river mouth is part of its body. Each component converges
 *   to the lowest current elevation in it, so a highland lake and the ocean
 *   may sit at different (physical) levels, but a body never has two heights.
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
    if (!isWater(tile) || visited.has(key)) continue;

    // BFS the stationary component (river terrain breaks adjacency here — a
    // river between two lakes keeps them separate bodies).
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
        if (isWater(nb)) {
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
      if (!nb || isWater(nb) || nb.terrain === 'river') continue;
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
 * - Every other path tile is river terrain (applyRiverTerrain already replaced
 *   whatever was there), so all of them are carved.
 * - Each carved tile's elevation = max(downstream carved elevation,
 *   minBankElev - RIVER_BED_DEPTH): carved to its bank depth, but never lower
 *   than the tile downstream of it, so the channel descends (or stays level)
 *   toward the mouth instead of pooling at the mouth's level.
 * - Clamped to never go below the minimum elevation of any adjacent water tile
 *   (a channel must not dig under a neighbouring lake it is not the outlet of).
 *
 * Only `tile.elevation` is modified; terrain, riverFlow, and fields are left
 * as-is. Deterministic and idempotent for identical paths.
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

      // Every other path tile is river terrain — all of them are carved.

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
        } else if (nb.terrain !== 'river') {
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

/**
 * Assign each river tile its downstream flow direction.
 *
 * traceRiver() paths are ordered source → mouth, so the flow of every path
 * tile is simply the hex-coordinate delta to the next tile in the path. The
 * renderer converts this to a world-space unit vector for the vertex-shader
 * flow waves (buildWaterMesh.js / waterMaterial). Water-terrain tiles (the
 * mouth, already part of a stationary body) get no flow — they are not carved,
 * so the field is meaningless there.
 *
 * Only sets `tile.riverFlow = { dq, dr }`; everything else is left as-is.
 * Deterministic and idempotent for identical paths.
 *
 * @param {object}      tiles      - Flat tile map keyed by "q,r"
 * @param {Array<{q,r}[]>} riverPaths - Ordered river paths from traceRiver
 */
export function assignRiverFlows(tiles, riverPaths) {
  for (const path of riverPaths) {
    for (let i = 0; i < path.length; i++) {
      const hex = path[i];
      const tile = tiles[coordKey(hex)];
      if (!tile || tile.terrain === 'water') continue;

      const next = path[i + 1];
      if (!next) continue;
      tile.riverFlow = { dq: next.q - hex.q, dr: next.r - hex.r };
    }
  }
}
