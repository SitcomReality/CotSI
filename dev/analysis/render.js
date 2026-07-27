/**
 * render.js — UI render orchestration for the analysis page.
 *
 * Coordinates canvas sizing, camera fitting, and delegate rendering.
 * Reads UI toggle state from `els` and renders through `renderer.js`.
 */
import { S } from './state.js';
import { els } from './domRefs.js';
import { renderMap, fitCameraToRadius } from './renderer.js';

// ─── Toggle options ─────────────────────────────────────────────────────────

/**
 * Read entity toggle state + biome palette from the DOM and state.
 */
function getOptions() {
  return {
    showChampions: els.toggleChamps.checked,
    showMobs: els.toggleMobs.checked,
    showTraders: els.toggleTraders.checked,
    showBases: els.toggleBases.checked,
    showFeatures: els.toggleFeatures.checked,
    showDebris: els.toggleDebris.checked,
    palette: S.lastResult?.biomeDef?.palette || null,
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
  if (!S.lastResult || !S.ctx) return;
  const { w, h, dpr } = resizeCanvas();
  const { tiles, champions, mobs, traders } = S.lastResult;
  const options = getOptions();
  renderMap(S.ctx, tiles, { champions, mobs, traders }, S.camera, options, w, h, dpr, S.viewMode);
}

/**
 * Fit camera to the map radius, then render.
 */
export function renderAndFit() {
  if (!S.lastResult) return;
  const { w, h, dpr } = resizeCanvas();
  fitCameraToRadius(S.camera, S.lastResult.radius, w, h);
  render();
}
