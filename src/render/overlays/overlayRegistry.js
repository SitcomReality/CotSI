// src/render/overlays/overlayRegistry.js
// Maintains sorted registries of 2D overlay render functions and dispatches
// per-frame rendering via the clock scheduler. Three tiers by redraw policy:
//   static  — fog, redrawn on a quantized camera key (mask work is expensive)
//   vector  — movement range + path preview, redrawn on the precise camera key
//             so world-locked outlines track the terrain during a pan
//   dynamic — animated indicators, redrawn every frame
// The static and vector tiers stay cached while nothing changes.

import { getClock } from '../../shared/clockScheduler.js';
import {
  getOverlayCanvas,
  getVectorOverlayCanvas,
  getDynamicOverlayCanvas,
  getCtx2d,
  getVectorCtx2d,
  getDynamicCtx2d,
  getOverlayDpr,
} from './overlayCanvas.js';
import { startMeasure, endMeasure } from '../../shared/measurements.js';
import { cameraViewKey, cameraPreciseViewKey } from './fogCameraTracker.js';
import { getOverlayContentRevision } from './derivedState.js';

const staticLayers = [];   // ordered arrays of { name, priority, render(ctx2d, state, camera, time) }
const vectorLayers = [];
const dynamicLayers = [];
const LAYER_GROUPS = { static: staticLayers, vector: vectorLayers, dynamic: dynamicLayers };

let _lastStaticCameraKey = null;
let _lastVectorCameraKey = null;
let _lastContentRevision = -1;
let _lastFogRevision = -1;
let _lastWidth = 0;
let _lastHeight = 0;

/**
 * Register a 2D overlay render callback with a sort key.
 * Lower priority values render first (back to front).
 * @param {string} name
 * @param {number} priority
 * @param {(ctx2d: CanvasRenderingContext2D, state: any, camera: any, time: number) => void} renderFn
 * @param {'static'|'vector'|'dynamic'} [tier='dynamic'] — redraw policy (see
 *   the module comment). `static` and `vector` layers must render identically
 *   for identical inputs; `dynamic` layers may animate with `time`.
 */
export function registerLayer(name, priority, renderFn, tier = 'dynamic') {
  const layer = { name, priority, render: renderFn };
  const list = LAYER_GROUPS[tier] || dynamicLayers;
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
 * Render the overlay stack. The fog canvas redraws only when the quantized
 * camera view, derived overlay data, fog revision, or canvas size changed; the
 * vector canvas uses the precise camera key instead, so its outlines re-project
 * every frame during a pan but stay cached while the camera is still; the
 * dynamic canvas is cleared and redrawn every frame.
 */
export function renderFrame(state, camera, time) {
  const staticCanvas = getOverlayCanvas();
  const vectorCanvas = getVectorOverlayCanvas();
  const dynamicCanvas = getDynamicOverlayCanvas();
  const staticCtx = getCtx2d();
  const vectorCtx = getVectorCtx2d();
  const dynamicCtx = getDynamicCtx2d();
  if (!staticCanvas || !vectorCanvas || !dynamicCanvas || !staticCtx || !vectorCtx || !dynamicCtx) return;

  const dpr = getOverlayDpr();
  const camKey = cameraViewKey(camera);
  const preciseCamKey = cameraPreciseViewKey(camera);
  const contentRevision = getOverlayContentRevision();
  const fogRevision = state._fogRevision || 0;

  const sizeChanged =
    staticCanvas.width !== _lastWidth ||
    staticCanvas.height !== _lastHeight;
  const dataChanged =
    contentRevision !== _lastContentRevision ||
    fogRevision !== _lastFogRevision;

  const staticDirty = sizeChanged || dataChanged || camKey !== _lastStaticCameraKey;
  const vectorDirty = sizeChanged || dataChanged || preciseCamKey !== _lastVectorCameraKey;

  if (staticDirty || vectorDirty) {
    _lastWidth = staticCanvas.width;
    _lastHeight = staticCanvas.height;
    _lastStaticCameraKey = camKey;
    _lastVectorCameraKey = preciseCamKey;
    _lastContentRevision = contentRevision;
    _lastFogRevision = fogRevision;
  }

  if (staticDirty) {
    staticCtx.clearRect(0, 0, staticCanvas.width / dpr, staticCanvas.height / dpr);
    renderLayerList(staticLayers, staticCtx, state, camera, time);
  }

  if (vectorDirty) {
    vectorCtx.clearRect(0, 0, vectorCanvas.width / dpr, vectorCanvas.height / dpr);
    renderLayerList(vectorLayers, vectorCtx, state, camera, time);
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
// (browsers may discard backing stores). Force a redraw on return.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    _lastStaticCameraKey = null;
    _lastVectorCameraKey = null;
    _lastContentRevision = -1;
    _lastFogRevision = -1;
  }
});
