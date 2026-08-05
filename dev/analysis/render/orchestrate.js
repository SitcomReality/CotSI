/**
 * orchestrate.js — Render orchestration for the analysis page.
 *
 * Coordinates canvas sizing, camera fitting, and delegate rendering.
 * Reads UI toggle state from `els` and renders through the render pipeline.
 */
import { S } from '../state.js';
import { els } from '../domRefs.js';
import { getArchetype } from '../../../src/game/rules/archetypes.js';
import { renderMap } from './renderMap.js';
import { renderDistributions } from './renderDistributions.js';
import { fitCameraToRadius } from './camera.js';

// ─── Toggle options ─────────────────────────────────────────────────────────

/**
 * Read entity toggle state + build palette map from the last result.
 */
function getOptions() {
  const result = S.lastResult;
  const palettes = {};

  if (result) {
    if (result.multiBiome) {
      const seen = new Set();
      for (const key of Object.keys(result.tiles)) {
        const bid = result.tiles[key].biomeId;
        if (bid && !seen.has(bid)) {
          seen.add(bid);
          const def = getArchetype(bid);
          if (def && def.palette) palettes[bid] = def.palette;
        }
      }
    } else {
      if (result.biomeDef?.palette) {
        palettes[result.biomeDef.id || 'biome_default'] = result.biomeDef.palette;
      }
    }
  }

  return {
    showChampions: els.toggleChamps.checked,
    showMobs: els.toggleMobs.checked,
    showTraders: els.toggleTraders.checked,
    showBases: els.toggleBases.checked,
    showFeatures: els.toggleFeatures.checked,
    palettes,
  };
}

// ─── Canvas sizing ───────────────────────────────────────────────────────────

/**
 * Resize the canvas to fill the map area, respecting device pixel ratio.
 * Updates S.canvasEl dimensions and S.ctx in place.
 */
export function resizeCanvas() {
  const rect = els.mapArea.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  S.canvasEl.width = rect.width * dpr;
  S.canvasEl.height = rect.height * dpr;
  S.canvasEl.style.width = rect.width + 'px';
  S.canvasEl.style.height = rect.height + 'px';
  S.ctx = S.canvasEl.getContext('2d');
  return { w: rect.width, h: rect.height, dpr };
}

// ─── Render ──────────────────────────────────────────────────────────────────

/**
 * Render the current map at the current canvas size.
 */
export function render() {
  if (!S.ctx) return;
  const { w, h, dpr } = resizeCanvas();

  // Distributions view renders histograms — no map data needed
  if (S.viewMode === 'distributions') {
    renderDistributions(S.ctx, w, h, dpr);
    return;
  }

  if (!S.lastResult) return;
  const { tiles, champions, mobs, traders } = S.lastResult;
  const options = getOptions();
  renderMap(S.ctx, tiles, { champions, mobs, traders }, S.camera, options, w, h, dpr, S.viewMode);
}

/**
 * Fit camera to the map radius, then render.
 */
export function renderAndFit() {
  const { w, h, dpr } = resizeCanvas();

  // Distributions view doesn't use camera — render directly
  if (S.viewMode === 'distributions') {
    renderDistributions(S.ctx, w, h, dpr);
    return;
  }

  if (!S.lastResult) return;
  fitCameraToRadius(S.camera, S.lastResult.radius, w, h);
  render();
}
