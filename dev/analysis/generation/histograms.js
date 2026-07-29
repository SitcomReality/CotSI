/**
 * histograms.js — Histogram collection for noise field distribution analysis.
 *
 * Collects histograms across entire maps for the calibration pipeline.
 * The sampleBaseFields function it needs is imported directly from the game's
 * terrain generator so histogram data always reflects the live game code.
 *
 * Threshold derivation and slope normalization live in thresholdDerivation.js,
 * which consumes the histograms and percentiles exported here.
 *
 * Pure: no DOM, no state, no side effects.
 */
import { stringSeed } from '../../../src/engine/rules/seededRng.js';
import { hexesWithinRadius, neighbors, coordKey } from '../../../src/engine/rules/hexGrid.js';
import { sampleBaseFields } from '../../../src/game/rules/terrainGen/index.js';

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
