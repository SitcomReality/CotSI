/**
 * correlations.js — Cross-field Pearson correlations and 2D joint histograms.
 *
 * Pure: no DOM, no state, no side effects.
 */

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
