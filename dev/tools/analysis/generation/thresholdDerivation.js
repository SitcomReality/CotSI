/**
 * thresholdDerivation.js — Threshold derivation from pooled histogram data.
 *
 * Pools pre-collected histograms, builds quantile LUTs, and derives
 * percentile-based terrain thresholds. Used by batchRunner.
 *
 * Pure: no DOM, no state, no side effects.
 */
import { fingerprint } from '../batch/fingerprint.js';
import { percentileFromHistogram } from './histograms.js';
import { poolHistograms, buildQuantileLUT } from './quantileLUT.js';
import { NOISE_CONFIG } from './noiseConfig.js';

// ---------------------------------------------------------------------------
// Threshold derivation
// ---------------------------------------------------------------------------

/**
 * Build the thresholds object from pooled histograms.
 *
 * Threshold percentiles are taken from the Phase 0 target budget table (§4.5):
 *
 *   Field       | Threshold               | Target percentile
 *   ------------|-------------------------|------------------
 *   Elevation   | waterMaxElevation       | p12  (12th %ile)
 *   Elevation   | mountainThreshold       | p97  (top ~3% — capstone)
 *   Elevation   | plateauThreshold        | p90  (top ~10% — highland floor)
 *   Elevation   | hillElevationMin        | p55
 *   Elevation   | marshMaxElevation       | p35
 *   Moisture    | forestMinMoisture       | p72
 *   Moisture    | denseForestMinMoisture  | p85
 *   Moisture    | desertMaxMoisture       | p20
 *   Moisture    | marshMinMoisture        | p58
 *   Temperature | freezeTempMax           | p15 (placeholder for ice)
 *
 * @param {Uint32Array} pooledElev  - Pooled elevation histogram
 * @param {Uint32Array} pooledMoist - Pooled moisture histogram
 * @param {Uint32Array} pooledTemp  - Pooled temperature histogram
 * @returns {object} Thresholds object with value, targetPercentile, field, description
 */
function buildThresholds(pooledElev, pooledMoist, pooledTemp) {
  return {
    // Elevation-derived
    waterMaxElevation: {
      value: percentileFromHistogram(pooledElev, 0.12),
      targetPercentile: 12,
      field: 'elevation',
      description: '12th percentile — ~12% water coverage',
    },
    mountainThreshold: {
      value: percentileFromHistogram(pooledElev, 0.97),
      targetPercentile: 97,
      field: 'elevation',
      description: '97th percentile — top ~3% elevation (mountain capstone)',
    },
    plateauThreshold: {
      value: percentileFromHistogram(pooledElev, 0.90),
      targetPercentile: 90,
      field: 'elevation',
      description: '90th percentile — highland floor for plateau',
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
}

/**
 * Build the quantile LUTs object from pooled histograms.
 *
 * @param {Uint32Array} pooledElev  - Pooled elevation histogram
 * @param {Uint32Array} pooledMoist - Pooled moisture histogram
 * @param {Uint32Array} pooledTemp  - Pooled temperature histogram
 * @param {Uint32Array} pooledSlope - Pooled slope histogram
 * @returns {object} { elevation, moisture, temperature, slope }
 */
function buildQuantileLUTs(pooledElev, pooledMoist, pooledTemp, pooledSlope) {
  return {
    elevation:  Array.from(buildQuantileLUT(pooledElev)),
    moisture:   Array.from(buildQuantileLUT(pooledMoist)),
    temperature: Array.from(buildQuantileLUT(pooledTemp)),
    slope:      Array.from(buildQuantileLUT(pooledSlope)),
  };
}

// ---------------------------------------------------------------------------
// Derive thresholds from pre-collected data (used by batchRunner)
// ---------------------------------------------------------------------------

/**
 * Derive thresholds and quantile LUTs from already-collected histogram data.
 *
 * Unlike a full pipeline run, this does NOT call collectHistograms() or
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

  // ── Derive thresholds from pooled histograms ───────────────────────
  const thresholds = buildThresholds(pooledElev, pooledMoist, pooledTemp);

  // ── Slope normalization ────────────────────────────────────────────
  let slopeNormalization = 0.010; // fallback
  if (slopeDeltas && slopeDeltas.length > 0) {
    const sorted = [...slopeDeltas].sort((a, b) => a - b);
    const idx = Math.floor((sorted.length - 1) * 0.95);
    slopeNormalization = sorted[idx];
  }

  return {
    quantileLUTs: buildQuantileLUTs(pooledElev, pooledMoist, pooledTemp, pooledSlope),
    thresholds,
    slopeNormalization,
    meta: {
      seedCount: meta.seedCount || 0,
      radii: meta.radii || [],
      fieldsSampled: ['elevation', 'moisture', 'temperature', 'slope'],
      noiseConfigFingerprint: meta.noiseConfigFingerprint || fingerprint(NOISE_CONFIG),
      dateGenerated: meta.dateGenerated || new Date().toISOString(),
      version: 1,
    },
  };
}
