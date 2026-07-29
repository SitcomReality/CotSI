/**
 * thresholdDerivation.js — Threshold derivation from pooled histogram data.
 *
 * Runs the calibration pipeline over N seeds × M map sizes, pools histograms,
 * builds quantile LUTs, and derives percentile-based terrain thresholds.
 *
 * Pure: no DOM, no state, no side effects.
 */
import { stringSeed } from '../../../src/engine/rules/seededRng.js';
import { hexesWithinRadius, neighbors, coordKey } from '../../../src/engine/rules/hexGrid.js';
import { sampleBaseFields } from '../../../src/game/rules/terrainGen/index.js';
import { collectHistograms, percentileFromHistogram } from './histograms.js';
import { poolHistograms, buildQuantileLUT, normalizeField } from './quantileLUT.js';
import { NOISE_CONFIG } from './noiseConfig.js';

// ---------------------------------------------------------------------------
// Slope delta collection (for SLOPE_NORMALIZATION calibration)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Percentile from sorted value array
// ---------------------------------------------------------------------------

/**
 * Compute the value at a given percentile from a sorted array of numbers.
 *
 * @param {Float64Array|number[]} sortedValues - Sorted ascending
 * @param {number}               p             - Percentile [0, 1]
 * @returns {number} The value at the given percentile
 */
export function percentileFromValues(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const idx = Math.floor((sortedValues.length - 1) * p);
  return sortedValues[idx];
}

// ---------------------------------------------------------------------------
// Threshold derivation
// ---------------------------------------------------------------------------

/**
 * Default seed generator: creates an array of seed texts from a base seed.
 *
 * @param {string} baseSeed - Base seed text (e.g. 'glut-17')
 * @param {number} count    - Number of seeds to generate
 * @returns {string[]}
 */
export function generateSeeds(baseSeed, count) {
  const seeds = [];
  for (let i = 0; i < count; i++) {
    seeds.push(`${baseSeed}-${i}`);
  }
  return seeds;
}

/**
 * Run the full calibration pipeline.
 *
 * For each (seed, radius) combination, collects histograms and raw slope
 * deltas. Pools all histograms per field, builds 256-entry quantile LUTs,
 * and derives percentile-based threshold values.
 *
 * Threshold percentiles are taken from the Phase 0 target budget table (§4.5):
 *
 *   Field       | Threshold               | Target percentile
 *   ------------|-------------------------|------------------
 *   Elevation   | waterMaxElevation       | p12  (12th %ile)
 *   Elevation   | mountainThreshold       | p90  (top 10%)
 *   Elevation   | peakThreshold           | p97  (top 3%)
 *   Elevation   | floatingIslandThreshold | p99.5 (top 0.5%)
 *   Elevation   | hillElevationMin        | p55
 *   Elevation   | marshMaxElevation       | p35
 *   Moisture    | forestMinMoisture       | p72
 *   Moisture    | denseForestMinMoisture  | p85
 *   Moisture    | desertMaxMoisture       | p20
 *   Moisture    | marshMinMoisture        | p58
 *   Temperature | freezeTempMax           | p15 (placeholder for ice)
 *
 * @param {object}   opts
 * @param {string[]} opts.seeds      - Array of seed texts to sample
 * @param {number[]} opts.radii      - Array of map radii to sample
 * @param {object}   opts.noiseConfig- Noise config (defaults to NOISE_CONFIG)
 * @returns {object} { quantileLUTs, thresholds, slopeNormalization, meta }
 */
export function calibratePipeline({ seeds, radii, noiseConfig }) {
  const NC = noiseConfig || NOISE_CONFIG;

  // Per-field histogram collections across all (seed, radius) combos
  const allElev  = [];
  const allMoist = [];
  const allTemp  = [];
  const allSlope = [];

  // Raw slope deltas across all combos
  const allDeltas = [];

  for (const seedText of seeds) {
    for (const radius of radii) {
      const hists = collectHistograms(seedText, radius, NC);
      allElev.push(hists.elevHist);
      allMoist.push(hists.moistHist);
      allTemp.push(hists.tempHist);
      allSlope.push(hists.slopeHist);

      // Collect raw slope deltas for SLOPE_NORMALIZATION
      const deltas = collectRawSlopeDeltas(seedText, radius, NC);
      for (let i = 0; i < deltas.length; i++) {
        allDeltas.push(deltas[i]);
      }
    }
  }

  // ── Pool histograms per field ──────────────────────────────────────
  const pooledElev  = poolHistograms(allElev);
  const pooledMoist = poolHistograms(allMoist);
  const pooledTemp  = poolHistograms(allTemp);
  const pooledSlope = poolHistograms(allSlope);

  // ── Build quantile LUTs (256-entry) ────────────────────────────────
  const elevLUT  = buildQuantileLUT(pooledElev);
  const moistLUT = buildQuantileLUT(pooledMoist);
  const tempLUT  = buildQuantileLUT(pooledTemp);
  const slopeLUT = buildQuantileLUT(pooledSlope);

  // ── Derive thresholds from pooled histograms ───────────────────────
  const thresholds = {
    // Elevation-derived
    waterMaxElevation: {
      value: percentileFromHistogram(pooledElev, 0.12),
      targetPercentile: 12,
      field: 'elevation',
      description: '12th percentile — ~12% water coverage',
    },
    mountainThreshold: {
      value: percentileFromHistogram(pooledElev, 0.90),
      targetPercentile: 90,
      field: 'elevation',
      description: '90th percentile — top 10% elevation',
    },
    peakThreshold: {
      value: percentileFromHistogram(pooledElev, 0.97),
      targetPercentile: 97,
      field: 'elevation',
      description: '97th percentile — top 3% elevation',
    },
    floatingIslandThreshold: {
      value: percentileFromHistogram(pooledElev, 0.995),
      targetPercentile: 99.5,
      field: 'elevation',
      description: '99.5th percentile — top 0.5% elevation',
    },
    hillElevationMin: {
      value: percentileFromHistogram(pooledElev, 0.55),
      targetPercentile: 55,
      field: 'elevation',
      description: '55th percentile — hill starting elevation',
    },
    marshMaxElevation: {
      value: percentileFromHistogram(pooledElev, 0.35),
      targetPercentile: 35,
      field: 'elevation',
      description: '35th percentile — max elevation for marsh',
    },

    // Moisture-derived
    forestMinMoisture: {
      value: percentileFromHistogram(pooledMoist, 0.72),
      targetPercentile: 72,
      field: 'moisture',
      description: '72nd percentile — forest minimum moisture',
    },
    denseForestMinMoisture: {
      value: percentileFromHistogram(pooledMoist, 0.85),
      targetPercentile: 85,
      field: 'moisture',
      description: '85th percentile — dense forest minimum moisture',
    },
    desertMaxMoisture: {
      value: percentileFromHistogram(pooledMoist, 0.20),
      targetPercentile: 20,
      field: 'moisture',
      description: '20th percentile — desert maximum moisture',
    },
    marshMinMoisture: {
      value: percentileFromHistogram(pooledMoist, 0.58),
      targetPercentile: 58,
      field: 'moisture',
      description: '58th percentile — marsh minimum moisture',
    },

    // Temperature-derived (placeholder for Phase A ice terrain)
    freezeTempMax: {
      value: percentileFromHistogram(pooledTemp, 0.15),
      targetPercentile: 15,
      field: 'temperature',
      description: '15th percentile — freeze threshold (placeholder)',
    },
  };

  // ── Slope normalization ────────────────────────────────────────────
  allDeltas.sort((a, b) => a - b);
  const slopeNormalization = percentileFromValues(allDeltas, 0.95);

  // ── Assemble result ────────────────────────────────────────────────
  return {
    quantileLUTs: {
      elevation:  Array.from(elevLUT),
      moisture:   Array.from(moistLUT),
      temperature: Array.from(tempLUT),
      slope:      Array.from(slopeLUT),
    },
    thresholds,
    slopeNormalization,
    meta: {
      seedCount: seeds.length,
      radii,
      fieldsSampled: ['elevation', 'moisture', 'temperature', 'slope'],
      noiseConfigFingerprint: fingerprintNoiseConfig(NC),
      dateGenerated: new Date().toISOString(),
      version: 1,
    },
  };
}

// ---------------------------------------------------------------------------
// Derive thresholds from pre-collected data (used by batchRunner)
// ---------------------------------------------------------------------------

/**
 * Derive thresholds and quantile LUTs from already-collected histogram data.
 *
 * Unlike calibratePipeline(), this does NOT call collectHistograms() or
 * collectRawSlopeDeltas() — it receives the already-collected arrays,
 * pools them, and computes thresholds + LUTs.
 *
 * @param {object} histData - { elev, moist, temp, slope } — each is an array of Uint32Array histograms
 * @param {number[]|Float64Array[]} slopeDeltas  - Raw per-tile average neighbor deltas, or null
 * @param {object} [meta] - Optional metadata to attach to result
 * @returns {object} { quantileLUTs, thresholds, slopeNormalization, meta }
 */
export function deriveThresholds(histData, slopeDeltas, meta = {}) {
  // ── Pool histograms per field ──────────────────────────────────────
  const pooledElev  = poolHistograms(histData.elev);
  const pooledMoist = poolHistograms(histData.moist);
  const pooledTemp  = poolHistograms(histData.temp);
  const pooledSlope = poolHistograms(histData.slope);

  // ── Build quantile LUTs (256-entry) ────────────────────────────────
  const elevLUT  = buildQuantileLUT(pooledElev);
  const moistLUT = buildQuantileLUT(pooledMoist);
  const tempLUT  = buildQuantileLUT(pooledTemp);
  const slopeLUT = buildQuantileLUT(pooledSlope);

  // ── Derive thresholds from pooled histograms ───────────────────────
  const thresholds = {
    waterMaxElevation: {
      value: percentileFromHistogram(pooledElev, 0.12),
      targetPercentile: 12,
      field: 'elevation',
      description: '12th percentile — ~12% water coverage',
    },
    mountainThreshold: {
      value: percentileFromHistogram(pooledElev, 0.90),
      targetPercentile: 90,
      field: 'elevation',
      description: '90th percentile — top 10% elevation',
    },
    peakThreshold: {
      value: percentileFromHistogram(pooledElev, 0.97),
      targetPercentile: 97,
      field: 'elevation',
      description: '97th percentile — top 3% elevation',
    },
    floatingIslandThreshold: {
      value: percentileFromHistogram(pooledElev, 0.995),
      targetPercentile: 99.5,
      field: 'elevation',
      description: '99.5th percentile — top 0.5% elevation',
    },
    hillElevationMin: {
      value: percentileFromHistogram(pooledElev, 0.55),
      targetPercentile: 55,
      field: 'elevation',
      description: '55th percentile — hill starting elevation',
    },
    marshMaxElevation: {
      value: percentileFromHistogram(pooledElev, 0.35),
      targetPercentile: 35,
      field: 'elevation',
      description: '35th percentile — max elevation for marsh',
    },

    forestMinMoisture: {
      value: percentileFromHistogram(pooledMoist, 0.72),
      targetPercentile: 72,
      field: 'moisture',
      description: '72nd percentile — forest minimum moisture',
    },
    denseForestMinMoisture: {
      value: percentileFromHistogram(pooledMoist, 0.85),
      targetPercentile: 85,
      field: 'moisture',
      description: '85th percentile — dense forest minimum moisture',
    },
    desertMaxMoisture: {
      value: percentileFromHistogram(pooledMoist, 0.20),
      targetPercentile: 20,
      field: 'moisture',
      description: '20th percentile — desert maximum moisture',
    },
    marshMinMoisture: {
      value: percentileFromHistogram(pooledMoist, 0.58),
      targetPercentile: 58,
      field: 'moisture',
      description: '58th percentile — marsh minimum moisture',
    },

    freezeTempMax: {
      value: percentileFromHistogram(pooledTemp, 0.15),
      targetPercentile: 15,
      field: 'temperature',
      description: '15th percentile — freeze threshold (placeholder)',
    },
  };

  // ── Slope normalization ────────────────────────────────────────────
  let slopeNormalization = 0.010; // fallback
  if (slopeDeltas && slopeDeltas.length > 0) {
    const sorted = [...slopeDeltas].sort((a, b) => a - b);
    const idx = Math.floor((sorted.length - 1) * 0.95);
    slopeNormalization = sorted[idx];
  }

  return {
    quantileLUTs: {
      elevation:  Array.from(elevLUT),
      moisture:   Array.from(moistLUT),
      temperature: Array.from(tempLUT),
      slope:      Array.from(slopeLUT),
    },
    thresholds,
    slopeNormalization,
    meta: {
      seedCount: meta.seedCount || 0,
      radii: meta.radii || [],
      fieldsSampled: ['elevation', 'moisture', 'temperature', 'slope'],
      noiseConfigFingerprint: meta.noiseConfigFingerprint || fingerprintNoiseConfig(NOISE_CONFIG),
      dateGenerated: meta.dateGenerated || new Date().toISOString(),
      version: 1,
    },
  };
}

// ---------------------------------------------------------------------------
// Export serialization
// ---------------------------------------------------------------------------

/**
 * Create a JSON-serializable calibration export object.
 *
 * By default, quantile LUTs are excluded to keep the file compact (~50 lines
 * of thresholds + meta). Pass { includeLUTs: true } for the full dump.
 *
 * @param {object} calibrationResult - Output from calibratePipeline()
 * @param {object} [opts]
 * @param {boolean} [opts.includeLUTs=false] - Include the 4×256-entry LUT arrays
 * @returns {object} JSON-safe calibration document
 */
export function exportCalibrationV1(calibrationResult, { includeLUTs = false } = {}) {
  const { quantileLUTs, thresholds, slopeNormalization, meta } = calibrationResult;

  const doc = {
    $schema: 'dev/mapgen_update/calibration_v1.schema.json',
    title: 'Phase 0 Calibration — Terrain Generation Redesign',
    description: 'Percentile thresholds derived from pooled histogram data. Thresholds remain valid through Phases B and F provided the LUTs are regenerated after each distribution change.',

    thresholds,
    slopeNormalization: {
      value: slopeNormalization,
      method: '95th percentile of per-tile average neighbor elevation deltas',
      description: 'Default divisor for slope computation: sum of 6 neighbor elevation deltas / this value → normalized slope [0, 1]',
    },

    meta: {
      ...meta,
      thresholdCount: Object.keys(thresholds).length,
      includedThresholds: Object.keys(thresholds),
    },
  };

  if (includeLUTs) {
    doc.quantileLUTs = quantileLUTs;
    doc.description += ' Includes quantile LUTs.';
  }

  return doc;
}

// ---------------------------------------------------------------------------
// Formatting for UI display
// ---------------------------------------------------------------------------

/**
 * Format calibration pipeline results as a text report for the stats panel.
 *
 * @param {object} result - Output from calibratePipeline()
 * @returns {string}
 */
export function formatCalibrationReport(result) {
  const { quantileLUTs, thresholds, slopeNormalization, meta } = result;
  const lines = [];

  lines.push('=== Threshold Derivation ===');
  lines.push(`  ${meta.seedCount} seeds × radii [${meta.radii.join(', ')}]`);
  lines.push('');

  // ── Thresholds ────────────────────────────────────────────────────
  lines.push('Derived Thresholds (raw values at target percentiles):');
  lines.push('');

  const entries = [
    { label: 'waterMaxElevation',      key: 'waterMaxElevation',      color: '#5f9ac1' },
    { label: 'mountainThreshold',       key: 'mountainThreshold',       color: '#877c6a' },
    { label: 'peakThreshold',           key: 'peakThreshold',           color: '#b0b8c8' },
    { label: 'floatingIslandThreshold', key: 'floatingIslandThreshold', color: '#c0d8e8' },
    { label: 'hillElevationMin',        key: 'hillElevationMin',        color: '#aaa' },
    { label: 'marshMaxElevation',       key: 'marshMaxElevation',       color: '#819967' },
    { label: 'forestMinMoisture',       key: 'forestMinMoisture',       color: '#4b8e41' },
    { label: 'denseForestMinMoisture',  key: 'denseForestMinMoisture',  color: '#2d6b23' },
    { label: 'desertMaxMoisture',       key: 'desertMaxMoisture',       color: '#d6b15b' },
    { label: 'marshMinMoisture',        key: 'marshMinMoisture',        color: '#819967' },
    { label: 'freezeTempMax',           key: 'freezeTempMax',           color: '#7ec8e3' },
  ];

  for (const e of entries) {
    const t = thresholds[e.key];
    if (!t) continue;
    lines.push(
      `  ${e.label.padEnd(28)} ${t.value.toFixed(4)}  (p${t.targetPercentile}, ${t.field})`
    );
  }

  lines.push('');
  lines.push(`Slope normalization:  ${slopeNormalization.toFixed(4)}  (95th percentile of per-tile avg deltas)`);
  lines.push('');

  // ── LUT sanity checks ─────────────────────────────────────────────
  lines.push('Quantile LUT sanity (raw → normalized):');
  const lutChecks = [
    { key: 'elevation',    label: 'Elevation' },
    { key: 'moisture',     label: 'Moisture' },
    { key: 'temperature',  label: 'Temperature' },
    { key: 'slope',        label: 'Slope' },
  ];

  for (const lc of lutChecks) {
    const lut = quantileLUTs[lc.key];
    if (!lut) continue;
    // Rebuild Float32Array for normalizeField
    const lutArray = new Float32Array(lut);
    const check10 = normalizeField(0.10, lutArray).toFixed(4);
    const check50 = normalizeField(0.50, lutArray).toFixed(4);
    const check90 = normalizeField(0.90, lutArray).toFixed(4);
    lines.push(`  ${lc.label.padEnd(14)} raw:0.10→${check10}  0.50→${check50}  0.90→${check90}`);
  }

  lines.push('');
  lines.push('---');
  lines.push('Thresholds are raw values at the target percentile of the pooled');
  lines.push('distribution. They remain stable when Phases B/F change the composite.');
  lines.push('Only the quantile LUTs need regeneration after those phases.');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Create a compact hash/fingerprint of the noise config for tracking.
 *
 * @param {object} nc - Noise config object
 * @returns {string} Short hex fingerprint
 */
function fingerprintNoiseConfig(nc) {
  let s = '';
  for (const [key, val] of Object.entries(nc)) {
    if (typeof val === 'object' && val !== null) {
      s += `${key}:${val.frequency}/${val.octaves}/${val.lacunarity}/${val.gain}|`;
    } else if (typeof val === 'number') {
      s += `${key}:${val.toString(16)}|`;
    }
  }
  // Simple hash
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
