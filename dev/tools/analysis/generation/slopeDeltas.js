/**
 * slopeDeltas.js — Raw per-tile slope delta collection for calibration.
 *
 * Collects unbounded average neighbor elevation deltas for computing the
 * 95th percentile (SLOPE_NORMALIZATION).
 *
 * Pure: no DOM, no state, no side effects.
 */
import { stringSeed } from '../../../../src/engine/rules/seededRng.js';
import { hexesWithinRadius, neighbors, coordKey } from '../../../../src/engine/rules/hexGrid.js';
import { sampleBaseFields } from '../../../../src/game/rules/terrainGen/index.js';

/**
 * Collect raw per-tile average neighbor elevation deltas.
 *
 * Unlike collectHistograms which bins slope values, this returns the raw
 * unbounded deltas for computing the 95th percentile (SLOPE_NORMALIZATION).
 *
 * @param {string} seedText     - Seed string
 * @param {number} radius       - Map radius in hexes
 * @param {object} noiseConfig  - Noise config (same shape as sampleBaseFields)
 * @returns {Float64Array} Per-tile average neighbor elevation deltas
 */
export function collectRawSlopeDeltas(seedText, radius, noiseConfig) {
  const seed = stringSeed(seedText);
  const tiles = hexesWithinRadius(radius);

  // Sample all fields
  const samples = tiles.map(({ q, r }) =>
    sampleBaseFields(seed, q, r, noiseConfig, radius)
  );

  // Build elevation lookup
  const elevationMap = new Map();
  for (let i = 0; i < tiles.length; i++) {
    elevationMap.set(coordKey(tiles[i]), samples[i].elevation);
  }

  // Collect raw average neighbor deltas
  const deltas = new Float64Array(tiles.length);
  for (let i = 0; i < tiles.length; i++) {
    let totalDiff = 0;
    let neighborCount = 0;
    for (const n of neighbors(tiles[i])) {
      const nElev = elevationMap.get(coordKey(n));
      if (nElev !== undefined) {
        totalDiff += Math.abs(nElev - samples[i].elevation);
        neighborCount++;
      }
    }
    deltas[i] = neighborCount > 0 ? totalDiff / neighborCount : 0;
  }

  return deltas;
}
