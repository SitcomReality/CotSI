import { clamp01 } from '../fields/slopeComputation.js';
import { FEATURE_DENSITY } from '../../../../params/game/worldParams.js';

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
  const FD = FEATURE_DENSITY;

  // Base density from terrain type (gentle fallback)
  let density = FD.baseline;

  // Tree-bearing terrain gets density from climate
  if (terrain === 'forest' || terrain === 'denseForest') {
    // Moisture-driven: scales from the dense-forest ramp to 1.0
    const moistFactor = clamp01((moisture - FD.moistRamp) / FD.moistSpan);
    // Elevation penalty: above half tree line, density falls off
    const elevFactor = elevation < treeLineMax * FD.treeLineHalf ? 1.0
      : clamp01((treeLineMax - elevation) / (treeLineMax * FD.treeLineHalf));
    density = moistFactor * elevFactor * FD.treeDensityScale + FD.treeDensityMin;
  }

  if (terrain === 'plains' || terrain === 'hill') {
    density = clamp01(moisture * FD.plainsMoistFactor + FD.plainsOffset);  // sparse trees on moist plains
  }

  if (terrain === 'marsh') {
    density = clamp01(moisture * FD.marshMoistFactor);  // sparse trees in marsh
  }

  if (terrain === 'desert') {
    density = clamp01(moisture * FD.desertMoistFactor);  // very sparse in desert
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
  return moisture > FEATURE_DENSITY.fruitTreeMinMoisture && elevation < treeLineMax;
}
