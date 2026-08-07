/**
 * Camera state creation and Three.js application for the 3D orthographic view.
 *
 * The camera is orthographic, positioned at a fixed isometric angle
 * (~50° pitch, looking from south-west). Only pan (reposition target)
 * and zoom (adjust frustum size) are allowed. No tilt or rotation.
 */

import { DEFAULT_FRUSTUM, CAMERA_PITCH, CAMERA_YAW, CAMERA_DISTANCE } from '../../../params/render/cameraParams.js';

/**
 * Camera yaw: horizontal rotation of the orthographic camera around the Y axis.
 * The camera looks from south-west (30°) toward north-east.
 *
 * This is the rotation that the minimap must account for to align its projection
 * with the 3D view. See `drawCameraIndicator()` in `minimapOverlayLayer.js` for
 * the canonical usage.
 */
export { CAMERA_YAW } from '../../../params/render/cameraParams.js';

/**
 * Create a fresh camera state object with default values.
 * @param {number} aspect - viewport width / height
 * @returns {object} camera state
 */
export function createCameraState(aspect) {
  return {
    frustumSize: DEFAULT_FRUSTUM,
    targetX: 0,
    targetZ: 0,
    aspect,
    pitch: CAMERA_PITCH,
    yaw: CAMERA_YAW,       // ~30° (south-west looking north-east)
    distance: CAMERA_DISTANCE,
    maxFrustumSize: null,   // set by fitCameraToMap — zoom upper bound
    referenceFrustum: null, // set by fitCameraToMap — anchors zoom percentage
    startCenter: null,      // { startX, startZ } — zoom-dependent pan constraint anchor
  };
}

/**
 * Update the Three.js camera to match our camera state.
 * Call this whenever state changes.
 * @param {import('three').OrthographicCamera} camera
 * @param {object} state
 */
export function applyCameraState(camera, state) {
  const { frustumSize, aspect, targetX, targetZ, pitch, yaw, distance } = state;

  // Update frustum
  camera.left   = -frustumSize * aspect / 2;
  camera.right  =  frustumSize * aspect / 2;
  camera.top    =  frustumSize / 2;
  camera.bottom = -frustumSize / 2;
  camera.updateProjectionMatrix();

  // Compute camera position from spherical coords around target
  // Y is up; camera orbits in XZ plane
  const camX = targetX + distance * Math.cos(pitch) * Math.sin(yaw);
  const camY = distance * Math.sin(pitch);
  const camZ = targetZ + distance * Math.cos(pitch) * Math.cos(yaw);

  camera.position.set(camX, camY, camZ);
  camera.lookAt(targetX, 0, targetZ);
}
