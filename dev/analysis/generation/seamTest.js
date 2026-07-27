/**
 * seamTest.js — Chunk-seam invariant verification.
 *
 * Verifies that terrain generation is a pure function of (seed, q, r):
 * every tile's raw elevation and moisture match what a direct FBM sample
 * would produce at the same global coordinate. This catches regressions
 * where per-chunk state or global-pass residue leaks into base field values.
 *
 * The test generates a full map via generateTiles (which assembles chunks),
 * then recomputes rawElev and rawMoist for each tile via direct FBM calls
 * and asserts they match the stored values.
 *
 * Pure: no DOM, no state, no side effects beyond console.assert.
 */
import { generateSingleSeed } from './generate.js';
import { hexFbm2D } from '../../../src/engine/rules/noise.js';
import { stringSeed } from '../../../src/engine/rules/seededRng.js';
import {
  NOISE_ELEVATION,
  NOISE_MOISTURE,
} from '../../../src/params/game/worldParams.js';

/** Test seed and radius. */
const TEST_SEED = 'glut-17';
const TEST_RADIUS = 21;

/**
 * Run the chunk-seam invariant test.
 *
 * Generates a map and verifies that every tile's raw elevation and moisture
 * match what a direct FBM call would produce for the same (seed, q, r).
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
    const seed = stringSeed(TEST_SEED);

    const tileEntries = Object.values(tiles);
    if (tileEntries.length === 0) {
      return {
        passed: false,
        failures: [{ q: 0, r: 0, field: 'generation', stored: 'n/a', recomputed: 'no tiles generated' }],
      };
    }

    for (const tile of tileEntries) {
      const { q, r, rawElev, rawMoist } = tile;

      // Recompute raw elevation directly
      const recomputedElev = hexFbm2D(q, r, seed, NOISE_ELEVATION);

      // Recompute raw moisture directly
      const recomputedMoist = hexFbm2D(q, r, seed + 999, NOISE_MOISTURE);

      // Compare (allow tiny floating-point drift)
      if (Math.abs(rawElev - recomputedElev) > 1e-12) {
        failures.push({
          q, r, field: 'rawElev',
          stored: rawElev, recomputed: recomputedElev,
        });
      }
      if (Math.abs(rawMoist - recomputedMoist) > 1e-12) {
        failures.push({
          q, r, field: 'rawMoist',
          stored: rawMoist, recomputed: recomputedMoist,
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
  lines.push(`Invariant: rawElev & rawMoist are pure functions of (seed, q, r)`);
  lines.push('');

  if (passed) {
    lines.push('All tiles verified — direct FBM values match stored values.');
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
