/**
 * frequencyVerification.js — Noise frequency verification utility.
 *
 * Samples all planned noise fields across a radius-50 map and reports
 * effective frequencies via zero-crossing counting. This validates or
 * corrects the frequency constants in the mapgen redesign plan docs.
 *
 * Pure: no DOM, no state, no side effects.
 */
import { hexFbm2D, hexToWorld } from '../../../src/engine/rules/noise.js';
import { stringSeed } from '../../../src/engine/rules/seededRng.js';
import { hexesWithinRadius } from '../../../src/engine/rules/hexGrid.js';
import { getNoiseConfig, SEED_DETAIL, SEED_RIDGE, SEED_MOISTURE, SEED_TEMP, SEED_REGION_M } from './noiseConfig.js';

// ---------------------------------------------------------------------------
// Field registry — reads from noiseConfig.js (single source of truth).
// Targets are design goals for Phase 0 calibration verification.
// ---------------------------------------------------------------------------

function seedOffsetFor(fieldKey) {
  const map = {
    ELEVATION_DETAIL: SEED_DETAIL,
    RIDGE:           SEED_RIDGE,
    MOISTURE:        SEED_MOISTURE,
    TEMP_VARIATION:  SEED_TEMP,
    REGION:          SEED_REGION_M,
  };
  return map[fieldKey] ?? 0;
}

const FIELD_LABELS = {
  ELEVATION_DETAIL:  'Elevation detail',
  RIDGE:            'Ridge noise',
  MOISTURE:         'Moisture',
  TEMP_VARIATION:   'Temperature variation',
  REGION:           'Region bias',
};

const FIELD_TARGETS = {
  ELEVATION_DETAIL:  '~10-hex local relief',
  RIDGE:            '~25-hex mountain chains',
  MOISTURE:         'broad wet/dry bands',
  TEMP_VARIATION:   'local temp noise',
  REGION:           '4-6 biome regions on radius-50',
};

function getFieldsToVerify(radius) {
  const nc = getNoiseConfig(radius);
  const keys = ['ELEVATION_DETAIL', 'RIDGE', 'MOISTURE', 'TEMP_VARIATION', 'REGION'];
  return keys.map(k => ({
    label: FIELD_LABELS[k],
    key: k,
    seedOffset: seedOffsetFor(k),
    config: { ...nc[k] },
    target: FIELD_TARGETS[k],
  }));
}

// ---------------------------------------------------------------------------
// Verify a single noise field
// ---------------------------------------------------------------------------

/**
 * Count zero-crossings of (value - 0.5) for a noise field along a single
 * transect across the map's central row (r=0, q from -radius to +radius).
 * A single-row transect gives an accurate 1D measurement; summing across
 * all rows inflates the count by ~(2*radius+1) and produces wavelengths
 * of ~2-3 hexes regardless of the actual noise frequency.
 *
 * @param {number} seed        - Integer seed (from stringSeed)
 * @param {object} noiseOpts   - FBM options passed to hexFbm2D
 * @param {number} radius      - Map radius in hexes
 * @returns {{ crossings: number, totalTiles: number, worldWidth: number }}
 */
function countCrossings(seed, noiseOpts, radius) {
  const tiles = hexesWithinRadius(radius);

  // Select only tiles on the central row (r=0) for a 1D transect
  const transect = tiles
    .filter(t => t.r === 0)
    .map(t => ({ q: t.q, v: hexFbm2D(t.q, t.r, seed, noiseOpts) }))
    .sort((a, b) => a.q - b.q);

  // Count sign changes of (value - 0.5) along the transect
  let crossings = 0;
  for (let i = 1; i < transect.length; i++) {
    const prev = transect[i - 1].v - 0.5;
    const curr = transect[i].v - 0.5;
    if ((prev >= 0) !== (curr >= 0)) crossings++;
  }

  // World-space width of the transect: hexToWorld(r=0) = x = q, so
  // from q=-radius to q=+radius the width is 2*radius world units.
  const worldWidth = radius * 2;

  return { crossings, totalTiles: transect.length, worldWidth };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Verify frequency for all registered noise fields.
 *
 * @param {string} [seedText='glut-17'] - Seed string for reproducibility
 * @param {number} [radius=50]           - Map radius (larger = more accurate)
 * @returns {object[]} Array of per-field results with verdict
 */
export function verifyFrequency(seedText = 'glut-17', radius = 50) {
  const seed = stringSeed(seedText);

  const results = [];

  const fieldsToVerify = getFieldsToVerify(radius);
  for (const field of fieldsToVerify) {
    const { crossings, totalTiles, worldWidth } = countCrossings(
      seed + field.seedOffset,
      field.config,
      radius,
    );

    // Each full cycle = 2 zero-crossings
    const halfCycles = crossings / 2;
    const effectiveWavelengthHexes = halfCycles > 0
      ? (radius * 2) / halfCycles
      : Infinity;

    const effectiveWavelengthWorld = halfCycles > 0
      ? worldWidth / halfCycles
      : Infinity;

    results.push({
      field: field.label,
      configFrequency: field.config.frequency,
      octaves: field.config.octaves,
      target: field.target,
      mapRadius: radius,
      crossings,
      totalTiles,
      halfCycles: halfCycles.toFixed(1),
      effectiveWavelengthWorldUnits: effectiveWavelengthWorld.toFixed(0),
      effectiveWavelengthHexes: effectiveWavelengthHexes === Infinity
        ? 'Infinity'
        : effectiveWavelengthHexes.toFixed(1),
      verdict: null, // filled by human inspection
    });
  }

  return results;
}

/**
 * Format verification results as a human-readable report.
 *
 * @param {object[]} results - Output of verifyFrequency()
 * @returns {string}
 */
export function formatFrequencyReport(results) {
  const lines = [];
  lines.push('=== Frequency Verification Report ===');
  const r = results[0]?.mapRadius ?? '?';
  const n = results[0]?.totalTiles ?? 0;
  lines.push(`Map radius: ${r}  |  Tiles: ${n}`);
  lines.push('');

  for (const r of results) {
    lines.push(`${r.field.padEnd(20)}  freq=${String(r.configFrequency).padEnd(8)}  oct=${r.octaves}`);
    lines.push(`  Target: ${r.target}`);
    lines.push(`  Zero-crossings: ${r.crossings} (${r.halfCycles} half-cycles)`);
    lines.push(`  Effective wavelength: ${r.effectiveWavelengthWorldUnits} world units  (~${r.effectiveWavelengthHexes} hexes)`);
    lines.push('');
  }

  // hexToWorld rescaling documentation
  lines.push('--- hexToWorld rescaling ---');
  lines.push('hexToWorld(q, r) = { x: q + r*0.5, y: r*0.8660254 }');
  lines.push('Adjacent hex spacing (q-direction): ~1.0 world units');
  lines.push('Adjacent hex spacing (r-direction): ~1.732 world units (√3)');
  lines.push('At frequency f, wavelength = 1/f world units.');
  lines.push('');
  lines.push('Raw config frequency assumes a 1:1 world-unit mapping.');
  lines.push('hexToWorld applies a y-axis stretch of √3/2 ≈ 0.866, so a unit');
  lines.push('step in r covers 0.866 world units in y but 0.5 in x (due to the');
  lines.push('q+r*0.5 skew). This means effective wavelengths differ from');
  lines.push('naive 1/f calculations — especially along the r-axis, where');
  lines.push('world-space distance between adjacent hex rows is ~0.866 units,');
  lines.push('not 1.0. The zero-crossing method above measures this directly.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Verify a single field against a target wavelength range and return a verdict.
 * Useful for automated checks during calibration.
 *
 * @param {object} fieldResult - Single entry from verifyFrequency()
 * @param {number} minHexWavelength - Minimum acceptable hex wavelength
 * @param {number} maxHexWavelength - Maximum acceptable hex wavelength
 * @returns {string} 'PASS', 'LOW', or 'HIGH'
 */
export function checkWavelength(fieldResult, minHexWavelength, maxHexWavelength) {
  const wl = parseFloat(fieldResult.effectiveWavelengthHexes);
  if (wl >= minHexWavelength && wl <= maxHexWavelength) return 'PASS';
  if (wl < minHexWavelength) return 'HIGH';  // more features than expected
  return 'LOW';  // fewer features than expected
}
