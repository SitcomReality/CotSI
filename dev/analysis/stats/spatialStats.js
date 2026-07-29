/**
 * spatialStats.js — Spatial statistics for map analysis.
 *
 * Provides flood-fill connected-component analysis for terrain patches,
 * cross-field Pearson correlations, and 2D joint histograms with biome
 * overlay. All functions are pure — no DOM, no state, no side effects.
 */
import { neighbors, coordKey } from '../../../src/engine/rules/hexGrid.js';
import { giniCoefficient } from './stats.js';

// ─── Patch Analysis ──────────────────────────────────────────────────────────

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

// ─── Cross-field Correlations ───────────────────────────────────────────────

/**
 * Compute Pearson correlation coefficient between two numeric fields.
 *
 * @param {object[]} tiles  - Array of tile objects
 * @param {string}   fieldA - Tile property name (e.g. 'elevationField')
 * @param {string}   fieldB - Tile property name (e.g. 'temperature')
 * @returns {{ r: number, n: number }}
 */
export function pearsonCorrelation(tiles, fieldA, fieldB) {
  let n = 0;
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;

  for (const tile of tiles) {
    const a = tile[fieldA];
    const b = tile[fieldB];
    if (a == null || b == null) continue;
    // Skip NaN/invalid
    if (typeof a !== 'number' || typeof b !== 'number') continue;
    n++;
    sumA += a;
    sumB += b;
    sumAB += a * b;
    sumA2 += a * a;
    sumB2 += b * b;
  }

  if (n < 3) return { r: 0, n };

  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

  return {
    r: den === 0 ? 0 : num / den,
    n,
  };
}

/**
 * Build a 2D joint histogram of two numeric fields.
 *
 * @param {object[]} tiles    - Array of tile objects
 * @param {string}   fieldA   - Tile property name
 * @param {string}   fieldB   - Tile property name
 * @param {number}   [bins=10]- Number of bins per axis
 * @returns {{ grid: number[][], aLabel: string, bLabel: string, bins: number }}
 */
export function jointHistogram2D(tiles, fieldA, fieldB, bins = 10) {
  // Initialize grid
  const grid = [];
  for (let i = 0; i < bins; i++) {
    grid.push(new Uint32Array(bins));
  }

  for (const tile of tiles) {
    const a = tile[fieldA];
    const b = tile[fieldB];
    if (a == null || b == null) continue;
    if (typeof a !== 'number' || typeof b !== 'number') continue;
    const aBin = Math.min(bins - 1, Math.floor(Math.max(0, Math.min(1, a)) * bins));
    const bBin = Math.min(bins - 1, Math.floor(Math.max(0, Math.min(1, b)) * bins));
    grid[aBin][bBin]++;
  }

  return { grid, aLabel: fieldA, bLabel: fieldB, bins };
}

/**
 * Build a 2D joint histogram with biome overlay.
 *
 * Each cell records tile count and the set of biome IDs present.
 *
 * @param {object[]} tiles          - Array of tile objects with .biomeId
 * @param {string}   fieldA         - Tile property name
 * @param {string}   fieldB         - Tile property name
 * @param {number}   [bins=10]      - Number of bins per axis
 * @returns {{ cells: { count: number, biomes: string[] }[][], aLabel: string, bLabel: string, bins: number }}
 */
export function jointHistogramWithBiome(tiles, fieldA, fieldB, bins = 10) {
  // Initialize grid of { count, biomeSet }
  const cells = [];
  for (let i = 0; i < bins; i++) {
    const row = [];
    for (let j = 0; j < bins; j++) {
      row.push({ count: 0, biomes: new Set() });
    }
    cells.push(row);
  }

  for (const tile of tiles) {
    const a = tile[fieldA];
    const b = tile[fieldB];
    if (a == null || b == null) continue;
    if (typeof a !== 'number' || typeof b !== 'number') continue;
    const aBin = Math.min(bins - 1, Math.floor(Math.max(0, Math.min(1, a)) * bins));
    const bBin = Math.min(bins - 1, Math.floor(Math.max(0, Math.min(1, b)) * bins));
    cells[aBin][bBin].count++;
    if (tile.biomeId) {
      cells[aBin][bBin].biomes.add(tile.biomeId);
    }
  }

  // Convert Sets to arrays
  const result = [];
  for (let i = 0; i < bins; i++) {
    const row = [];
    for (let j = 0; j < bins; j++) {
      row.push({
        count: cells[i][j].count,
        biomes: [...cells[i][j].biomes].sort(),
      });
    }
    result.push(row);
  }

  return { cells: result, aLabel: fieldA, bLabel: fieldB, bins };
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

/**
 * Format patch analysis results for display.
 *
 * @param {object[]} results - Array from allPatchAnalyses()
 * @param {number}   [minPct=2] - Minimum % coverage to show (filters noise)
 * @param {number}   totalTiles - Total tiles in map (for % computation)
 * @returns {string}
 */
export function formatSpatialStats(results, totalTiles, minPct = 2) {
  const lines = [];
  lines.push('Spatial Statistics (patch analysis):');
  lines.push('');

  let anyShown = false;
  for (const r of results) {
    const pct = totalTiles > 0 ? (r.totalTiles / totalTiles * 100) : 0;
    if (pct < minPct) continue;
    anyShown = true;
    lines.push(
      `  ${r.terrainType.padEnd(14)} patches=${r.componentCount}  ` +
      `mean=${r.meanSize}  med=${r.medianSize}  ` +
      `singletons=${r.singletonCount}  ` +
      `largest=${(r.largestPatchFraction * 100).toFixed(1)}%  ` +
      `gini=${r.gini}`
    );
  }

  if (!anyShown) {
    lines.push('  (no terrain type exceeds the minimum coverage threshold)');
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Format cross-field correlations for display.
 *
 * @param {object[]} pairs - Array of { fieldA, fieldB, r, n } from pearsonCorrelation calls
 * @returns {string}
 */
export function formatCorrelations(pairs) {
  const lines = [];
  lines.push('Cross-field Correlations (Pearson r):');
  for (const p of pairs) {
    lines.push(
      `  ${p.fieldA.padEnd(18)} × ${p.fieldB.padEnd(18)}  r=${p.r.toFixed(4)}  (n=${p.n})`
    );
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Format a 2D joint histogram with biome overlay for display.
 *
 * Shows a compact grid where each cell shows the dominant biome and count.
 *
 * @param {{ cells: { count: number, biomes: string[] }[][], aLabel: string, bLabel: string, bins: number }} jh
 * @returns {string}
 */
export function formatJointHistogram(jh) {
  const lines = [];
  lines.push(`Joint Histogram: ${jh.aLabel} × ${jh.bLabel} (${jh.bins}×${jh.bins} grid)`);

  // Show the grid as text: for each cell, show the dominant biome short name
  const shortNames = {};
  for (const row of jh.cells) {
    for (const cell of row) {
      for (const b of cell.biomes) {
        if (!shortNames[b]) {
          // Shorten biome names for display
          shortNames[b] = b.replace('biome_', '').replace(/_/g, ' ').substring(0, 12);
        }
      }
    }
  }

  lines.push(`  Biomes: ${Object.values(shortNames).join(', ')}`);
  lines.push('');
  lines.push(`  ${jh.aLabel} \\ ${jh.bLabel}  (count:dominant biome, empty cells omitted):`);

  // Show non-empty cells
  let cellCount = 0;
  for (let a = 0; a < jh.bins; a++) {
    for (let b = 0; b < jh.bins; b++) {
      const cell = jh.cells[a][b];
      if (cell.count === 0) continue;
      cellCount++;
      const aLow = (a / jh.bins).toFixed(1);
      const aHigh = ((a + 1) / jh.bins).toFixed(1);
      const bLow = (b / jh.bins).toFixed(1);
      const bHigh = ((b + 1) / jh.bins).toFixed(1);

      const dominantBiome = cell.biomes.length > 0
        ? cell.biomes.reduce((best, bio) => {
            // Choose the biome with the shortest name (biome_default is typically the
            // catch-all — we want the most specific one)
            return bio.replace('biome_', '').length < best.replace('biome_', '').length ? bio : best;
          })
        : 'none';

      lines.push(
        `  [${aLow}-${aHigh}, ${bLow}-${bHigh}]  ${cell.count} tiles  ` +
        `biomes(${cell.biomes.length}): ${shortNames[dominantBiome] || dominantBiome}`
      );
    }
  }

  if (cellCount === 0) {
    lines.push('  (all cells empty — no valid data)');
  }
  lines.push('');

  return lines.join('\n');
}
