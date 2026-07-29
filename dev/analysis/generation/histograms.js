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
import { hexFbm2D, hexRidgedFbm2D, hexToWorld } from '../../../src/engine/rules/noise.js';
import { stringSeed } from '../../../src/engine/rules/seededRng.js';
import { hexesWithinRadius, neighbors, coordKey } from '../../../src/engine/rules/hexGrid.js';
import { DEFAULT_TERRAIN_RULES } from '../../../src/params/game/worldParams.js';

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
  const ridges = hexRidgedFbm2D(q, r, baseSeed + NC.SEED_RIDGE,  NC.RIDGE);

  // World shape: quadratic falloff — narrower ocean ring, less zero-mass
  function worldShape(distFromCenter, mapRadius) {
    return 1.0 - ((distFromCenter / mapRadius) ** 2);
  }

  // Distance from map center (0,0) in hex units
  const hdQ = Math.abs(q);
  const hdR = Math.abs(r);
  const hdS = Math.abs(-q - r);
  const distFromCenter = Math.max(hdQ, hdR, hdS);

  const rawElev = worldShape(distFromCenter, radius) * (detail * 0.50 + ridges * 0.50);
  // Hypsometric curve spreads the low-mid elevation range
  const elevation = Math.pow(rawElev, 0.6);

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
  // Lapse rate references DEFAULT_TERRAIN_RULES.waterMaxElevation so the
  // temperature formula stays in sync with the game code automatically.
  const temperature = clamp01(
    0.5 + 0.55 * (latitudeTerm - 0.5) + 0.12 * (tempVariation - 0.5) - 0.30 * (elevation - DEFAULT_TERRAIN_RULES.waterMaxElevation)
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
// Tile-based histogram collection
// ---------------------------------------------------------------------------

/**
 * Collect 50-bin histograms from generated tile objects.
 *
 * Iterates the tile objects produced by generateSingleSeed and bins
 * the actual field values that classifyTerrain uses — adjusted moisture,
 * composited elevation, and temperature — into 50-bin histograms.
 *
 * When landOnly is true, tiles with terrain 'water' or 'ice' are skipped,
 * producing histograms for land tiles only. This avoids water/ice tiles
 * inflating moisture percentiles (desert tuning uses land-only moisture).
 *
 * @param {object} tiles  - Tile objects keyed by "q,r" string
 * @param {object} [opts]
 * @param {boolean} [opts.landOnly=false] - Skip water and ice tiles
 * @returns {{ elevHist: Uint32Array, moistHist: Uint32Array,
 *             tempHist: Uint32Array, tileCount: number }}
 */
export function collectTileHistograms(tiles, opts = { landOnly: false }) {
  const BINS = 50;

  const elevHist  = new Uint32Array(BINS);
  const moistHist = new Uint32Array(BINS);
  const tempHist  = new Uint32Array(BINS);
  let tileCount = 0;

  for (const key of Object.keys(tiles)) {
    const tile = tiles[key];
    if (opts.landOnly && (tile.terrain === 'water' || tile.terrain === 'ice')) continue;

    const elevBin  = Math.min(BINS - 1, Math.floor(clamp01(tile.elevationField) * BINS));
    const moistBin = Math.min(BINS - 1, Math.floor(clamp01(tile.moisture) * BINS));
    const tempBin  = Math.min(BINS - 1, Math.floor(clamp01(tile.temperature) * BINS));
    elevHist[elevBin]++;
    moistHist[moistBin]++;
    tempHist[tempBin]++;
    tileCount++;
  }

  return { elevHist, moistHist, tempHist, tileCount };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
