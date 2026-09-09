// src/render/overlays/fogCameraTracker.js
// Camera view keys for overlay redraw gating. The quantized key drives the
// expensive fog masks (coarse enough to skip work during tiny pans); the
// precise key drives world-locked vector overlays (movement range, path
// preview), which must re-project whenever the camera actually moves but stay
// cached while it is still. Exposes a reset for use after camera animations
// finish.

import { CAMERA_HASH_PRECISION } from '../../params/render/overlayParams.js';

let _lastCameraKey = null;

/**
 * Quantized view key for a camera: position and orthographic vertical extent,
 * rounded to CAMERA_HASH_PRECISION. Pure — callers can compare keys across
 * frames without consuming any cache state.
 * @param {THREE.Camera} camera
 * @returns {string}
 */
export function cameraViewKey(camera) {
  const pos = camera.position;
  const frustum = camera.top - camera.bottom; // orthographic vertical extent
  return (
    Math.round(pos.x * CAMERA_HASH_PRECISION) + ',' +
    Math.round(pos.z * CAMERA_HASH_PRECISION) + ',' +
    Math.round(frustum * CAMERA_HASH_PRECISION)
  );
}

/**
 * Exact (unquantized) view key for world-locked vector overlays. Unlike the
 * quantized key, this changes on any camera movement, so vector layers
 * re-project every frame during a pan and stop once the camera settles.
 * Pure — callers can compare keys across frames without consuming cache state.
 * @param {THREE.Camera} camera
 * @returns {string}
 */
export function cameraPreciseViewKey(camera) {
  const pos = camera.position;
  const frustum = camera.top - camera.bottom; // orthographic vertical extent
  return pos.x + ',' + pos.z + ',' + frustum;
}

/**
 * Check whether the camera state has changed since the last mask generation.
 */
export function cameraHasChanged(camera) {
  const key = cameraViewKey(camera);
  if (key !== _lastCameraKey) {
    _lastCameraKey = key;
    return true;
  }
  return false;
}

/**
 * Reset the cached camera hash so the next call to generateFogMasks always
 * regenerates the masks. Used after camera animations finish, when the fog
 * mask cache might hold masks keyed to a slightly stale camera position
 * (due to the rounded camera hash not crossing a boundary during tiny
 * ease-out movements).
 */
export function resetFogMaskCameraHash() {
  _lastCameraKey = null;
}
