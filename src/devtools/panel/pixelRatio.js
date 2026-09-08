/**
 * pixelRatio.js — Dev-only 3D pixel-ratio cycler.
 *
 * MAX_PIXEL_RATIO stays the shipped default (2); this lets the dev panel A/B a
 * lower drawing-buffer DPR against frame time without a rebuild. The 2D overlay
 * canvases keep their own independent cap (OVERLAY_MAX_DPR).
 *
 * Layer: dev/ — imports render/ scene context and params.
 */

import { getSceneContext } from '../../render/hexmap3d/sceneContext.js';

/** Cycled 3D pixel ratios (drawing-buffer DPR). */
const PIXEL_RATIOS = [1.0, 1.25, 1.5, 2.0];

/**
 * Advance to the next 3D pixel ratio, applying it to the live renderer.
 * Starts from the renderer's actual ratio so a scene rebuild stays in sync.
 * @returns {number} the new ratio
 */
export function cyclePixelRatio() {
  const ctx = getSceneContext();
  const renderer = ctx?.renderer;
  if (!renderer) return PIXEL_RATIOS[0];

  const current = renderer.getPixelRatio();
  const idx = PIXEL_RATIOS.indexOf(current);
  const next = PIXEL_RATIOS[(idx + 1) % PIXEL_RATIOS.length];

  // Re-apply the same logical size so the drawing buffer picks up the new
  // ratio; updateStyle stays false, so the canvas CSS size is untouched.
  const canvas = renderer.domElement;
  const logicalW = canvas.width / current;
  const logicalH = canvas.height / current;
  renderer.setPixelRatio(next);
  renderer.setSize(logicalW, logicalH, false);
  ctx.requestShadowUpdate?.();

  return next;
}
