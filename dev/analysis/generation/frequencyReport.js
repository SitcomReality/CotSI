/**
 * frequencyReport.js — Noise frequency verification report formatting.
 *
 * Formats frequency verification results as a human-readable text report.
 *
 * Pure: no DOM, no state, no side effects.
 */

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
