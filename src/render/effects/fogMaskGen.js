// src/render/effects/fogMaskGen.js
// Generates blurred offscreen mask canvases for the unified screen-space fog overlay.
//
// Phase 1: produces two offscreen canvases — visibleMask and exploredMask —
// with white hex polygons drawn into them. These masks will later be used by the
// main fog layer to "punch holes" into the full-screen dark overlay via
// destination-out compositing.

import { worldToScreen } from './projection.js';
import { tileTopY } from '../hexmap3d/hexmap3d-index.js';
import { hexCenter, hexCornersXZ } from '../hexmap3d/hexUtils.js';

// Soft-edge blur radius in CSS pixels. Tunable aesthetic constant.
const MASK_BLUR = 12;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generate 6 world-space corners for a hex, lifted to mask height.
 * Mirrors the logic in fogMistLayer.js.
 */
function getMaskCornersWorld(q, r, terrain) {
  const topY = tileTopY(terrain);
  const { x: cx, z: cz } = hexCenter(q, r);
  return hexCornersXZ(cx, cz).map(c => ({ x: c.x, y: topY, z: c.z }));
}

/**
 * Project a world-space corner array to screen points, filtering out nulls
 * (points behind the camera). Returns null if the polygon would be degenerate.
 */
function projectCorners(corners, camera, canvas) {
  const pts = [];
  for (const c of corners) {
    const sp = worldToScreen(c.x, c.y, c.z, camera, canvas);
    if (!sp) return null; // any point behind camera → skip whole hex
    pts.push(sp);
  }
  return pts.length >= 3 ? pts : null;
}

/**
 * Quick axis-aligned bounding-box test: returns true if all points are
 * outside the canvas CSS-pixel rect (far off-screen).
 * Canvas width/height are in physical pixels, so we divide by dpr to get
 * CSS-pixel bounds for comparison against screen coords from worldToScreen.
 */
function isOffScreen(pts, cssW, cssH) {
  // Use generous margin so that hexes just outside the viewport are still
  // drawn (avoids pop-in during panning). Blur will bleed anyway.
  const margin = 100;
  let allLeft = true, allRight = true, allTop = true, allBottom = true;
  for (const p of pts) {
    if (p.x > -margin) allLeft = false;
    if (p.x < cssW + margin) allRight = false;
    if (p.y > -margin) allTop = false;
    if (p.y < cssH + margin) allBottom = false;
    if (!allLeft && !allRight && !allTop && !allBottom) return false;
  }
  return true;
}

/**
 * Draw a single filled white hex polygon onto a 2D context.
 */
function drawHexPoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Cached offscreen canvases (reused across frames to avoid allocation)
// ---------------------------------------------------------------------------

let _visibleCanvas = null;
let _exploredCanvas = null;
let _lastDpr = 0;

function getMaskCanvas(w, h, dpr) {
  const c = document.createElement('canvas');
  c.width = w;      // physical pixels
  c.height = h;     // physical pixels
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS coords, rendered to physical
  return { canvas: c, ctx };
}

function ensureCanvases(physicalW, physicalH, dpr) {
  if (!_visibleCanvas || _visibleCanvas.width !== physicalW || _visibleCanvas.height !== physicalH || _lastDpr !== dpr) {
    const v = getMaskCanvas(physicalW, physicalH, dpr);
    _visibleCanvas = v.canvas;
    _lastDpr = dpr;
  }
  if (!_exploredCanvas || _exploredCanvas.width !== physicalW || _exploredCanvas.height !== physicalH) {
    const e = getMaskCanvas(physicalW, physicalH, dpr);
    _exploredCanvas = e.canvas;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
  ensureCanvases(physicalW, physicalH, dpr);

  const vCtx = _visibleCanvas.getContext('2d');
  const eCtx = _exploredCanvas.getContext('2d');

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
  // We use the 2D context filter property (GPU-accelerated in modern browsers).
  // The blur operates in physical pixels on the raw canvas buffer, so we
  // temporarily reset the transform, blur onto a temp canvas, then draw back.
  blurMaskInPlace(_visibleCanvas, MASK_BLUR);
  blurMaskInPlace(_exploredCanvas, MASK_BLUR);

  return {
    visibleMask: _visibleCanvas,
    exploredMask: _exploredCanvas,
  };
}

/**
 * Apply a Gaussian blur to a mask canvas in physical-pixel space.
 * The canvas has a DPR transform set on its context; we work around this by
 * resetting the transform on a temp canvas and doing the blur there.
 */
function blurMaskInPlace(canvas, radius) {
  if (radius <= 0) return;

  const w = canvas.width;
  const h = canvas.height;

  // Temp canvas at the same physical size, no DPR transform
  const temp = document.createElement('canvas');
  temp.width = w;
  temp.height = h;
  const tempCtx = temp.getContext('2d');

  // Draw the original canvas at physical resolution onto temp
  tempCtx.drawImage(canvas, 0, 0);

  // Blur temp onto itself via another intermediate (avoids in-place issues)
  const temp2 = document.createElement('canvas');
  temp2.width = w;
  temp2.height = h;
  const temp2Ctx = temp2.getContext('2d');
  temp2Ctx.filter = `blur(${radius}px)`;
  temp2Ctx.drawImage(temp, 0, 0);

  // Copy blurred result back to the original canvas, replacing its content at
  // the physical level. Clear first (reset DPR transform for raw pixel ops).
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(temp2, 0, 0);

  // Restore the DPR transform so subsequent CSS-coord draws still work
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}