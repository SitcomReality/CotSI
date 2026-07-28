import { clamp01 } from '../fields/slopeComputation.js';

/**
 * Compute continuous feature density [0, 1] for a tile.
 * Density modulates noise thresholds — higher density = lower threshold = more features.
 *
 * @param {string} terrain   - Terrain type string
 * @param {number} elevation - Continuous elevation field [0, 1]
 * @param {number} moisture  - Adjusted moisture [0, 1]
 * @param {number} slope     - Topographic slope [0, 1]
 * @param {number} treeLineMax - Maximum elevation for tree growth
 * @returns {number} Density in [0, 1]
 */
export function featureDensity(terrain, elevation, moisture, slope, treeLineMax) {
  // Base density from terrain type (gentle fallback)
  let density = 0.5;  // plains baseline

  // Tree-bearing terrain gets density from climate
  if (terrain === 'forest' || terrain === 'denseForest') {
    // Moisture-driven: scales from forestMinMoisture to 1.0
    const moistFactor = clamp01((moisture - 0.72) / 0.28);  // 0.72 → 0, 1.0 → 1
    // Elevation penalty: above half tree line, density falls off
    const elevFactor = elevation < treeLineMax * 0.5 ? 1.0
      : clamp01((treeLineMax - elevation) / (treeLineMax * 0.5));
    density = moistFactor * elevFactor * 0.8 + 0.2;  // range [0.2, 1.0]
  }

  if (terrain === 'plains' || terrain === 'hill') {
    density = clamp01(moisture * 0.6 + 0.1);  // sparse trees on moist plains
  }

  if (terrain === 'marsh') {
    density = clamp01(moisture * 0.4);  // sparse trees in marsh
  }

  if (terrain === 'desert') {
    density = clamp01(moisture * 0.15);  // very sparse in desert
  }

  return density;
}

/**
 * Climate gate for fruit tree spawning.
 * Fruit trees require moisture above threshold and elevation below tree line.
 *
 * @param {number} elevation    - Continuous elevation [0, 1]
 * @param {number} moisture     - Adjusted moisture [0, 1]
 * @param {number} treeLineMax  - Maximum elevation for tree growth
 * @returns {boolean} True if climate conditions allow fruit trees
 */
export function canSpawnFruitTree(elevation, moisture, treeLineMax) {
  return moisture > 0.60 && elevation < treeLineMax;
}

/**
 * Terrain-aware rock probability for debris spawning.
 * Rocks are more common on steep slopes and in dry areas.
 *
 * @param {number} slope    - Topographic slope [0, 1]
 * @param {number} moisture - Adjusted moisture [0, 1]
 * @returns {number} Rock spawn probability in [0, 1]
 */
export function shouldSpawnRock(slope, moisture) {
  const slopeFactor = clamp01(slope / 0.15);      // slope 0 → 0, slope 0.15+ → 1
  const dryFactor = clamp01((0.5 - moisture) / 0.5); // moist 0.5+ → 0, moist 0 → 1
  return slopeFactor * 0.6 + dryFactor * 0.4;
}
