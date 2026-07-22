// src/render/overlays/fogMaskGenerator.js
// Generates blurred offscreen mask canvases for the unified screen-space fog overlay.
//
// Phase 1: produces two offscreen canvases — visibleMask and exploredMask —
// with white hex polygons drawn into them. These masks will later be used by the
// main fog layer to "punch holes" into the full-screen dark overlay via
// destination-out compositing.

import { getMaskCornersWorld } from './fogHexGeometry.js';
import { projectCorners, isOffScreen } from './fogProjection.js';
import { drawHexPoly } from './fogDrawing.js';
import { blurMaskInPlace } from './fogBlur.js';
import { ensureCanvases, getVisibleMaskCanvas, getExploredMaskCanvas } from './fogMaskCache.js';
import { cameraHasChanged, resetFogMaskCameraHash } from './fogCameraTracker.js';

// Soft-edge blur radius in CSS pixels. Tunable aesthetic constant.
const MASK_BLUR = 12;

// Fog revision tracking for cache invalidation
let _lastFogRevision = -1;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export { resetFogMaskCameraHash };

/**
 * Generate both visibility masks for the current frame.
 *
 * The returned canvases are sized identically to the effects overlay (same
 * physical-pixel dimensions) with the same DPR scale transform applied, so
 * coordinates from worldToScreen map 1:1.
 *
 * @param {Object} state    - Game state
 * @param {THREE.Camera} camera - Active Three.js camera
 * @param {HTMLCanvasElement} overlayCanvas - The effects overlay canvas (provides
 *   dimensions & DPR reference for projection).
 * @param {Set<string>} visible - Set of hex keys currently visible, from getHumanView
 * @param {Set<string>} explored - Set of hex keys ever explored, from getHumanView
 * @returns {{ visibleMask: HTMLCanvasElement, exploredMask: HTMLCanvasElement }}
 */
export function generateFogMasks(state, camera, overlayCanvas, visible, explored) {
  const physicalW = overlayCanvas.width;
  const physicalH = overlayCanvas.height;
  const dpr = window.devicePixelRatio || 1;
  const cssW = physicalW / dpr;
  const cssH = physicalH / dpr;

  // Resize canvases if needed; cache miss if resized
  const resized = ensureCanvases(physicalW, physicalH, dpr);
  if (resized) _lastFogRevision = -1;

  const fogRev = state._fogRevision || 0;

  // Cache hit: skip redraw if fog state and camera haven't changed
  const camChanged = cameraHasChanged(camera);
  if (fogRev === _lastFogRevision && !camChanged) {
    return {
      visibleMask: getVisibleMaskCanvas(),
      exploredMask: getExploredMaskCanvas(),
    };
  }
  _lastFogRevision = fogRev;

  const vCtx = getVisibleMaskCanvas().getContext('2d');
  const eCtx = getExploredMaskCanvas().getContext('2d');

  // Clear both masks to transparent (in CSS coords, after DPR transform)
  vCtx.clearRect(0, 0, cssW, cssH);
  eCtx.clearRect(0, 0, cssW, cssH);

  // Draw all explored hexes
  for (const [, tile] of Object.entries(state.tiles)) {
    const key = `${tile.q},${tile.r}`;
    if (!explored.has(key)) continue;

    const isVisible = visible.has(key);
    const corners = getMaskCornersWorld(tile.q, tile.r, tile.terrain);
    const pts = projectCorners(corners, camera, overlayCanvas);
    if (!pts || isOffScreen(pts, cssW, cssH)) continue;

    if (isVisible) {
      drawHexPoly(vCtx, pts);
    } else {
      // Explored but not currently visible
      drawHexPoly(eCtx, pts);
    }
  }

  // Apply blur to both masks for soft edges.
  blurMaskInPlace(getVisibleMaskCanvas(), MASK_BLUR);
  blurMaskInPlace(getExploredMaskCanvas(), MASK_BLUR);

  return {
    visibleMask: getVisibleMaskCanvas(),
    exploredMask: getExploredMaskCanvas(),
  };
}
