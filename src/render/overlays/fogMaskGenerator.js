// src/render/overlays/fogMaskGenerator.js
// Generates blurred offscreen mask canvases for the unified screen-space fog overlay.
//
// Phase 1: produces two offscreen canvases — visibleMask and exploredMask —
// with white hex polygons drawn into them. These masks will later be used by the
// main fog layer to "punch holes" into the full-screen dark overlay via
// destination-out compositing.

import { getHexCornersWorld } from './fogHexGeometry.js';
import { projectCorners, isOffScreen } from './fogProjection.js';
import { drawHexPoly } from './fogDrawing.js';
import { blurMaskInPlace } from './fogBlur.js';
import { ensureCanvases, getVisibleMaskCanvas, getExploredMaskCanvas } from './fogMaskCache.js';
import { cameraHasChanged, resetFogMaskCameraHash } from './fogCameraTracker.js';
import { startMeasure, endMeasure } from '../../shared/measurements.js';
import { FOG_BLUR_RADIUS } from '../../params/render/overlayParams.js';
import { hexKeysWithinCap } from '../../engine/rules/sightCull.js';

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
  startMeasure('fogMaskGen');

  const vCtx = getVisibleMaskCanvas().getContext('2d');
  const eCtx = getExploredMaskCanvas().getContext('2d');

  // Clear both masks to transparent (in CSS coords, after DPR transform)
  vCtx.clearRect(0, 0, cssW, cssH);
  eCtx.clearRect(0, 0, cssW, cssH);

  // Draw fog holes. Sight-cap culling: with the camera locked to the
  // champion's disc, nothing beyond the render cap can ever be on screen, so
  // only explored hexes inside the cap need holes. Iterate the cap disc
  // (≤91 hexes per living human) and membership-check the explored set —
  // inverting the loop keeps this O(cap), never O(explored) on a large map.
  // No living humans → empty cull set → spectator mode: reveal everything
  // materialized.
  const cullHexes = hexKeysWithinCap(state.champions);
  const culled = cullHexes.size > 0;
  const drawFogHex = (key) => {
    const tile = state.tiles[key];
    if (!tile) return;

    const isVisible = visible.has(key);
    const { top: topCorners, bottom: bottomCorners } = getHexCornersWorld(tile.q, tile.r, tile.terrain);

    const topPts = projectCorners(topCorners, camera, overlayCanvas);
    const bottomPts = projectCorners(bottomCorners, camera, overlayCanvas);

    // Need at least one valid projection that isn't off-screen
    const topOk = topPts && !isOffScreen(topPts, cssW, cssH);
    const botOk = bottomPts && !isOffScreen(bottomPts, cssW, cssH);
    if (!topOk && !botOk) return;

    const ctx = isVisible ? vCtx : eCtx;
    if (topOk) drawHexPoly(ctx, topPts);
    if (botOk) drawHexPoly(ctx, bottomPts);
  };

  if (culled) {
    for (const key of cullHexes) {
      if (explored.has(key)) drawFogHex(key);
    }
  } else {
    for (const key of explored) {
      drawFogHex(key);
    }
  }

  // Apply blur to both masks for soft edges.
  blurMaskInPlace(getVisibleMaskCanvas(), FOG_BLUR_RADIUS);
  blurMaskInPlace(getExploredMaskCanvas(), FOG_BLUR_RADIUS);

  endMeasure('fogMaskGen');
  return {
    visibleMask: getVisibleMaskCanvas(),
    exploredMask: getExploredMaskCanvas(),
  };
}
