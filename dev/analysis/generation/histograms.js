/**
 * histograms.js — Histogram collection for noise field distribution analysis.
 *
 * Provides provisional sampleBaseFields (matching the Phase A spec) and
 * histogram collection across entire maps. Used by the calibration pipeline
 * in Phase 0 to measure actual noise output distributions.
 *
 * The provisional sampleBaseFields lives here during Phase 0 and moves to
 * terrainGenerator.js in Phase A when the pipeline is rebuilt.
 *
 * Threshold derivation and slope normalization live in thresholdDerivation.js,
 * which consumes the histograms and percentiles exported here.
 *
 * Pure: no DOM, no state, no side effects.
 */
import { hexFbm2D, hexToWorld } from '../../../src/engine/rules/noise.js';
import { stringSeed } from '../../../src/engine/rules/seededRng.js';
import { hexesWithinRadius, neighbors, coordKey } from '../../../src/engine/rules/hexGrid.js';

// ---------------------------------------------------------------------------
// Provisional sampleBaseFields (Phase A target pipeline)
// ---------------------------------------------------------------------------

/**
 * Sample base physical fields at a global hex coordinate.
 *
 * Matches the Phase A specification from overview.md §5.
 * - Elevation: single additive FBM field (detail + ridges placeholder, worldShape applied in Phase B)
 * - Moisture: raw FBM, no water adjustment yet
 * - Temperature: latitude + lapse rate + local variation
 * - Region bias: two independent low-freq bias fields
 *
 * All values are raw FBM output [0, 1] — quantile normalization is applied
 * as a separate step after all tiles are sampled.
 *
 * @param {number} baseSeed    - Integer seed from stringSeed(seedText)
 * @param {number} q           - Global hex q
 * @param {number} r           - Global hex r
 * @param {object} noiseConfig - Noise config object with fields:
 *   { ELEVATION_DETAIL, RIDGE, MOISTURE, TEMP_VARIATION, REGION,
 *     SEED_DETAIL, SEED_RIDGE, SEED_MOISTURE, SEED_TEMP,
 *     SEED_REGION_M, SEED_REGION_T }
 * @param {number} radius      - Map radius (for latitude calculation)
 * @returns {object} { elevation, detail, ridges, baseMoisture,
 *                     temperature, regionBiasM, regionBiasT }
 */
export function sampleBaseFields(baseSeed, q, r, noiseConfig, radius) {
  const NC = noiseConfig;

  // ── Elevation: 2-layer additive composite shaped by worldShape ──
  const detail = hexFbm2D(q, r, baseSeed + NC.SEED_DETAIL, NC.ELEVATION_DETAIL);
  const ridges = hexFbm2D(q, r, baseSeed + NC.SEED_RIDGE,  NC.RIDGE);

  // World shape: center peak, dropping to zero at the border
  function worldShape(distFromCenter, mapRadius) {
    return 1.0 - (distFromCenter / mapRadius);
  }

  // Distance from map center (0,0) in hex units
  const hdQ = Math.abs(q);
  const hdR = Math.abs(r);
  const hdS = Math.abs(-q - r);
  const distFromCenter = Math.max(hdQ, hdR, hdS);

  const rawElev = worldShape(distFromCenter, radius) * (detail * 0.50 + ridges * 0.50);
  const elevation = clamp01(rawElev);

  // ── Moisture ─────────────────────────────────────────────────────────
  const baseMoisture = hexFbm2D(q, r, baseSeed + NC.SEED_MOISTURE, NC.MOISTURE);

  // ── Temperature ──────────────────────────────────────────────────────
  // Latitude from world-space Y coordinate
  const { y } = hexToWorld(q, r);
  // worldRadiusY: hex row spacing ≈ √3 ≈ 1.732. The exact value depends
  // on hexToWorld's y-scaling of 0.866 × 2 = 1.732 for the full diameter.
  const worldRadiusY = radius * 1.7320508;
  const latitudeTerm = 1.0 - (Math.abs(y) / worldRadiusY);
  const tempVariation = hexFbm2D(q, r, baseSeed + NC.SEED_TEMP, NC.TEMP_VARIATION);

  // Temperature formula: base latitude + local variation - elevation lapse
  // waterMaxElevation reference (0.12) is a percentile placeholder —
  // Phase 0 calibration will set the actual value.
  const temperature = clamp01(
    0.5 + 0.35 * (latitudeTerm - 0.5) + 0.10 * (tempVariation - 0.5) - 0.30 * (elevation - 0.12)
  );

  // ── Region bias (two independent fields) ─────────────────────────────
  const regionBiasM = hexFbm2D(q, r, baseSeed + NC.SEED_REGION_M, NC.REGION);
  const regionBiasT = hexFbm2D(q, r, baseSeed + NC.SEED_REGION_T, NC.REGION);

  return {
    elevation: clamp01(elevation),
    detail,
    ridges,     // raw value returned for analysis (weight=0 in composite)
    baseMoisture,
    temperature,
    regionBiasM,
    regionBiasT,
  };
}

// ---------------------------------------------------------------------------
// Histogram collection
// ---------------------------------------------------------------------------

/**
 * Collect 50-bin histograms of all continuous fields for a generated map.
 *
 * Samples every hex within the map radius, computes provisional elevation,
 * moisture, temperature, and slope values, and bins them.
 *
 * @param {string} seedText     - Seed string (e.g. 'glut-17')
 * @param {number} radius       - Map radius in hexes
 * @param {object} noiseConfig  - Noise config (same shape as sampleBaseFields)
 * @returns {object} { elevHist, moistHist, tempHist, slopeHist, tileCount }
 *   Each hist is a Uint32Array(50).
 */
export function collectHistograms(seedText, radius, noiseConfig) {
  const seed = stringSeed(seedText);
  const BINS = 50;

  const elevHist  = new Uint32Array(BINS);
  const moistHist = new Uint32Array(BINS);
  const tempHist  = new Uint32Array(BINS);
  const slopeHist = new Uint32Array(BINS);

  const tiles = hexesWithinRadius(radius);

  // Sample all fields
  const samples = tiles.map(({ q, r }) =>
    sampleBaseFields(seed, q, r, noiseConfig, radius)
  );

  // Build elevation lookup for slope computation
  const elevationMap = new Map();
  for (let i = 0; i < tiles.length; i++) {
    elevationMap.set(coordKey(tiles[i]), samples[i].elevation);
  }

  for (let i = 0; i < tiles.length; i++) {
    const s = samples[i];

    // Bin raw values
    const elevBin  = Math.min(BINS - 1, Math.floor(s.elevation * BINS));
    const moistBin = Math.min(BINS - 1, Math.floor(s.baseMoisture * BINS));
    const tempBin  = Math.min(BINS - 1, Math.floor(s.temperature * BINS));
    elevHist[elevBin]++;
    moistHist[moistBin]++;
    tempHist[tempBin]++;

    // Compute raw slope (average neighbor elevation delta)
    let totalDiff = 0;
    let neighborCount = 0;
    for (const n of neighbors(tiles[i])) {
      const nElev = elevationMap.get(coordKey(n));
      if (nElev !== undefined) {
        totalDiff += Math.abs(nElev - s.elevation);
        neighborCount++;
      }
    }
    const slope = neighborCount > 0 ? totalDiff / neighborCount : 0;
    const slopeBin = Math.min(BINS - 1, Math.floor(clamp01(slope) * BINS));
    slopeHist[slopeBin]++;
  }

  return { elevHist, moistHist, tempHist, slopeHist, tileCount: tiles.length };
}

/**
 * Compute a percentile threshold from a histogram.
 *
 * @param {Uint32Array} hist  - Bin counts (e.g. from collectHistograms)
 * @param {number} p         - Percentile target [0, 1]
 * @returns {number} The raw value at the given percentile, in [0, 1]
 */
export function percentileFromHistogram(hist, p) {
  const total = hist.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const target = total * p;
  let cumulative = 0;
  for (let bin = 0; bin < hist.length; bin++) {
    cumulative += hist[bin];
    if (cumulative >= target) return bin / hist.length;
  }
  return 1.0;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
