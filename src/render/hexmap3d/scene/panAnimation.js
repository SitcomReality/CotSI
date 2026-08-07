/**
 * Smooth camera pan animation using the shared clock scheduler.
 *
 * Animates the camera target from its current position to a hex tile's
 * position. Two motion styles share one cancellation slot:
 *
 * - `animateCenterOnHex`: fixed-duration cubic ease-out pan (used for the
 *   initial focus when a champion takes the stage).
 * - `chaseCameraToHex`: frame-rate independent exponential smoothing
 *   (a damped chase) — the camera glides toward the target with a brisk start
 *   that eases in, decoupled from any unit movement animation timing.
 */

import { getClock } from '../../../shared/clockScheduler.js';
import { resetFogMaskCameraHash } from '../../overlays/fogCameraTracker.js';
import { hexCenter } from '../hexWorldSpace.js';
import { PAN_ANIMATION_DURATION, CAMERA_CHASE_TAU, CAMERA_CHASE_EPSILON, CAMERA_CHASE_MAX_DT_MS } from '../../../params/render/cameraParams.js';

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
export function animateCenterOnHex(state, applyFn, q, r, duration = PAN_ANIMATION_DURATION) {
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

/**
 * Chase the camera toward a hex position with frame-rate independent
 * exponential smoothing (a damped chase). Preserves the current zoom level.
 *
 * Unlike `animateCenterOnHex`, there is no fixed duration — the camera
 * starts fast and eases into the target, settling just after a champion
 * movement lands. It is decoupled from movement-animation timing on purpose:
 * the camera and the champion should never move in rigid lock-step.
 *
 * If called while a previous pan animation is still running, the old one is
 * cancelled and the camera continues from its current position.
 *
 * @param {object} state - camera state
 * @param {function} applyFn - function to call each frame to sync the
 *                             Three.js camera (e.g. `ctx.applyCamera`)
 * @param {number} q - hex column coordinate
 * @param {number} r - hex row coordinate
 * @returns {void}
 */
export function chaseCameraToHex(state, applyFn, q, r) {
  // Cancel any in-flight animation first
  if (_panStopFn) {
    _panStopFn();
    _panStopFn = null;
  }

  const { x: toX, z: toZ } = hexCenter(q, r);
  if (Math.hypot(toX - state.targetX, toZ - state.targetZ) < CAMERA_CHASE_EPSILON) return;

  let lastTime = null;
  _panStopFn = getClock().onTick((timestamp) => {
    const now = timestamp ?? performance.now();
    const dtMs = lastTime == null ? 0 : Math.min(now - lastTime, CAMERA_CHASE_MAX_DT_MS);
    lastTime = now;

    if (dtMs > 0) {
      // Exponential approach factor: k = 1 - e^(-dt/tau). Frame-rate independent.
      const k = 1 - Math.exp(-(dtMs / 1000) / CAMERA_CHASE_TAU);
      state.targetX += (toX - state.targetX) * k;
      state.targetZ += (toZ - state.targetZ) * k;
    }
    applyFn();

    if (Math.hypot(toX - state.targetX, toZ - state.targetZ) < CAMERA_CHASE_EPSILON) {
      // Snap to the exact target to avoid floating-point drift, then
      // invalidate the fog mask camera hash so the overlay regenerates
      // masks from the final camera position on the next frame.
      state.targetX = toX;
      state.targetZ = toZ;
      applyFn();
      resetFogMaskCameraHash();
      _panStopFn();
      _panStopFn = null;
    }
  });
}
