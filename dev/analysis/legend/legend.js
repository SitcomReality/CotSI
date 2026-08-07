/**
 * legend.js — Legend display dispatcher for the analysis page.
 *
 * Routes view-mode changes to the appropriate legend builder.
 * Shared helpers (countByTile, formatCount, paletteToCss) are exported
 * for use by terrainLegend.js, biomeLegend.js, and riversLegend.js.
 *
 * Elevation, moisture, and density color stops are imported from colorMaps.js —
 * the single source of truth. If you update a color there, the legend
 * changes with it automatically.
 */
import { S } from '../state.js';
import { els } from '../domRefs.js';
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';
import { ELEVATION_COLOR_STOPS, MOISTURE_COLOR_STOPS, DENSITY_COLOR_STOPS } from '../render/colorMaps.js';
import { featureDensity } from '../../../src/game/rules/terrainGen/features/featureDensity.js';
import { DEFAULT_TERRAIN_RULES } from '../../../src/params/game/worldParams.js';
import { buildTerrainLegend } from './terrainLegend.js';
import { buildBiomeRegionLegend } from './biomeLegend.js';
import { buildRiversLegend } from './riversLegend.js';

// ─── Tile counting helpers ─────────────────────────────────────────────────

/**
 * Count tiles grouped by a key extracted from each tile.
 * Skips tiles where groupFn returns null or undefined.
 *
 * @param {object[]} tiles
 * @param {(tile: object) => string|null|undefined} groupFn
 * @returns {Record<string, number>}
 */
export function countByTile(tiles, groupFn) {
  const counts = {};
  for (const tile of tiles) {
    const key = groupFn(tile);
    if (key == null) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/**
 * Format a count and its percentage of a total.
 * Returns "—" when total is 0.
 *
 * @param {number} count
 * @param {number} total
 * @returns {string}
 */
export function formatCount(count, total) {
  if (!total) return '\u2014';
  const pct = ((count / total) * 100).toFixed(1);
  return `${count.toLocaleString()} (${pct}%)`;
}

/**
 * Convert a palette RGB float [0-1] array to a CSS rgb() string.
 *
 * @param {number[]} rgb
 * @returns {string}
 */
export function paletteToCss(rgb) {
  return `rgb(${rgb[0] * 255 | 0},${rgb[1] * 255 | 0},${rgb[2] * 255 | 0})`;
}

// ─── Update legend ────────────────────────────────────────────────────────

/**
 * Update the legend DOM element for the given view mode.
 *
 * @param {'standard'|'terrain'|'biome'|'elevation'|'moisture'|'baseMoisture'|'density'|'passability'|'rivers'|'blank'} mode
 */
export function updateLegend(mode) {
  if (!els.legend) return;

  if (!S.lastResult) {
    els.legend.textContent = 'Generate a map to see the legend.';
    return;
  }

  const tiles = Object.values(S.lastResult.tiles);
  if (!tiles || tiles.length === 0) {
    els.legend.textContent = 'No tiles to display.';
    return;
  }

  if (mode === 'elevation') {
    els.legend.innerHTML = buildBucketLegend(ELEVATION_COLOR_STOPS, tiles, t => t.elevationField);

  } else if (mode === 'moisture') {
    els.legend.innerHTML = buildBucketLegend(MOISTURE_COLOR_STOPS, tiles, t => t.moisture);

  } else if (mode === 'baseMoisture') {
    els.legend.innerHTML = buildBucketLegend(MOISTURE_COLOR_STOPS, tiles, t => t.baseMoisture);

  } else if (mode === 'density') {
    const densityField = t => t.density ?? featureDensity(
      t.terrain, t.elevationField, t.moisture, t.slope,
      DEFAULT_TERRAIN_RULES.treeLineMax
    );
    els.legend.innerHTML = buildBucketLegend(DENSITY_COLOR_STOPS, tiles, densityField);

  } else if (mode === 'terrain' || mode === 'standard') {
    const palette = S.lastResult.biomeDef?.palette || null;
    els.legend.innerHTML = buildTerrainLegend(tiles, palette);

  } else if (mode === 'biome') {
    els.legend.innerHTML = buildBiomeRegionLegend(tiles);

  } else if (mode === 'passability') {
    els.legend.innerHTML = buildPassabilityLegend(tiles);

  } else if (mode === 'rivers') {
    const palette = S.lastResult.biomeDef?.palette || null;
    els.legend.innerHTML = buildRiversLegend(tiles, palette);

  } else if (mode === 'blank') {
    els.legend.innerHTML = '<div style="color:#666;font-style:italic;">Terrain hidden — only entities and features are visible.</div>';
  }
}

// ─── Builders ───────────────────────────────────────────────────────────────

/**
 * Build HTML for a bucket-based legend from color stops.
 * Each stop becomes a legend-item showing swatch, label, and tile count.
 *
 * @param {{ max: number, color: string, label: string }[]} stops
 * @param {object[]} tiles
 * @param {(tile: object) => number} fieldFn
 * @returns {string}
 */
function buildBucketLegend(stops, tiles, fieldFn) {
  const bucketCounts = new Array(stops.length).fill(0);
  const total = tiles.length;

  for (const tile of tiles) {
    const val = fieldFn(tile);
    if (val == null) continue;
    for (let i = 0; i < stops.length; i++) {
      const lower = i === 0 ? 0 : stops[i - 1].max;
      if (val >= lower && val <= stops[i].max) {
        bucketCounts[i]++;
        break;
      }
    }
  }

  return stops.map((stop, i) => {
    const count = bucketCounts[i];
    return `<div class="legend-item">
      <span class="legend-swatch" style="background:${stop.color}"></span>
      <span class="legend-label">\u2264 ${stop.max} \u2014 ${stop.label}</span>
      <span class="legend-count">${formatCount(count, total)}</span>
    </div>`;
  }).join('');
}

/**
 * Build HTML for a passability legend.
 * Shows passable vs. impassable tile counts.
 *
 * @param {object[]} tiles
 * @returns {string}
 */
function buildPassabilityLegend(tiles) {
  const total = tiles.length;
  let passable = 0;

  for (const tile of tiles) {
    if (TERRAIN[tile.terrain]?.passable) passable++;
  }
  const impassable = total - passable;

  return `<div class="legend-item">
    <span class="legend-swatch" style="background:#3a7a3a"></span>
    <span class="legend-label"><strong>Passable</strong></span>
    <span class="legend-count">${formatCount(passable, total)}</span>
  </div>
  <div class="legend-item">
    <span class="legend-swatch" style="background:#8b3a3a"></span>
    <span class="legend-label"><strong>Impassable</strong></span>
    <span class="legend-count">${formatCount(impassable, total)}</span>
  </div>`;
}
