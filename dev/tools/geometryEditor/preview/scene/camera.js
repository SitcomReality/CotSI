/**
 * camera.js — Preview orbit camera: the look-at target, the orbital
 * update from the shared orbit state, and the in-game camera reset.
 */
import * as THREE from '../../../../../src/vendor/three.module.js';
import { CAMERA_PITCH, CAMERA_YAW } from '../../../../../src/params/render/cameraParams.js';
import { viewport } from '../viewportState.js';

const TARGET = new THREE.Vector3(0, 0.35, 0);

/** Move the camera to the orbit position (theta / phi / radius from viewport.orbit). */
export function updateCamera() {
  const { theta, phi, radius } = viewport.orbit;
  viewport.camera.position.set(
    TARGET.x + radius * Math.sin(phi) * Math.cos(theta),
    TARGET.y + radius * Math.cos(phi),
    TARGET.z + radius * Math.sin(phi) * Math.sin(theta),
  );
  viewport.camera.lookAt(TARGET);
}

/**
 * Reset the orbit to the in-game camera angle (cameraParams: CAMERA_YAW 30°,
 * CAMERA_PITCH ≈51.4°). Both cameras are spherical around their target —
 * the game looks from (cos p·sin y, sin p, cos p·cos y) and the editor's
 * orbit from (sin φ·cos θ, cos φ, sin φ·sin θ) — so the same view direction
 * maps as phi = π/2 − pitch and theta = π/2 − yaw (NOT yaw: the editor's
 * theta is measured from +x, the game's yaw from +z). With this the reset
 * view is the true in-game angle, and "Use current camera view" (portrait
 * panel) reproduces the default portrait framing at reset. Zoom (radius)
 * and the preview target stay as the user left them.
 */
export function resetCamera() {
  viewport.orbit.theta = Math.PI / 2 - CAMERA_YAW;
  viewport.orbit.phi = Math.PI / 2 - CAMERA_PITCH;
  viewport.dirty = true;
}
