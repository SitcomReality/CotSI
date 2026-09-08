// src/render/overlays/fogCameraTracker.js
// Tracks camera position changes to determine whether cached fog masks need
// regeneration. Exposes a reset for use after camera animations finish.

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
