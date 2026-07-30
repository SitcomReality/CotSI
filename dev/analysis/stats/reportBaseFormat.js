/**
 * reportBaseFormat.js — Base formatting helpers for batch analysis reports.
 *
 * Provides config-section rendering, tile-count math, and passable-tile
 * estimation used by the batch report pipeline.
 *
 * Pure: no DOM, no state, no side effects.
 */
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';
import { getNoiseConfig, NOISE_FIELDS } from '../generation/noiseConfig.js';
import {
  DEFAULT_TERRAIN_RULES,
  SLOPE_NORMALIZATION,
  EPICENTER_GRID,
} from '../../../src/params/game/worldParams.js';

/** Total hexes in a radius-r map: 3r(r+1) + 1 */
export function totalTilesAtRadius(r) {
  return 3 * r * (r + 1) + 1;
}

/**
 * Estimate passable tile count from an aggregateTerrainDistributions result.
 * Sums the mean percentages for all passable terrain types and multiplies
 * by total tile count for the radius.
 *
 * @param {object} terrainAgg - { terrainType: { mean: string, ... } }
 * @param {number} radius     - Map radius
 * @returns {number}
 */
export function estimatePassableTiles(terrainAgg, radius) {
  const total = totalTilesAtRadius(radius);
  let passablePct = 0;
  for (const [terrain, d] of Object.entries(terrainAgg)) {
    const def = TERRAIN[terrain];
    if (def && def.passable) {
      passablePct += parseFloat(d.mean);
    }
  }
  return Math.round(total * passablePct / 100);
}

// ─── Noise-field labels for config display ──────────────────────────────────

const NOISE_FIELD_LABELS = {
  ELEVATION_DETAIL: 'Elevation detail',
  RIDGE:            'Ridge noise',
  MOISTURE:         'Moisture',
  TEMP_VARIATION:   'Temperature variation',
  REGION:           'Region bias',
};

/**
 * Format the active generation configuration as a self-documenting header.
 *
 * @param {number} seedCount      - Number of seeds used
 * @param {number[]} radii        - Map radii tested
 * @param {string} [baseSeed]     - Base seed text
 * @param {boolean} [multiBiome]  - Whether multi-biome was enabled
 * @returns {string}
 */
export function formatConfigSection(seedCount, radii, baseSeed = 'glut-17', multiBiome = true) {
  const lines = [];
  lines.push('=== Active Configuration ===');
  lines.push(`Base seed: ${baseSeed}  |  Seeds: ${seedCount}  |  Radii: ${radii.join(', ')}  |  Multi-biome: ${multiBiome ? 'yes' : 'no'}`);
  lines.push('');

  // Per-radius noise config
  lines.push('Noise Config:');
  for (const radius of radii) {
    const nc = getNoiseConfig(radius);
    lines.push(`  Radius ${radius}:`);
    for (const field of NOISE_FIELDS) {
      const fk = field.key;
      const cfg = nc[fk];
      if (!cfg) continue;
      const label = (NOISE_FIELD_LABELS[fk] || fk).padEnd(22);
      const parts = [`octaves=${cfg.octaves}`, `freq=${cfg.frequency}`, `lacunarity=${cfg.lacunarity}`, `gain=${cfg.gain}`];
      if (cfg.offset !== undefined) parts.push(`offset=${cfg.offset}`);
      lines.push(`    ${label} ${parts.join('  ')}`);
    }
  }
  lines.push('');

  // Terrain rules
  lines.push('Terrain Rules (DEFAULT_TERRAIN_RULES):');
  const ruleLabels = {
    waterMaxElevation:        'waterMaxElevation',
    mountainThreshold:        'mountainThreshold',
    peakThreshold:            'peakThreshold',
    floatingIslandThreshold:  'floatingIslandThreshold',
    marshMaxElevation:        'marshMaxElevation',
    hillElevationMin:         'hillElevationMin',
    plateauSlopeMin:          'plateauSlopeMin',
    hillSlopeMin:             'hillSlopeMin',
    forestMinMoisture:        'forestMinMoisture',
    denseForestMinMoisture:   'denseForestMinMoisture',
    desertMaxMoisture:        'desertMaxMoisture',
    marshMinMoisture:         'marshMinMoisture',
    freezeTempMax:            'freezeTempMax',
    waterMinMoisture:         'waterMinMoisture',
  };
  for (const [key, label] of Object.entries(ruleLabels)) {
    const val = DEFAULT_TERRAIN_RULES[key];
    if (val !== undefined) {
      lines.push(`  ${label.padEnd(28)} ${val}`);
    }
  }
  lines.push('');

  lines.push(`Slope Normalization: ${SLOPE_NORMALIZATION}`);
  const eg = EPICENTER_GRID || {};
  lines.push(`Epicenter Grid: cellSize=${eg.cellSize}  jitterAmplitude=${eg.jitterAmplitude}`);
  lines.push('');

  return lines.join('\n');
}
