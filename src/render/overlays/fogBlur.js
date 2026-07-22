// src/render/overlays/fogBlur.js
// Gaussian blur for offscreen fog mask canvases, operating in physical-pixel
// space. The source canvases have a DPR transform set on their context, so the
// blur works around that by operating on temp canvases at raw pixel resolution.

// Cached temp canvases for blur (reused across frames to avoid allocation)
let _blurTemp = null;
let _blurTemp2 = null;

/**
 * Apply a Gaussian blur to a mask canvas in physical-pixel space.
 * The canvas has a DPR transform set on its context; we work around this by
 * resetting the transform on a temp canvas and doing the blur there.
 */
export function blurMaskInPlace(canvas, radius) {
  if (radius <= 0) return;

  const w = canvas.width;
  const h = canvas.height;

  // Reuse or create temp canvases at the same physical size
  if (!_blurTemp || _blurTemp.width !== w || _blurTemp.height !== h) {
    _blurTemp = document.createElement('canvas');
    _blurTemp.width = w;
    _blurTemp.height = h;
  }
  if (!_blurTemp2 || _blurTemp2.width !== w || _blurTemp2.height !== h) {
    _blurTemp2 = document.createElement('canvas');
    _blurTemp2.width = w;
    _blurTemp2.height = h;
  }

  const tempCtx = _blurTemp.getContext('2d');

  // Clear temp canvases so source-over compositing doesn't accumulate
  // polygons from previous frames when the source has transparent areas.
  tempCtx.clearRect(0, 0, w, h);

  // Draw the original canvas at physical resolution onto temp
  tempCtx.drawImage(canvas, 0, 0);

  // Blur temp onto itself via another intermediate (avoids in-place issues)
  const temp2Ctx = _blurTemp2.getContext('2d');
  temp2Ctx.clearRect(0, 0, w, h);
  temp2Ctx.filter = `blur(${radius}px)`;
  temp2Ctx.drawImage(_blurTemp, 0, 0);

  // Copy blurred result back to the original canvas, replacing its content at
  // the physical level. Clear first (reset DPR transform for raw pixel ops).
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(_blurTemp2, 0, 0);

  // Restore the DPR transform so subsequent CSS-coord draws still work
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
