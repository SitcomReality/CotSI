/**
 * legend.js — Legend display for the analysis page.
 *
 * Renders elevation-gradation, moisture-gradation, or biome-palette
 * legend into the sidebar legend element.
 *
 * Elevation and moisture color stops are imported from colorMaps.js —
 * the single source of truth. If you update a color there, the legend
 * changes with it automatically.
 */
import { S } from '../state.js';
import { els } from '../domRefs.js';
import { getArchetype } from '../../../src/game/rules/archetypes.js';
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';
import { ELEVATION_COLOR_STOPS, MOISTURE_COLOR_STOPS } from '../render/colorMaps.js';

// ─── Terrain display order ────────────────────────────────────────────────

export const TERRAIN_ORDER = ['plains', 'forest', 'denseForest', 'desert', 'marsh', 'mountain', 'peak', 'floatingIsland', 'water'];

// ─── Update legend ────────────────────────────────────────────────────────

/**
 * Update the legend DOM element for the given view mode.
 *
 * @param {'terrain'|'elevation'|'moisture'} mode
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

  } else {
    // Terrain / biome mode — show palette swatches
    const result = S.lastResult;
    const multiBiome = result.multiBiome;

    if (multiBiome) {
      // Multi-biome: show each biome's palette
      const biomeIds = result.biomeIds || [];
      const parts = [];
      for (const bid of biomeIds) {
        const def = getArchetype(bid);
        const biomeName = def?.name || bid;
        const palette = def?.palette || null;
        parts.push(`
          <div style="margin-bottom:6px;font-size:11px;color:#888;">Biome: ${biomeName}</div>
          <div class="legend-swatches" style="margin-bottom:8px;">
            ${TERRAIN_ORDER.map(t => {
              let color;
              if (palette && palette[t]) {
                const rgb = palette[t];
                color = `rgb(${rgb[0]*255|0},${rgb[1]*255|0},${rgb[2]*255|0})`;
              } else {
                color = TERRAIN[t]?.fill || '#444';
              }
              const label = TERRAIN[t]?.label || t;
              return `<div class="legend-item">
                <span class="legend-swatch" style="background:${color}"></span>
                <span>${label}</span>
              </div>`;
            }).join('')}
          </div>`);
      }
      els.legend.innerHTML = parts.join('');
    } else {
      // Single-biome: show just that biome's palette
      const palette = result.biomeDef?.palette || null;
      const biomeName = result.biomeDef?.name || 'Default';
      els.legend.innerHTML = `
        <div style="margin-bottom:4px;font-size:11px;color:#888;">Biome: ${biomeName}</div>
        <div class="legend-swatches">
          ${TERRAIN_ORDER.map(t => {
            let color;
            if (palette && palette[t]) {
              const rgb = palette[t];
              color = `rgb(${rgb[0]*255|0},${rgb[1]*255|0},${rgb[2]*255|0})`;
            } else {
              color = TERRAIN[t]?.fill || '#444';
            }
            const label = TERRAIN[t]?.label || t;
            return `<div class="legend-item">
              <span class="legend-swatch" style="background:${color}"></span>
              <span>${label}</span>
            </div>`;
          }).join('')}
        </div>`;
    }
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
