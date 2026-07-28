import { coordKey, neighbors } from '../../../../engine/rules/hexGrid.js';
import { RIVER_MAX_LENGTH } from '../../../../params/game/worldParams.js';

/**
 * Deterministic hash from position + step + seed for tie-breaking.
 * Uses a Murmur3-style mixing to distribute choices evenly.
 *
 * @param {number} q     - Hex q coordinate
 * @param {number} r     - Hex r coordinate
 * @param {number} step  - Current river trace step
 * @param {number} seed  - Global generation seed
 * @returns {number} unsigned 32-bit integer
 */
export function seededHash(q, r, step, seed) {
  let h = seed >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= Math.imul(q + 101, 374761393) ^ Math.imul(r - 47, 668265263) ^ Math.imul(step + 13, 362437);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Trace a river downhill from a source hex using seeded tie-breaking.
 * Stops at water, local minima, loops, or max length.
 *
 * @param {object}   start              - { q, r } starting hex
 * @param {Map}      fieldMap           - Map<coordKey, { elevation, ... }>
 * @param {Set}      provisionalWaterSet - Set<coordKey> of water tiles
 * @param {object}   params             - { seed }
 * @returns {object[]} Array of { q, r } hexes along the river path
 */
export function traceRiver(start, fieldMap, provisionalWaterSet, params) {
  const path = [];
  const visited = new Set();
  let current = { q: start.q, r: start.r };

  for (let steps = 0; steps < RIVER_MAX_LENGTH; steps++) {
    const key = coordKey(current);
    if (visited.has(key)) {
      break;
    }

    visited.add(key);
    path.push({ q: current.q, r: current.r });

    if (provisionalWaterSet.has(key)) {
      break;
    }

    const currentElevation = fieldMap.get(key)?.elevation;
    if (currentElevation === undefined || currentElevation === null) {
      break;
    }

    const lowerNeighbors = neighbors(current).filter((n) => {
      const nKey = coordKey(n);
      const nData = fieldMap.get(nKey);
      return nData !== undefined && nData.elevation < currentElevation;
    });

    if (lowerNeighbors.length === 0) {
      break;
    }

    // Sort by elevation ascending
    lowerNeighbors.sort((a, b) => {
      const aElev = fieldMap.get(coordKey(a)).elevation;
      const bElev = fieldMap.get(coordKey(b)).elevation;
      return aElev - bElev;
    });

    // Find the minimum elevation value
    const minElev = fieldMap.get(coordKey(lowerNeighbors[0])).elevation;

    // Filter to only those at the minimum elevation
    const tied = lowerNeighbors.filter(
      (n) => fieldMap.get(coordKey(n)).elevation === minElev
    );

    if (tied.length === 1) {
      current = { q: tied[0].q, r: tied[0].r };
    } else {
      const idx = seededHash(current.q, current.r, steps, params.seed) % tied.length;
      current = { q: tied[idx].q, r: tied[idx].r };
    }
  }

  return path;
}
