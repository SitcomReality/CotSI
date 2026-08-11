/**
 * seamTestReport.js — Human-readable formatting for seam test results.
 *
 * Pure: no DOM, no state, no side effects.
 */

/**
 * Format seam test results as a human-readable text report.
 *
 * @param {{ passed: boolean, failures: object[], seed: string, radius: number }} testResult - Output of runSeamTest()
 * @returns {string}
 */
export function formatSeamReport({ passed, failures, seed, radius }) {
  const lines = [];
  lines.push('=== Chunk-Seam Invariant Test ===');
  lines.push(`Status: ${passed ? 'PASSED' : 'FAILED'}`);
  lines.push(`Seed: ${seed}  |  Radius: ${radius}`);
  lines.push('Invariant: fields (elevation, temperature, baseMoisture, moisture, slope, biomeId, terrain)');
  lines.push('');
  lines.push('Checked fields:');
  lines.push('  elevationField  ← sampleBaseFields().elevation');
  lines.push('  temperature     ← sampleBaseFields().temperature');
  lines.push('  baseMoisture    ← sampleBaseFields().baseMoisture');
  lines.push('  moisture        ← baseMoisture + coastal boost + river boost');
  lines.push('  slope           ← computeSlope() from recomputed elevations');
  lines.push('  biomeId         ← selectBiome() from recomputed fields');
  lines.push('  terrain         ← classifyTerrain() from recomputed fields + biome rules');
  lines.push('');

  if (passed) {
    lines.push('All tiles verified — stored values match recomputed values.');
  } else {
    lines.push(`${failures.length} mismatch(es) found (showing first 10):`);
    for (const f of failures) {
      if (f.field === 'error') {
        lines.push(`  ERROR: ${f.stored}`);
      } else if (f.field === 'biomeId' || f.field === 'terrain') {
        lines.push(
          `  (${f.q},${f.r}) ${f.field}: ` +
          `stored="${f.stored}"  recomputed="${f.recomputed}"`
        );
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

/**
 * Format multi-seed seam test results.
 *
 * @param {{ results: { seed: string, passed: boolean, failures: object[] }[], seedCount: number, radius: number }} multiResult
 * @returns {string}
 */
export function formatMultiSeedSeamReport(multiResult) {
  const lines = [];
  lines.push('=== Chunk-Seam Invariant Test (multi-seed) ===');
  lines.push(`Seeds: ${multiResult.seedCount}  |  Radius: ${multiResult.radius}`);
  lines.push('');

  const failed = multiResult.results.filter(r => !r.passed);
  if (failed.length === 0) {
    lines.push('All seeds PASSED — terrain generation is chunk-seam invariant.');
  } else {
    lines.push(`${failed.length}/${multiResult.seedCount} seed(s) FAILED:`);
    for (const f of failed) {
      lines.push(`  Seed "${f.seed}": ${f.failures.length} mismatch(es)`);
      for (const failure of f.failures.slice(0, 5)) {
        if (failure.field === 'error') {
          lines.push(`    ERROR: ${failure.stored}`);
        } else if (failure.field === 'biomeId' || failure.field === 'terrain') {
          lines.push(
            `    (${failure.q},${failure.r}) ${failure.field}: ` +
            `stored="${failure.stored}"  recomputed="${failure.recomputed}"`
          );
        } else {
          lines.push(
            `    (${failure.q},${failure.r}) ${failure.field}: ` +
            `stored=${failure.stored?.toFixed?.(8) ?? failure.stored}  ` +
            `recomputed=${failure.recomputed?.toFixed?.(8) ?? failure.recomputed}`
          );
        }
      }
      if (f.failures.length > 5) {
        lines.push(`    ... and ${f.failures.length - 5} more`);
      }
    }
  }
  lines.push('');

  return lines.join('\n');
}
