/**
 * export.js — Export tools for the analysis page.
 *
 * Exports the current map view as a PNG image or as a JSON data file.
 */
import { S } from './state.js';

/**
 * Export the current canvas contents as a PNG file download.
 */
export function exportPng() {
  if (!S.canvasEl) return;
  // Render at current resolution
  S.canvasEl.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotsi-map-${S.lastResult?.seed || 'export'}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

/**
 * Export the current map data (tiles, entities, seed) as a JSON file download.
 */
export function exportJson() {
  if (!S.lastResult) return;
  const { tiles, champions, mobs, traders, seed, radius } = S.lastResult;
  const data = { seed, radius, tiles, champions, mobs, traders };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cotsi-data-${seed}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
