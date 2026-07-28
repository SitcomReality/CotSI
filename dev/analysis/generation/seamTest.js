/**
 * seamTest.js — Chunk-seam invariant verification.
 *
 * Verifies that terrain generation is a pure function of (seed, q, r):
 * every tile's elevationField, moisture, and temperature match what
 * sampleBaseFields() would produce at the same global coordinate.
 * This catches regressions where per-chunk state or global-pass residue
 * leaks into the continuous field values.
 *
 * The test generates a full map via generateSingleSeed (which assembles
 * chunks), then recomputes fields for each tile via direct sampleBaseFields
 * calls and asserts they match the stored values.
 *
 * Pure: no DOM, no state, no side effects beyond console.assert.
 */
import { generateSingleSeed } from './generate.js';
import { stringSeed } from '../../../src/engine/rules/seededRng.js';
import { sampleBaseFields } from '../../../src/game/rules/terrainGenerator.js';
import {
  NOISE_ELEVATION_DETAIL, NOISE_RIDGE, NOISE_MOISTURE, NOISE_TEMP_VARIATION, NOISE_REGION,
  SEED_DETAIL, SEED_RIDGE, SEED_MOISTURE, SEED_TEMP, SEED_REGION_M, SEED_REGION_T,
} from '../../../src/params/game/worldParams.js';

/** Noise config matching the module-level NOISE_CONFIG in terrainGenerator.js. */
const TEST_NOISE_CONFIG = {
  ELEVATION_DETAIL: NOISE_ELEVATION_DETAIL,
  RIDGE: NOISE_RIDGE,
  MOISTURE: NOISE_MOISTURE,
  TEMP_VARIATION: NOISE_TEMP_VARIATION,
  REGION: NOISE_REGION,
  SEED_DETAIL,
  SEED_RIDGE,
  SEED_MOISTURE,
  SEED_TEMP,
  SEED_REGION_M,
  SEED_REGION_T,
};

/** Test seed and radius. */
const TEST_SEED = 'glut-17';
const TEST_RADIUS = 21;

/**
 * Run the chunk-seam invariant test.
 *
 * Generates a map and verifies that every tile's elevationField, moisture,
 * and temperature match what a direct sampleBaseFields call would produce
 * for the same (seed, q, r).
 *
 * @returns {{ passed: boolean, failures: object[] }}
 *   Each failure: { q, r, field, stored, recomputed }
 */
export function runSeamTest() {
  const failures = [];

  try {
    const result = generateSingleSeed(TEST_SEED, TEST_RADIUS, null, {
      heightVariation: 1.0,
      wateriness: 1.0,
      mountainousness: 1.0,
    });
    const tiles = result.tiles;
    const baseSeed = stringSeed(TEST_SEED);

    const tileEntries = Object.values(tiles);
    if (tileEntries.length === 0) {
      return {
        passed: false,
        failures: [{ q: 0, r: 0, field: 'generation', stored: 'n/a', recomputed: 'no tiles generated' }],
      };
    }

    for (const tile of tileEntries) {
      const { q, r, elevationField, moisture, temperature } = tile;

      // Recompute fields directly via sampleBaseFields
      const fields = sampleBaseFields(baseSeed, q, r, TEST_NOISE_CONFIG, TEST_RADIUS);

      // Compare (allow tiny floating-point drift)
      if (Math.abs(elevationField - fields.elevation) > 1e-12) {
        failures.push({
          q, r, field: 'elevationField',
          stored: elevationField, recomputed: fields.elevation,
        });
      }
      if (Math.abs(moisture - fields.baseMoisture) > 1e-12) {
        failures.push({
          q, r, field: 'moisture',
          stored: moisture, recomputed: fields.baseMoisture,
        });
      }
      if (Math.abs(temperature - fields.temperature) > 1e-12) {
        failures.push({
          q, r, field: 'temperature',
          stored: temperature, recomputed: fields.temperature,
        });
      }

      // Bail early on excessive failures to keep the report readable
      if (failures.length >= 10) break;
    }
  } catch (err) {
    return {
      passed: false,
      failures: [{ q: 0, r: 0, field: 'error', stored: err.message, recomputed: 'n/a' }],
    };
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Format seam test results as a human-readable text report.
 *
 * @param {{ passed: boolean, failures: object[] }} testResult - Output of runSeamTest()
 * @returns {string}
 */
export function formatSeamReport({ passed, failures }) {
  const lines = [];
  lines.push('=== Chunk-Seam Invariant Test ===');
  lines.push(`Status: ${passed ? 'PASSED' : 'FAILED'}`);
  lines.push(`Seed: ${TEST_SEED}  |  Radius: ${TEST_RADIUS}`);
  lines.push('Invariant: elevationField, moisture & temperature are pure functions of (seed, q, r)');
  lines.push('Formula: worldShape(dist, radius) × (detail×0.5 + ridges×0.5)');
  lines.push('');

  if (passed) {
    lines.push('All tiles verified — sampleBaseFields values match stored fields.');
  } else {
    lines.push(`${failures.length} mismatch(es) found (showing first 10):`);
    for (const f of failures) {
      if (f.field === 'error') {
        lines.push(`  ERROR: ${f.stored}`);
      } else {
        lines.push(
          `  (${f.q},${f.r}) ${f.field}: ` +
          `stored=${f.stored?.toFixed?.(8) ?? f.stored}  ` +
          `recomputed=${f.recomputed?.toFixed?.(8) ?? f.recomputed}`
        );
      }
    }
  }
  lines.push('');

  return lines.join('\n');
}
