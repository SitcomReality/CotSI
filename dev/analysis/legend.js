/**
 * legend.js — Legend display for the analysis page.
 *
 * Renders elevation-gradation, moisture-gradation, or biome-palette
 * legend into the sidebar legend element.
 */
import { S } from './state.js';
import { els } from './domRefs.js';
import { getArchetype } from '../../src/game/rules/archetypes.js';
import { TERRAIN } from '../../src/game/rules/terrainTypes.js';

// ─── Elevation legend stops ───────────────────────────────────────────────────

export const ELEVATION_STOPS = [
  { max: '0.04', color: '#0a1a3a', label: 'Deep ocean' },
  { max: '0.07', color: '#1a4a8a', label: 'Shallow water' },
  { max: '0.12', color: '#3a8a8a', label: 'Shore / beach' },
  { max: '0.25', color: '#4a9a4a', label: 'Lowland' },
  { max: '0.45', color: '#7aaa4a', label: 'Midland' },
  { max: '0.65', color: '#b8a030', label: 'Highland' },
  { max: '0.80', color: '#d48030', label: 'Foothill' },
  { max: '0.905', color: '#c05030', label: 'Sub-mountain' },
  { max: '0.95', color: '#a03030', label: 'Mountain' },
  { max: '1.0', color: '#e06040', label: 'Peak' },
];

// ─── Moisture legend stops ────────────────────────────────────────────────────

export const MOISTURE_STOPS = [
  { max: '0.10', color: '#c8b050', label: 'Very dry' },
  { max: '0.20', color: '#b8a848', label: 'Arid' },
  { max: '0.35', color: '#8aaa4a', label: 'Dry' },
  { max: '0.50', color: '#6a9a3a', label: 'Moderate' },
  { max: '0.65', color: '#4a8a2a', label: 'Moist' },
  { max: '0.80', color: '#3a7a2a', label: 'Wet' },
  { max: '1.0', color: '#2a6a4a', label: 'Saturated' },
];

// ─── Terrain display order ────────────────────────────────────────────────────

export const TERRAIN_ORDER = ['plains', 'forest', 'denseForest', 'desert', 'marsh', 'mountain', 'peak', 'floatingIsland', 'water'];

// ─── Update legend ────────────────────────────────────────────────────────────

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
    const stops = ELEVATION_STOPS;
    const gradientColors = stops.map(s => s.color).join(', ');
    els.legend.innerHTML = `
      <div class="legend-gradient">
        <div class="legend-gradient-bar" style="background: linear-gradient(to top, ${gradientColors});"></div>
        <div class="legend-gradient-stops">
          ${stops.slice().reverse().map(s => `
            <div class="legend-gradient-stop">
              <span class="stop-swatch" style="background:${s.color}"></span>
              <span class="stop-label">≤ ${s.max} — ${s.label}</span>
            </div>
          `).join('')}
        </div>
      </div>`;

  } else if (mode === 'moisture') {
    const stops = MOISTURE_STOPS;
    const gradientColors = stops.map(s => s.color).join(', ');
    els.legend.innerHTML = `
      <div class="legend-gradient">
        <div class="legend-gradient-bar" style="background: linear-gradient(to top, ${gradientColors});"></div>
        <div class="legend-gradient-stops">
          ${stops.slice().reverse().map(s => `
            <div class="legend-gradient-stop">
              <span class="stop-swatch" style="background:${s.color}"></span>
              <span class="stop-label">≤ ${s.max} — ${s.label}</span>
            </div>
          `).join('')}
        </div>
      </div>`;

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
