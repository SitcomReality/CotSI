/**
 * reportHeatmapFormat.js — Heatmap formatting for batch analysis reports.
 *
 * Provides parameterized heatmap rendering (trader, champion, etc.) with
 * top-N hex listing and concentration metrics.
 *
 * Pure: no DOM, no state, no side effects.
 */
import { heatmapConcentration } from './stats.js';
import { estimatePassableTiles } from './reportBaseFormat.js';

/**
 * Format a heatmap section for the batch report.
 * Shows top 15 hexes by seed count and concentration metrics.
 *
 * @param {Map<string, number>} heatmap    - Map from "q,r" -> seed count
 * @param {number}              seedCount  - Total seeds in the batch
 * @param {object|null}         terrain    - Terrain aggregate (for passable-tile estimation), or null
 * @param {number|null}         radius     - Map radius (for passable-tile estimation), or null
 * @param {string}              label      - Label text (e.g. 'Trader position')
 * @returns {string[]} Array of report lines (without trailing blank line)
 */
export function formatHeatmapSection(heatmap, seedCount, terrain, radius, label) {
  const lines = [];
  lines.push(`${label} heatmap (top 15 hexes by seed count):`);
  const sorted = [...heatmap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [key, count] of sorted) {
    const pct = ((count / seedCount) * 100).toFixed(1);
    lines.push(`  ${key.padStart(8)}  ${count}/${seedCount}  (${pct}%)`);
  }
  // Concentration metrics
  if (terrain && radius) {
    const validTiles = estimatePassableTiles(terrain, radius);
    const conc = heatmapConcentration(heatmap, seedCount, validTiles);
    lines.push(`  Concentration: Gini=${conc.gini}  unique=${conc.uniqueHexes}  expected=${conc.expectedUnique}  (${conc.note})`);
  }
  return lines;
}
