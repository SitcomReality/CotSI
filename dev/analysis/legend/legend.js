/**
 * legend.js — Legend display for the analysis page.
 *
 * Renders elevation-gradation, moisture-gradation, terrain-palette,
 * biome-region, or blank-mode legend into the sidebar legend element.
 *
 * Elevation, moisture, and density color stops are imported from colorMaps.js —
 * the single source of truth. If you update a color there, the legend
 * changes with it automatically.
 *
 * Terrain-palette swatches read from the biome archetype definition
 * (via getArchetype), falling back to TERRAIN.fill. Biome-region
 * swatches use BIOME_COLORS from theme.js.
 */
import { S } from '../state.js';
import { els } from '../domRefs.js';
import { getArchetype } from '../../../src/game/rules/archetypes.js';
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';
import { ELEVATION_COLOR_STOPS, MOISTURE_COLOR_STOPS, DENSITY_COLOR_STOPS } from '../render/colorMaps.js';
import { BIOME_COLORS, RIVER, RIVER_BOOST_RADIUS } from '../render/theme.js';
import { hexesWithinRadius, coordKey } from '../../../src/engine/rules/hexGrid.js';
import { featureDensity } from '../../../src/game/rules/terrainGen/features/featureDensity.js';
import { DEFAULT_TERRAIN_RULES } from '../../../src/params/game/worldParams.js';

// ─── Terrain display order ────────────────────────────────────────────────

export const TERRAIN_ORDER = ['plains', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'floatingIsland', 'water', 'ice'];

// ─── Tile counting helpers ─────────────────────────────────────────────────

/**
 * Count tiles grouped by a key extracted from each tile.
 * Skips tiles where groupFn returns null or undefined.
 *
 * @param {object[]} tiles
 * @param {(tile: object) => string|null|undefined} groupFn
 * @returns {Record<string, number>}
 */
function countByTile(tiles, groupFn) {
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
function formatCount(count, total) {
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
function paletteToCss(rgb) {
  return `rgb(${rgb[0] * 255 | 0},${rgb[1] * 255 | 0},${rgb[2] * 255 | 0})`;
}

// ─── Update legend ────────────────────────────────────────────────────────

/**
 * Update the legend DOM element for the given view mode.
 *
 * @param {'terrain'|'biome'|'elevation'|'moisture'|'baseMoisture'|'density'|'passability'|'rivers'|'blank'} mode
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

  } else if (mode === 'terrain') {
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

// ─── Helpers ───────────────────────────────────────────────────────────────

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
 * Build HTML for terrain palette legend items.
 * Filters to terrain types actually present in the tiles, sorted by TERRAIN_ORDER.
 * Uses biome palette colors when available, falling back to TERRAIN.fill.
 *
 * @param {object[]} tiles
 * @param {object|null} [palette] - Palette from S.lastResult.biomeDef?.palette
 * @returns {string}
 */
function buildTerrainLegend(tiles, palette) {
  const counts = countByTile(tiles, t => t.terrain);
  const total = tiles.length;

  return TERRAIN_ORDER
    .filter(t => (counts[t] || 0) > 0)
    .map(t => {
      const swatch = palette && palette[t]
        ? paletteToCss(palette[t])
        : (TERRAIN[t]?.fill || '#444');
      return `<div class="legend-item">
        <span class="legend-swatch" style="background:${swatch}"></span>
        <span class="legend-label">${TERRAIN[t]?.label || t}</span>
        <span class="legend-count">${formatCount(counts[t], total)}</span>
      </div>`;
    }).join('');
}

/**
 * Build HTML for a biome-region legend.
 * Counts tiles by biomeId and shows each biome with its colour and percentage.
 * Falls back to S.lastResult.biomeDef when there are no tiles.
 *
 * @param {object[]} tiles
 * @returns {string}
 */
function buildBiomeRegionLegend(tiles) {
  const total = tiles.length;

  if (!total) {
    const bid = S.lastResult.biomeDef?.id || 'biome_default';
    const biomeName = S.lastResult.biomeDef?.name || 'Default';
    const colorKey = bid.replace('biome_', '');
    const color = BIOME_COLORS[colorKey] ?? BIOME_COLORS.fallback;
    return `<div class="legend-item">
      <span class="legend-swatch" style="background:${color}"></span>
      <span class="legend-label">${biomeName}</span>
    </div>`;
  }

  const counts = countByTile(tiles, t => t.biomeId);

  // Sort by count descending
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return sorted.map(([bid, count]) => {
    const def = getArchetype(bid);
    const biomeName = def?.name || bid;
    const colorKey = bid.replace('biome_', '');
    const color = BIOME_COLORS[colorKey] ?? BIOME_COLORS.fallback;
    return `<div class="legend-item">
      <span class="legend-swatch" style="background:${color}"></span>
      <span class="legend-label">${biomeName}</span>
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

/**
 * Build HTML for a rivers legend.
 * Shows terrain entries (filtered to existing), river path count,
 * moisture boost halo count, and unaffected tile count.
 *
 * River boost halo is computed by finding all tiles within radius 1
 * of any river tile, then subtracting the river tiles themselves.
 *
 * @param {object[]} tiles
 * @param {object|null} [palette] - Palette from S.lastResult.biomeDef?.palette
 * @returns {string}
 */
function buildRiversLegend(tiles, palette) {
  const total = tiles.length;

  // Build a key->index map for fast lookup
  const tileMap = {};
  for (let i = 0; i < tiles.length; i++) {
    tileMap[coordKey(tiles[i])] = i;
  }

  // First pass: collect river tile keys
  const riverKeySet = new Set();
  for (const tile of tiles) {
    if (tile.isRiver) {
      riverKeySet.add(coordKey(tile));
    }
  }

  // Second pass: compute boost halo keys
  const offsets = hexesWithinRadius(RIVER_BOOST_RADIUS);
  const boostedKeySet = new Set();
  for (const riverKey of riverKeySet) {
    for (const offset of offsets) {
      // Parse the river tile coords to compute neighbor
      const [qStr, rStr] = riverKey.split(',');
      const nq = parseInt(qStr, 10) + offset.q;
      const nr = parseInt(rStr, 10) + offset.r;
      const nk = `${nq},${nr}`;
      // Only add if the neighbor is an actual tile on the map
      if (tileMap[nk] !== undefined) {
        boostedKeySet.add(nk);
      }
    }
  }

  // Third pass: count categories
  const riverCount = riverKeySet.size;
  let boostCount = 0;
  for (const key of boostedKeySet) {
    if (!riverKeySet.has(key)) {
      boostCount++;
    }
  }
  const unaffectedCount = total - riverCount - boostCount;

  // Terrain entries (same filtered + ordered logic as buildTerrainLegend)
  const terrainCounts = countByTile(tiles, t => t.terrain);
  let html = '';

  for (const t of TERRAIN_ORDER) {
    if ((terrainCounts[t] || 0) === 0) continue;
    const swatch = palette && palette[t]
      ? paletteToCss(palette[t])
      : (TERRAIN[t]?.fill || '#444');
    html += `<div class="legend-item">
      <span class="legend-swatch" style="background:${swatch}"></span>
      <span class="legend-label">${TERRAIN[t]?.label || t}</span>
      <span class="legend-count">${formatCount(terrainCounts[t], total)}</span>
    </div>`;
  }

  // River path entry
  html += `<div class="legend-item">
    <span class="legend-swatch" style="background:${RIVER.pathColor}"></span>
    <span class="legend-label">River path</span>
    <span class="legend-count">${formatCount(riverCount, total)}</span>
  </div>`;

  // Moisture boost halo entry
  html += `<div class="legend-item">
    <span class="legend-swatch" style="background:${RIVER.boostColor}"></span>
    <span class="legend-label">Moisture boost</span>
    <span class="legend-count">${formatCount(boostCount, total)}</span>
  </div>`;

  // Unaffected entry (no swatch, just informational)
  html += `<div class="legend-item">
    <span class="legend-swatch" style="background:transparent;border-color:transparent"></span>
    <span class="legend-label">Unaffected</span>
    <span class="legend-count">${formatCount(unaffectedCount, total)}</span>
  </div>`;

  return html;
}
