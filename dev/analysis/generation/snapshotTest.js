/**
 * snapshotTest.js — Distribution invariant snapshot tests.
 *
 * Generates maps for a fixed set of seeds at radius 21 and verifies
 * that key terrain distributions fall within wide tolerance ranges.
 * These are regression catchers — they detect amplitude breakage,
 * not fine-tuning issues. Tightening happens in Phase G.
 *
 * Pure: no DOM, no state, no side effects beyond console.assert.
 */
import { generateSingleSeed } from './generate.js';

/** Fixed test seeds (should be stable and representative). */
const TEST_SEEDS = ['test-alpha', 'test-beta', 'test-gamma'];

/** Test radius — medium map, enough tiles for meaningful statistics. */
const TEST_RADIUS = 21;

/**
 * Tolerance ranges for terrain distribution percentages.
 * Intentionally wide — designed to catch catastrophic breakage.
 * Phase G tightens these.
 */
const TOLERANCE = {
  water:          { min: 0.06, max: 0.20, label: 'water' },
  mountain:       { min: 0.03, max: 0.15, label: 'mountain' },
  peak:           { min: 0.00, max: 0.05, label: 'peak' },
  floatingIsland: { min: 0.00, max: 0.02, label: 'floatingIsland' },
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
      const result = generateSingleSeed(seedText, TEST_RADIUS, null, {
        heightVariation: 1.0,
        wateriness: 1.0,
        mountainousness: 1.0,
      });
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
