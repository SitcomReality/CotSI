// src/render/effects/fogOverlayLayer.js
// Unified screen-space fog overlay using destination-out compositing.
//
// Instead of drawing separate fog polygons per hex, this renders a single
// full-canvas dark rectangle and "punches holes" for visible/explored areas
// using precomputed blurred masks. The result: no elevation gaps, soft
// organic fog edges, and no visible distinction between unexplored and
// off-map terrain.

import { generateFogMasks } from './fogMaskGen.js';
import { getHumanView } from '../../game/vision.js';

// ---------------------------------------------------------------------------
// Tunable constants
// ---------------------------------------------------------------------------

// Opaque fog colour for unexplored / off-map regions
const FOG_BASE = 'rgba(8, 6, 2, 1.0)';

// Alpha used when punching the explored (but not visible) mask.
// 0.0 = fully transparent (same as visible), 1.0 = no punch at all.
// Values around 0.70 leave enough fog to indicate "you've been here" while
// still letting terrain faintly show through.
const EXPLORED_PUNCH_ALPHA = 0.70;

// Blur radius shared with fogMaskGen — kept here for discoverability.
// (The actual blur is applied inside fogMaskGen; this constant is for
//  documentation / tuning reference.)
const BLUR_RADIUS = 12;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render the unified fog overlay for this frame.
 *
 * Signature matches the generic layer contract:
 *   render(ctx2d, state, camera, time)
 *
 * @param {CanvasRenderingContext2D} ctx2d - The effects overlay 2D context
 * @param {Object} state - Game state
 * @param {THREE.Camera} camera - Active Three.js camera
 * @param {number} _time - Frame timestamp (unused)
 */
export function renderFogOverlay(ctx2d, state, camera, _time) {
  const canvas = ctx2d.canvas;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.width / dpr;
  const cssH = canvas.height / dpr;

  // 1. Get vision sets and generate the two mask canvases
  const { visible, explored } = getHumanView(state);
  const { visibleMask, exploredMask } = generateFogMasks(
    state,
    camera,
    canvas,
    visible,
    explored
  );

  // 2. Cover the entire canvas with opaque fog
  ctx2d.globalCompositeOperation = 'source-over';
  ctx2d.globalAlpha = 1.0;
  ctx2d.fillStyle = FOG_BASE;
  ctx2d.fillRect(0, 0, cssW, cssH);

  // 3. Punch semi-transparent holes for explored-but-not-visible hexes.
  //    destination-out removes from the fog proportionally to the source
  //    alpha, so a lower globalAlpha leaves a thinner residual fog.
  ctx2d.globalCompositeOperation = 'destination-out';
  ctx2d.globalAlpha = EXPLORED_PUNCH_ALPHA;
  ctx2d.drawImage(exploredMask, 0, 0);

  // 4. Punch fully-transparent holes for currently visible hexes.
  //    globalAlpha = 1.0 → complete removal, revealing the terrain fully.
  ctx2d.globalAlpha = 1.0;
  ctx2d.drawImage(visibleMask, 0, 0);

  // 5. Restore canvas state to defaults for subsequent layers
  ctx2d.globalCompositeOperation = 'source-over';
  ctx2d.globalAlpha = 1.0;
}