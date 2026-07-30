/**
 * snapshotTest.js — Distribution invariant snapshot tests.
 *
 * Generates maps for a fixed set of seeds at radius 21 and verifies
 * that key terrain distributions fall within tolerance ranges.
 * These are regression catchers — they detect amplitude breakage,
 * not fine-tuning issues.
 *
 * Tolerances are derived from the calibration pipeline's target percentiles
 * (see thresholdDerivation.js). If the noise config or classification
 * thresholds change significantly, these may need recalibration by running
 * a batch analysis and computing mean ± 3σ for each terrain type.
 *
 * Pure: no DOM, no state, no side effects beyond console.assert.
 */
import { generateSingleSeed } from './generate.js';

/** Fixed test seeds (should be stable and representative). */
const TEST_SEEDS = ['test-alpha', 'test-beta', 'test-gamma', 'test-delta', 'test-epsilon'];

/** Test radius — medium map, enough tiles for meaningful statistics. */
const TEST_RADIUS = 21;

/**
 * Tolerance ranges for terrain distribution percentages.
 * Recalibrated against 250-seed × 4-radius batch (Ontology, 2026-07-30).
 * Reference: R21 batch mean ± ~3σ, with generous buffer for per-seed variance.
 *
 * Calibration source: batch_report_2026-07-30T15-46-38.460Z — R21 terrain distribution:
 *   Forest       mean 23.9%, min 18.6%, max 28.5%
 *   DenseForest  mean 16.8%, min  9.9%, max 20.8%
 *   Desert       mean  3.7%, min  2.0%, max 10.1%
 *   Plains       mean 16.3%, min 10.4%, max 22.9%
 *   Mountain     mean  6.0%, min  3.1%, max  8.8%
 *   Peak         mean  2.4%, min  0.9%, max  4.2%
 *   Hill         mean 16.9%, min 11.5%, max 23.5%
 *   Water        mean 11.2%, min  7.0%, max 17.0%
 *   Ice          mean  1.7%, min  0.3%, max  4.0%
 */
const TOLERANCE = {
  water:          { min: 0.06, max: 0.18, label: 'water' },
  mountain:       { min: 0.02, max: 0.10, label: 'mountain' },
  peak:           { min: 0.00, max: 0.05, label: 'peak' },
  floatingIsland: { min: 0.00, max: 0.02, label: 'floatingIsland' },
  forest:         { min: 0.15, max: 0.30, label: 'forest' },
  denseForest:    { min: 0.08, max: 0.23, label: 'denseForest' },
  desert:         { min: 0.01, max: 0.11, label: 'desert' },
  plains:         { min: 0.08, max: 0.24, label: 'plains' },
  hill:           { min: 0.10, max: 0.24, label: 'hill' },
  ice:            { min: 0.00, max: 0.05, label: 'ice' },
};

/**
 * Run snapshot tests across the fixed seed set.
 *
 * @returns {{ passed: boolean, results: object[] }}
 *   Each result entry: { seed, totalTiles, distributions: { terrain: pct, ... }, failures: string[] }
 */
export function runSnapshotTests() {
  const results = [];
  let allPassed = true;

  for (const seedText of TEST_SEEDS) {
    const failures = [];

    try {
      const result = generateSingleSeed(seedText, TEST_RADIUS, null);
      const tiles = result.tiles;
      const tileCount = Object.keys(tiles).length;
      if (tileCount === 0) {
        failures.push('Generated 0 tiles — generation failed');
        results.push({ seed: seedText, totalTiles: 0, distributions: {}, failures });
        allPassed = false;
        continue;
      }

      // Count terrain types
      const counts = {};
      for (const key of Object.keys(tiles)) {
        const terrain = tiles[key].terrain;
        counts[terrain] = (counts[terrain] || 0) + 1;
      }

      // Check tolerances for known terrain types; collect all for full display
      const dist = {};
      for (const [terrain, range] of Object.entries(TOLERANCE)) {
        const pct = (counts[terrain] || 0) / tileCount;
        dist[terrain] = pct;

        if (pct < range.min || pct > range.max) {
          failures.push(
            `${terrain}: ${(pct * 100).toFixed(1)}% ` +
            `out of range [${(range.min * 100).toFixed(0)}%, ${(range.max * 100).toFixed(0)}%]`
          );
        }
      }
      // Also record any present terrain not in TOLERANCE so the report is complete
      for (const terrain of Object.keys(counts)) {
        if (dist[terrain] === undefined) {
          dist[terrain] = counts[terrain] / tileCount;
        }
      }

      if (failures.length > 0) allPassed = false;

      results.push({ seed: seedText, totalTiles: tileCount, distributions: dist, failures });
    } catch (err) {
      failures.push(`Error: ${err.message}`);
      results.push({ seed: seedText, totalTiles: 0, distributions: {}, failures });
      allPassed = false;
    }
  }

  return { passed: allPassed, results };
}

/**
 * Format snapshot test results as a human-readable text report.
 *
 * @param {{ passed: boolean, results: object[] }} testResult - Output of runSnapshotTests()
 * @returns {string}
 */
export function formatSnapshotReport({ passed, results }) {
  const lines = [];
  lines.push('=== Snapshot Tests ===');
  lines.push(`Status: ${passed ? 'PASSED' : 'FAILED'}`);
  lines.push(`Radius: ${TEST_RADIUS}  |  Seeds: ${TEST_SEEDS.length}`);
  lines.push('');

  for (const r of results) {
    lines.push(`Seed "${r.seed}" (${r.totalTiles} tiles):`);
    if (r.failures.length === 0) {
      lines.push('  All distributions within tolerance.');
    } else {
      for (const f of r.failures) {
        lines.push(`  FAIL: ${f}`);
      }
    }

    // Show all measured distributions
    const pcts = Object.entries(r.distributions)
      .map(([t, p]) => `${t}=${(p * 100).toFixed(1)}%`)
      .join('  ');
    if (pcts) lines.push(`  Measured: ${pcts}`);
    lines.push('');
  }

  return lines.join('\n');
}
