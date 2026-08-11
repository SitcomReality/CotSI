/**
 * spatialFormatting.js — Display formatting for spatial statistics.
 *
 * Pure: no DOM, no state, no side effects.
 */

/**
 * Format patch analysis results for display.
 *
 * @param {object[]} results - Array from allPatchAnalyses()
 * @param {number}   totalTiles - Total tiles in map (for % computation)
 * @param {number}   [minPct=2] - Minimum % coverage to show (filters noise)
 * @returns {string}
 */
export function formatSpatialStats(results, totalTiles, minPct = 2) {
  const lines = [];
  lines.push('Spatial Statistics (patch analysis):');
  lines.push('');

  let anyShown = false;
  for (const r of results) {
    const pct = totalTiles > 0 ? (r.totalTiles / totalTiles * 100) : 0;
    if (pct < minPct) continue;
    anyShown = true;
    lines.push(
      `  ${r.terrainType.padEnd(14)} patches=${r.componentCount}  ` +
      `mean=${r.meanSize}  med=${r.medianSize}  ` +
      `singletons=${r.singletonCount}  ` +
      `largest=${(r.largestPatchFraction * 100).toFixed(1)}%  ` +
      `gini=${r.gini}`
    );
  }

  if (!anyShown) {
    lines.push('  (no terrain type exceeds the minimum coverage threshold)');
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Format cross-field correlations for display.
 *
 * @param {object[]} pairs - Array of { fieldA, fieldB, r, n } from pearsonCorrelation calls
 * @returns {string}
 */
export function formatCorrelations(pairs) {
  const lines = [];
  lines.push('Cross-field Correlations (Pearson r):');
  for (const p of pairs) {
    lines.push(
      `  ${p.fieldA.padEnd(18)} × ${p.fieldB.padEnd(18)}  r=${p.r.toFixed(4)}  (n=${p.n})`
    );
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Format a 2D joint histogram with biome overlay for display.
 *
 * Shows a compact grid where each cell shows the dominant biome and count.
 *
 * @param {{ cells: { count: number, biomes: string[] }[][], aLabel: string, bLabel: string, bins: number }} jh
 * @returns {string}
 */
export function formatJointHistogram(jh) {
  const lines = [];
  lines.push(`Joint Histogram: ${jh.aLabel} × ${jh.bLabel} (${jh.bins}×${jh.bins} grid)`);

  // Show the grid as text: for each cell, show the dominant biome short name
  const shortNames = {};
  for (const row of jh.cells) {
    for (const cell of row) {
      for (const b of cell.biomes) {
        if (!shortNames[b]) {
          // Shorten biome names for display
          shortNames[b] = b.replace('biome_', '').replace(/_/g, ' ').substring(0, 12);
        }
      }
    }
  }

  lines.push(`  Biomes: ${Object.values(shortNames).join(', ')}`);
  lines.push('');
  lines.push(`  ${jh.aLabel} \\ ${jh.bLabel}  (count:dominant biome, empty cells omitted):`);

  // Show non-empty cells
  let cellCount = 0;
  for (let a = 0; a < jh.bins; a++) {
    for (let b = 0; b < jh.bins; b++) {
      const cell = jh.cells[a][b];
      if (cell.count === 0) continue;
      cellCount++;
      const aLow = (a / jh.bins).toFixed(1);
      const aHigh = ((a + 1) / jh.bins).toFixed(1);
      const bLow = (b / jh.bins).toFixed(1);
      const bHigh = ((b + 1) / jh.bins).toFixed(1);

      const dominantBiome = cell.biomes.length > 0
        ? cell.biomes.reduce((best, bio) => {
            // Choose the biome with the shortest name (biome_default is typically the
            // catch-all — we want the most specific one)
            return bio.replace('biome_', '').length < best.replace('biome_', '').length ? bio : best;
          })
        : 'none';

      lines.push(
        `  [${aLow}-${aHigh}, ${bLow}-${bHigh}]  ${cell.count} tiles  ` +
        `biomes(${cell.biomes.length}): ${shortNames[dominantBiome] || dominantBiome}`
      );
    }
  }

  if (cellCount === 0) {
    lines.push('  (all cells empty — no valid data)');
  }
  lines.push('');

  return lines.join('\n');
}
