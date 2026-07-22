/**
 * Camera state creation and Three.js application for the 3D orthographic view.
 *
 * The camera is orthographic, positioned at a fixed isometric angle
 * (~50° pitch, looking from south-west). Only pan (reposition target)
 * and zoom (adjust frustum size) are allowed. No tilt or rotation.
 */

const DEFAULT_FRUSTUM = 6; // vertical world units visible at zoom=1

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
    pitch: Math.PI / 3.5,  // ~51°
    yaw: Math.PI / 6,       // ~30° (south-west looking north-east)
    distance: 50,           // camera distance from target (along look vector)
    mapRadius: null,        // set by fitCameraToMap
    maxFrustumSize: null,   // set by fitCameraToMap — zoom upper bound
    referenceFrustum: null, // set by fitCameraToMap — anchors zoom percentage
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
