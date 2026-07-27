/**
 * legend.js — Legend display for the analysis page.
 *
 * Renders elevation-gradation, moisture-gradation, terrain-palette,
 * biome-region, or blank-mode legend into the sidebar legend element.
 *
 * Elevation and moisture color stops are imported from colorMaps.js —
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
import { ELEVATION_COLOR_STOPS, MOISTURE_COLOR_STOPS } from '../render/colorMaps.js';
import { BIOME_COLORS } from '../render/theme.js';

// ─── Terrain display order ────────────────────────────────────────────────

export const TERRAIN_ORDER = ['plains', 'forest', 'denseForest', 'desert', 'marsh', 'mountain', 'peak', 'floatingIsland', 'water'];

// ─── Update legend ────────────────────────────────────────────────────────

/**
 * Update the legend DOM element for the given view mode.
 *
 * @param {'terrain'|'biome'|'elevation'|'moisture'|'blank'} mode
 */
export function updateLegend(mode) {
  if (!els.legend) return;

  if (!S.lastResult) {
    els.legend.textContent = 'Generate a map to see the legend.';
    return;
  }

  if (mode === 'elevation') {
    els.legend.innerHTML = buildGradientLegend(ELEVATION_COLOR_STOPS);

  } else if (mode === 'moisture') {
    els.legend.innerHTML = buildGradientLegend(MOISTURE_COLOR_STOPS);

  } else if (mode === 'terrain') {
    els.legend.innerHTML = buildTerrainLegend();

  } else if (mode === 'biome') {
    els.legend.innerHTML = buildBiomeRegionLegend();

  } else if (mode === 'blank') {
    els.legend.innerHTML = '<div class="legend-gradient" style="color:#666;font-style:italic;">Terrain hidden — only entities and features are visible.</div>';
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Build HTML for a continuous gradient legend with labeled stops.
 *
 * @param {{ max: number, color: string, label: string }[]} stops
 * @returns {string}
 */
function buildGradientLegend(stops) {
  const gradientColors = stops.map(s => s.color).join(', ');
  return `
    <div class="legend-gradient">
      <div class="legend-gradient-bar" style="background: linear-gradient(to top, ${gradientColors});"></div>
      <div class="legend-gradient-stops">
        ${stops.slice().reverse().map(s => `
          <div class="legend-gradient-stop">
            <span class="stop-swatch" style="background:${s.color}"></span>
            <span class="stop-label"><= ${s.max} — ${s.label}</span>
          </div>
        `).join('')}
      </div>
    </div>`;
}

/**
 * Build HTML for a terrain-palette swatch legend.
 * Lists every possible terrain type once, using the default TERRAIN fill colours.
 *
 * @returns {string}
 */
function buildTerrainLegend() {
  return `<div class="legend-swatches">
    ${TERRAIN_ORDER.map(t => `<div class="legend-item">
      <span class="legend-swatch" style="background:${TERRAIN[t]?.fill || '#444'}"></span>
      <span>${TERRAIN[t]?.label || t}</span>
    </div>`).join('')}
  </div>`;
}

/**
 * Build HTML for a biome-region legend.
 * Shows the broad biome colours actually rendered in Biome Regions view.
 *
 * @returns {string}
 */
function buildBiomeRegionLegend() {
  const result = S.lastResult;
  const multiBiome = result.multiBiome;

  if (multiBiome) {
    const biomeIds = result.biomeIds || [];
    const parts = [];
    for (const bid of biomeIds) {
      const def = getArchetype(bid);
      const biomeName = def?.name || bid;
      let color;
      if (bid === 'biome_default') color = BIOME_COLORS.default;
      else if (bid === 'biome_lush')    color = BIOME_COLORS.lush;
      else if (bid === 'biome_arid')    color = BIOME_COLORS.arid;
      else color = BIOME_COLORS.fallback;
      parts.push(`<div class="legend-item">
        <span class="legend-swatch" style="background:${color}"></span>
        <span>${biomeName}</span>
      </div>`);
    }
    return parts.join('');
  }

  // Single biome — just show the biome name with its colour
  const bid = result.biomeDef?.id || 'biome_default';
  const biomeName = result.biomeDef?.name || 'Default';
  let color;
  if (bid === 'biome_default') color = BIOME_COLORS.default;
  else if (bid === 'biome_lush')    color = BIOME_COLORS.lush;
  else if (bid === 'biome_arid')    color = BIOME_COLORS.arid;
  else color = BIOME_COLORS.fallback;
  return `<div class="legend-item">
    <span class="legend-swatch" style="background:${color}"></span>
    <span>${biomeName}</span>
  </div>`;
}
