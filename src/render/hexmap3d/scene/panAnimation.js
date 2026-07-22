/**
 * Smooth camera pan animation using the shared clock scheduler.
 *
 * Animates the camera target from its current position to a hex tile's
 * position using cubic ease-out interpolation. Supports cancellation of
 * in-flight animations.
 */

import { getClock } from '../../../shared/clockScheduler.js';
import { resetFogMaskCameraHash } from '../../overlays/fogCameraTracker.js';
import { hexCenter } from '../hexWorldSpace.js';

/** Currently active camera pan animation stop function, if any. */
let _panStopFn = null;
/** Number of frames rendered in the current pan, for debug logging. */
let _panFrameCount = 0;

/**
 * Smoothly animate the camera to center on a hex position.
 * Uses an onTick callback for per-frame interpolation with cubic ease-out.
 * Preserves the current zoom level — only pans.
 *
 * If called while a previous pan animation is still running, the old one
 * is cancelled and the camera jumps to its final position immediately.
 *
 * @param {object} state - camera state
 * @param {function} applyFn - function to call each frame to sync the
 *                             Three.js camera (e.g. `ctx.applyCamera`)
 * @param {number} q - hex column coordinate
 * @param {number} r - hex row coordinate
 * @param {number} [duration=200] - animation duration in milliseconds
 * @returns {void}
 */
export function animateCenterOnHex(state, applyFn, q, r, duration = 200) {
  // Cancel any in-flight animation and snap to its target first
  if (_panStopFn) {
    _panStopFn();
    _panStopFn = null;
  }

  const { x: toX, z: toZ } = hexCenter(q, r);
  const fromX = state.targetX;
  const fromZ = state.targetZ;
  const startTime = performance.now();

  _panFrameCount = 0;

  _panStopFn = getClock().onTick((timestamp) => {
    const elapsed = timestamp - startTime;
    const t = Math.max(0, Math.min(elapsed / duration, 1));
    // Cubic ease-out: 1 - (1 - t)³
    const eased = 1 - Math.pow(1 - t, 3);

    state.targetX = fromX + (toX - fromX) * eased;
    state.targetZ = fromZ + (toZ - fromZ) * eased;
    applyFn();

    _panFrameCount++;

    if (t >= 1) {
      // Snap to exact final position to avoid floating-point drift
      state.targetX = toX;
      state.targetZ = toZ;
      applyFn();
      // Invalidate fog mask camera hash so the overlay regenerates masks
      // from the exact final camera position on the next frame.
      resetFogMaskCameraHash();
      _panStopFn();
      _panStopFn = null;
    }
  });
}

/**
 * Cancel any in-flight camera pan animation and snap to its current target.
 */
export function cancelCameraPan() {
  if (_panStopFn) {
    _panStopFn();
    _panStopFn = null;
  }
}
