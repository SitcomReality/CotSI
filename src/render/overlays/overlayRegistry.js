// src/render/overlays/overlayRegistry.js
// Maintains sorted registries of 2D overlay render functions and dispatches
// per-frame rendering via the clock scheduler. Static layers (fog, movement
// range, path preview) redraw only when their inputs change; dynamic layers
// (animated indicators) redraw every frame on their own canvas.

import { getClock } from '../../shared/clockScheduler.js';
import {
  getOverlayCanvas,
  getDynamicOverlayCanvas,
  getCtx2d,
  getDynamicCtx2d,
  getOverlayDpr,
} from './overlayCanvas.js';
import { startMeasure, endMeasure } from '../../shared/measurements.js';
import { cameraViewKey } from './fogCameraTracker.js';
import { getOverlayContentRevision } from './derivedState.js';

let staticLayers = [];   // ordered array of { name, priority, render(ctx2d, state, camera, time) }
let dynamicLayers = [];

let _lastCameraKey = null;
let _lastContentRevision = -1;
let _lastFogRevision = -1;
let _lastWidth = 0;
let _lastHeight = 0;

/**
 * Register a 2D overlay render callback with a sort key.
 * Lower priority values render first (back to front).
 * Static layers must render identically for identical inputs; dynamic layers
 * may animate with `time`.
 * @param {string} name
 * @param {number} priority
 * @param {(ctx2d: CanvasRenderingContext2D, state: any, camera: any, time: number) => void} renderFn
 * @param {boolean} [isStatic]
 */
export function registerLayer(name, priority, renderFn, isStatic = false) {
  const layer = { name, priority, render: renderFn };
  const list = isStatic ? staticLayers : dynamicLayers;
  list.push(layer);
  list.sort((a, b) => a.priority - b.priority);
}

function renderLayerList(layers, ctx2d, state, camera, time) {
  for (const layer of layers) {
    startMeasure('overlay:' + layer.name);
    layer.render(ctx2d, state, camera, time);
    endMeasure('overlay:' + layer.name);
  }
}

/**
 * Render the overlay stack. The static canvas is cleared and redrawn only when
 * the camera view, derived overlay data, fog revision, or canvas size changed;
 * the dynamic canvas is cleared and redrawn every frame.
 */
export function renderFrame(state, camera, time) {
  const staticCanvas = getOverlayCanvas();
  const dynamicCanvas = getDynamicOverlayCanvas();
  const staticCtx = getCtx2d();
  const dynamicCtx = getDynamicCtx2d();
  if (!staticCanvas || !dynamicCanvas || !staticCtx || !dynamicCtx) return;

  const dpr = getOverlayDpr();
  const camKey = cameraViewKey(camera);
  const contentRevision = getOverlayContentRevision();
  const fogRevision = state._fogRevision || 0;

  const staticDirty =
    staticCanvas.width !== _lastWidth ||
    staticCanvas.height !== _lastHeight ||
    camKey !== _lastCameraKey ||
    contentRevision !== _lastContentRevision ||
    fogRevision !== _lastFogRevision;

  if (staticDirty) {
    _lastWidth = staticCanvas.width;
    _lastHeight = staticCanvas.height;
    _lastCameraKey = camKey;
    _lastContentRevision = contentRevision;
    _lastFogRevision = fogRevision;
    staticCtx.clearRect(0, 0, staticCanvas.width / dpr, staticCanvas.height / dpr);
    renderLayerList(staticLayers, staticCtx, state, camera, time);
  }

  dynamicCtx.clearRect(0, 0, dynamicCanvas.width / dpr, dynamicCanvas.height / dpr);
  renderLayerList(dynamicLayers, dynamicCtx, state, camera, time);
}

// Hook into the clock's tick loop — pulls state and camera from the overlay
// canvas (set externally via setEffectsState in overlayStack.js).
getClock().onTick((time) => {
  const overlay = getOverlayCanvas();
  if (!overlay || !overlay._state || !overlay._camera) return;
  startMeasure('overlays');
  renderFrame(overlay._state, overlay._camera, time);
  endMeasure('overlays');
});

// Canvas contents are not guaranteed to survive a hidden/backgrounded tab
// (browsers may discard backing stores). Force a static redraw on return.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    _lastCameraKey = null;
    _lastContentRevision = -1;
    _lastFogRevision = -1;
  }
});
