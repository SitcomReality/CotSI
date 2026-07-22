// src/render/overlays/overlayRegistry.js
// Maintains a sorted registry of 2D overlay render functions and dispatches
// per-frame rendering via the clock scheduler.

import { getClock } from '../../shared/clockScheduler.js';
import { getOverlayCanvas, getCtx2d } from './overlayCanvas.js';

let renderLayers = [];   // ordered array of { name, priority, render(ctx2d, state, camera, time) }

/**
 * Register a 2D overlay render callback with a sort key.
 * Lower priority values render first (back to front).
 * @param {string} name
 * @param {number} priority
 * @param {(ctx2d: CanvasRenderingContext2D, state: any, camera: any, time: number) => void} renderFn
 */
export function registerLayer(name, priority, renderFn) {
  renderLayers.push({ name, priority, render: renderFn });
  renderLayers.sort((a, b) => a.priority - b.priority);
}

/**
 * Render all registered layers in priority order.
 * Clears the canvas before drawing.
 */
export function renderFrame(state, camera, time) {
  const overlay = getOverlayCanvas();
  const ctx2d = getCtx2d();
  if (!overlay || !ctx2d) return;
  ctx2d.clearRect(
    0, 0,
    overlay.width / (window.devicePixelRatio || 1),
    overlay.height / (window.devicePixelRatio || 1),
  );
  for (const layer of renderLayers) {
    layer.render(ctx2d, state, camera, time);
  }
}

// Hook into the clock's tick loop — pulls state and camera from the overlay
// canvas (set externally via setEffectsState in overlayStack.js).
getClock().onTick((time) => {
  const overlay = getOverlayCanvas();
  if (!overlay || !overlay._state || !overlay._camera) return;
  renderFrame(overlay._state, overlay._camera, time);
});
