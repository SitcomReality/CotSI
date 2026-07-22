// src/render/overlays/fogCameraTracker.js
// Tracks camera position changes to determine whether cached fog masks need
// regeneration. Exposes a reset for use after camera animations finish.

let _lastCamTargetX = null;
let _lastCamTargetZ = null;
let _lastCamFrustum = null;

/**
 * Check whether the camera state has changed since the last mask generation.
 */
export function cameraHasChanged(camera) {
  // The camera's projection matrix and position define the view.
  const pos = camera.position;
  const frustum = camera.top - camera.bottom; // orthographic vertical extent

  // Hash the camera state into a rough comparison key
  const keyX = Math.round(pos.x * 10);
  const keyZ = Math.round(pos.z * 10);
  const keyF = Math.round(frustum * 10);

  if (keyX !== _lastCamTargetX || keyZ !== _lastCamTargetZ || keyF !== _lastCamFrustum) {
    _lastCamTargetX = keyX;
    _lastCamTargetZ = keyZ;
    _lastCamFrustum = keyF;
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
  _lastCamTargetX = null;
  _lastCamTargetZ = null;
  _lastCamFrustum = null;
}
