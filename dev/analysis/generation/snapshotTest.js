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
 * Tighter than the original Phase 0 values — derived from calibration targets.
 * Reference batch: 50 seeds of glut-17 at r=21 with multi-biome enabled.
 *
 * Calibration targets used:
 *   waterMaxElevation = p12 → ~12% water (filtered by moisture + freeze)
 *   mountainThreshold = p90 → ~4-6% mountains (filtered by slope)
 *   desertMaxMoisture = p20 → ~15-25% desert
 *   forestMinMoisture = p72 → ~8-15% forest
 *   denseForestMinMoisture = p85 → ~4-10% denseForest
 *   hillElevationMin = p55 → ~10-18% hill (filtered by slope)
 */
const TOLERANCE = {
  water:          { min: 0.08, max: 0.18, label: 'water' },
  mountain:       { min: 0.01, max: 0.08, label: 'mountain' },
  peak:           { min: 0.00, max: 0.04, label: 'peak' },
  floatingIsland: { min: 0.00, max: 0.02, label: 'floatingIsland' },
  forest:         { min: 0.05, max: 0.18, label: 'forest' },
  denseForest:    { min: 0.02, max: 0.13, label: 'denseForest' },
  desert:         { min: 0.10, max: 0.30, label: 'desert' },
  plains:         { min: 0.10, max: 0.35, label: 'plains' },
  hill:           { min: 0.05, max: 0.22, label: 'hill' },
  ice:            { min: 0.00, max: 0.07, label: 'ice' },
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
