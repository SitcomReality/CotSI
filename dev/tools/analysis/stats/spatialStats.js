/**
 * spatialStats.js — Spatial statistics for map analysis.
 *
 * Provides flood-fill connected-component analysis for terrain patches.
 * Pure — no DOM, no state, no side effects.
 *
 * Cross-field correlations are in ./correlations.js.
 * Display formatting is in ./spatialFormatting.js.
 */
import { neighbors, coordKey } from '../../../../src/engine/rules/hexGrid.js';
import { giniCoefficient } from './concentration.js';

/**
 * Flood-fill BFS to find all connected hexes of a given terrain type.
 *
 * @param {number}         q           - Starting hex q
 * @param {number}         r           - Starting hex r
 * @param {Map<string, object>} tileMap - Map of coordKey -> tile objects with .terrain
 * @param {string}         terrainType - Terrain type to match (e.g. 'desert')
 * @param {Set<string>}    visited     - Set of already-visited coordKeys (mutated in-place)
 * @returns {string[]} Array of coordKeys in this patch
 */
function floodFill(q, r, tileMap, terrainType, visited) {
  const patch = [];
  const queue = [{ q, r }];

  while (queue.length > 0) {
    const cur = queue.shift();
    const key = coordKey(cur);
    if (visited.has(key)) continue;
    visited.add(key);
    patch.push(key);

    for (const n of neighbors(cur)) {
      const nKey = coordKey(n);
      if (visited.has(nKey)) continue;
      const nTile = tileMap.get(nKey);
      if (nTile && nTile.terrain === terrainType) {
        queue.push(n);
      }
    }
  }

  return patch;
}

/**
 * Run patch analysis for a single terrain type.
 *
 * @param {Map<string, object>} tileMap    - Map of coordKey -> tile objects with .terrain
 * @param {string}              terrainType - Terrain type to analyze
 * @returns {object} {
 *   terrainType, totalTiles, componentCount,
 *   meanSize, medianSize, singletonCount,
 *   largestPatchFraction,
 *   patchSizes: number[], gini: number
 * }
 */
export function patchAnalysis(tileMap, terrainType) {
  // Collect all tiles of this terrain type
  const relevantTiles = [];
  for (const [key, tile] of tileMap) {
    if (tile.terrain === terrainType) {
      relevantTiles.push(key);
    }
  }

  const totalTiles = relevantTiles.length;
  if (totalTiles === 0) {
    return {
      terrainType,
      totalTiles: 0, componentCount: 0,
      meanSize: 0, medianSize: 0, singletonCount: 0,
      largestPatchFraction: 0,
      patchSizes: [], gini: 0,
    };
  }

  // Flood fill to find connected components
  const visited = new Set();
  const patchSizes = [];

  for (const key of relevantTiles) {
    if (visited.has(key)) continue;
    const tile = tileMap.get(key);
    if (!tile) continue;
    const patch = floodFill(tile.q, tile.r, tileMap, terrainType, visited);
    patchSizes.push(patch.length);
  }

  patchSizes.sort((a, b) => a - b);
  const componentCount = patchSizes.length;
  const meanSize = totalTiles / componentCount;

  // Median
  const mid = Math.floor(patchSizes.length / 2);
  const medianSize = patchSizes.length % 2 === 1
    ? patchSizes[mid]
    : (patchSizes[mid - 1] + patchSizes[mid]) / 2;

  // Singletons (patches of size 1)
  const singletonCount = patchSizes.filter(s => s === 1).length;

  // Largest patch fraction
  const largestPatch = patchSizes[patchSizes.length - 1] || 0;
  const largestPatchFraction = totalTiles > 0 ? largestPatch / totalTiles : 0;

  // Gini of patch size distribution
  const gini = giniCoefficient(patchSizes);

  return {
    terrainType,
    totalTiles,
    componentCount,
    meanSize: meanSize.toFixed(2),
    medianSize: medianSize.toFixed(1),
    singletonCount,
    largestPatchFraction: largestPatchFraction.toFixed(4),
    patchSizes,
    gini: gini.toFixed(4),
  };
}

/**
 * Run patch analysis for all terrain types present in the tile map.
 *
 * @param {Map<string, object>} tileMap - Map of coordKey -> tile objects with .terrain
 * @returns {object[]} Array of patch analysis results, one per present terrain
 */
export function allPatchAnalyses(tileMap) {
  // Discover present terrain types
  const present = new Set();
  for (const [, tile] of tileMap) {
    present.add(tile.terrain);
  }

  const results = [];
  for (const terrain of present) {
    const pa = patchAnalysis(tileMap, terrain);
    if (pa.totalTiles > 0) {
      results.push(pa);
    }
  }
  results.sort((a, b) => b.totalTiles - a.totalTiles);
  return results;
}

/**
 * Convenience wrapper: takes the tiles object from generateSingleSeed(),
 * converts to a Map, and runs allPatchAnalyses.
 *
 * @param {object} tilesObj - Tiles object keyed by "q,r" string
 * @returns {object[]} Array of patch analysis results
 */
export function runSpatialStats(tilesObj) {
  const tileMap = new Map();
  for (const [key, tile] of Object.entries(tilesObj)) {
    tileMap.set(key, tile);
  }
  return allPatchAnalyses(tileMap);
}
