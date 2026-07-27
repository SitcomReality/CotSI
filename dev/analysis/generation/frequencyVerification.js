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

// ---------------------------------------------------------------------------
// Field registry — matches overview §4.1 table
// ---------------------------------------------------------------------------

const FIELDS_TO_VERIFY = [
  {
    label: 'CONTINENT',
    seedOffset: 0x4E9D3A7F,
    config: { octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.0008 },
    target: '2-4 landmasses on radius-50',
  },
  {
    label: 'ELEVATION_DETAIL',
    seedOffset: 0x7B2C1E8D,
    config: { octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.020 },
    target: '~10-hex local relief',
  },
  {
    label: 'RIDGE',
    seedOffset: 0x3F5A9B2C,
    config: { octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.008 },
    target: '~25-hex mountain chains',
  },
  {
    label: 'MOISTURE',
    seedOffset: 0x8C6E4F1A,
    config: { octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.006 },
    target: 'broad wet/dry bands',
  },
  {
    label: 'TEMP_VARIATION',
    seedOffset: 0x2D7B8E3F,
    config: { octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.08 },
    target: 'local temp noise',
  },
  {
    label: 'REGION',
    seedOffset: 0x5A1C9D6E,
    config: { octaves: 2, lacunarity: 2.0, gain: 0.5, frequency: 0.0015 },
    target: '4-6 biome regions on radius-50',
  },
];

// ---------------------------------------------------------------------------
// Verify a single noise field
// ---------------------------------------------------------------------------

/**
 * Count zero-crossings of (value - 0.5) for a noise field sampled over
 * the hex grid within `radius`. Also reports world-space extent.
 *
 * @param {number} seed        - Integer seed (from stringSeed)
 * @param {object} noiseOpts   - FBM options passed to hexFbm2D
 * @param {number} radius      - Map radius in hexes
 * @returns {{ crossings: number, totalTiles: number, worldWidth: number }}
 */
function countCrossings(seed, noiseOpts, radius) {
  const tiles = hexesWithinRadius(radius);

  const values = tiles.map(({ q, r }) =>
    hexFbm2D(q, r, seed, noiseOpts)
  );

  const valueMap = new Map();
  for (let i = 0; i < tiles.length; i++) {
    valueMap.set(`${tiles[i].q},${tiles[i].r}`, values[i]);
  }

  // Group by row (r) and count sign changes of (value - 0.5) along q
  const byRow = new Map();
  for (let i = 0; i < tiles.length; i++) {
    const { q, r } = tiles[i];
    if (!byRow.has(r)) byRow.set(r, []);
    byRow.get(r).push({ q, v: values[i] });
  }

  let crossings = 0;
  for (const [, row] of byRow) {
    row.sort((a, b) => a.q - b.q);
    for (let i = 1; i < row.length; i++) {
      const prev = row[i - 1].v - 0.5;
      const curr = row[i].v - 0.5;
      if ((prev >= 0) !== (curr >= 0)) crossings++;
    }
  }

  // World-space extent at the far edge of the map
  // For a hex grid spanning [-radius, radius] in both q and r,
  // the world-space corner is at hexToWorld(radius, -radius)
  const { x: maxX, y: maxY } = hexToWorld(radius, -radius);
  const worldWidth = Math.abs(maxX * 2);   // approximate map width

  return { crossings, totalTiles: tiles.length, worldWidth };
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

  for (const field of FIELDS_TO_VERIFY) {
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
  lines.push(`Map radius: ${results.length > 0 ? 50 : '?'}  |  Tiles: ${results[0]?.totalTiles || 0}`);
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
