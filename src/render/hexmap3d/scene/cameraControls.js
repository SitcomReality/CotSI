/**
 * Camera state and manipulation for the 3D orthographic view.
 *
 * The camera is orthographic, positioned at a fixed isometric angle
 * (~50° pitch, looking from south-west). Only pan (reposition target)
 * and zoom (adjust frustum size) are allowed. No tilt or rotation.
 */

import { hexCenter } from '../hexWorldSpace.js';

const DEFAULT_FRUSTUM = 8; // vertical world units visible at zoom=1
const MIN_FRUSTUM = 5;
const MAX_FRUSTUM = 300;

export function createCameraState(aspect) {
  return {
    frustumSize: DEFAULT_FRUSTUM,
    targetX: 0,
    targetZ: 0,
    aspect,
    pitch: Math.PI / 3.5,  // ~51°
    yaw: Math.PI / 6,       // ~30° (south-west looking north-east)
    distance: 50,           // camera distance from target (along look vector)
  };
}

/**
 * Update the Three.js camera to match our camera state.
 * Call this whenever state changes.
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

/**
 * Pan: shift the target point by world-space deltas.
 * dx, dz are in the ground plane. Clamps to pan bounds if set.
 */
export function panCamera(state, dx, dz) {
  state.targetX += dx;
  state.targetZ += dz;
  if (state.panBounds) {
    const { minX, maxX, minZ, maxZ } = state.panBounds;
    state.targetX = Math.max(minX, Math.min(maxX, state.targetX));
    state.targetZ = Math.max(minZ, Math.min(maxZ, state.targetZ));
  }
}

/**
 * Set pan bounds from a map radius.
 * @param {object} state - camera state
 * @param {number} radius - map radius in hexes
 */
export function setPanBounds(state, radius) {
  const extent = Math.sqrt(3) * radius * 1.0 * 1.2; // 20% margin
  state.panBounds = {
    minX: -extent,
    maxX: extent,
    minZ: -extent * 0.75,
    maxZ: extent * 0.75,
  };
  // Clamp current position to new bounds
  panCamera(state, 0, 0);
}

/**
 * Auto-fit the camera frustum to show the entire map.
 * Call on first init after the map radius is known.
 * @param {object} state - camera state
 * @param {number} radius - map radius in hexes
 */
export function fitCameraToMap(state, radius) {
  // Map extent in world units: max( width, height ) of the hex grid
  const mapWidth  = Math.sqrt(3) * radius * 2;  // ~3.46 * radius
  const mapHeight = 1.5 * radius * 2;           // 3 * radius
  const mapExtent = Math.max(mapWidth, mapHeight);

  // At the default pitch (~51°), the visible vertical span is frustumSize * sin(pitch).
  // We want the map to fit with a comfortable margin.
  const margin = 1.6;
  const visibleVertical = mapExtent * margin;
  const sinPitch = Math.sin(state.pitch);
  const desiredFrustum = sinPitch > 0.01 ? visibleVertical / sinPitch : visibleVertical;

  state.frustumSize = Math.max(DEFAULT_FRUSTUM, Math.min(MAX_FRUSTUM, desiredFrustum));
  state.targetX = 0;
  state.targetZ = 0;
  setPanBounds(state, radius);
}

/**
 * Zoom: multiply frustum size by factor, clamped.
 */
export function zoomCamera(state, factor) {
  state.frustumSize = Math.max(MIN_FRUSTUM, Math.min(MAX_FRUSTUM, state.frustumSize * factor));
}

/**
 * Reset to default view centered on origin.
 */
export function resetCamera(state) {
  state.frustumSize = DEFAULT_FRUSTUM;
  state.targetX = 0;
  state.targetZ = 0;
}

/**
 * Center the camera on a hex tile's world position.
 * @param {object} state - camera state
 * @param {number} q - hex column coordinate
 * @param {number} r - hex row coordinate
 */
export function centerCameraOnHex(state, q, r) {
  const { x, z } = hexCenter(q, r);
  state.targetX = x;
  state.targetZ = z;
}
