// src/render/overlays/fogMaskCache.js
// Manages the two offscreen canvases (visibleMask, exploredMask) used by the
// fog mask generator, creating and resizing them as needed.

// Cached offscreen canvases (reused across frames to avoid allocation)
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

/**
 * Ensure both mask canvases exist and match the given physical dimensions and
 * DPR. Returns true if either canvas was resized (callers should invalidate
 * cached masks when this happens).
 */
export function ensureCanvases(physicalW, physicalH, dpr) {
  let resized = false;

  if (!_visibleCanvas || _visibleCanvas.width !== physicalW || _visibleCanvas.height !== physicalH || _lastDpr !== dpr) {
    const v = getMaskCanvas(physicalW, physicalH, dpr);
    _visibleCanvas = v.canvas;
    _lastDpr = dpr;
    resized = true;
  }
  if (!_exploredCanvas || _exploredCanvas.width !== physicalW || _exploredCanvas.height !== physicalH) {
    const e = getMaskCanvas(physicalW, physicalH, dpr);
    _exploredCanvas = e.canvas;
    resized = true;
  }

  return resized;
}

/** @returns {HTMLCanvasElement|null} */
export function getVisibleMaskCanvas() {
  return _visibleCanvas;
}

/** @returns {HTMLCanvasElement|null} */
export function getExploredMaskCanvas() {
  return _exploredCanvas;
}
