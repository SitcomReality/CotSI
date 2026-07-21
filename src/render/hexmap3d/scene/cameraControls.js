/**
 * Camera state and manipulation for the 3D orthographic view.
 *
 * The camera is orthographic, positioned at a fixed isometric angle
 * (~50° pitch, looking from south-west). Only pan (reposition target)
 * and zoom (adjust frustum size) are allowed. No tilt or rotation.
 *
 * Zoom is clamped per-map: `maxFrustumSize` is set by fitCameraToMap
 * so the user can never zoom out farther than what shows the whole
 * map with a comfortable margin.
 */

import { hexCenter } from '../hexWorldSpace.js';

const DEFAULT_FRUSTUM = 8; // vertical world units visible at zoom=1
const MIN_FRUSTUM = 5;
const ABSOLUTE_MAX_FRUSTUM = 300; // hard ceiling for safety

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
 * Also stores `mapRadius` and `maxFrustumSize` on state so zoomCamera
 * clamps dynamically rather than using a hard ceiling.
 *
 * NOTE: the visible ground extent equals `frustumSize / sin(pitch)`
 * (the orthographic frustum is foreshortened at the isometric angle).
 * To show a desired world extent we multiply by sin(pitch).
 * @param {object} state - camera state
 * @param {number} radius - map radius in hexes
 */
export function fitCameraToMap(state, radius) {
  // Map extent in world units: max( width, height ) of the hex grid
  const mapWidth  = Math.sqrt(3) * radius * 2;  // ~3.46 * radius
  const mapHeight = 1.5 * radius * 2;           // 3 * radius
  const mapExtent = Math.max(mapWidth, mapHeight);

  // At the default pitch (~51°), the visible ground-plane extent
  // is frustumSize / sin(pitch). We want the map to fit comfortably.
  const margin = 1.6;
  const sinPitch = Math.sin(state.pitch);
  const desiredWorldExtent = mapExtent * margin;
  const desiredFrustum = sinPitch > 0.01 ? desiredWorldExtent * sinPitch : desiredWorldExtent;

  // Max zoom: let the user zoom out further than the initial view.
  const maxMargin = 2.0;
  const maxWorldExtent = mapExtent * maxMargin;
  const maxDesired = sinPitch > 0.01 ? maxWorldExtent * sinPitch : maxWorldExtent;

  state.mapRadius = radius;
  state.maxFrustumSize = Math.max(DEFAULT_FRUSTUM, Math.min(ABSOLUTE_MAX_FRUSTUM, maxDesired));
  state.frustumSize = Math.max(DEFAULT_FRUSTUM, Math.min(state.maxFrustumSize, desiredFrustum));
  state.targetX = 0;
  state.targetZ = 0;
  setPanBounds(state, radius);
}

/**
 * Zoom: multiply frustum size by factor, clamped.
 * Uses the map-aware `maxFrustumSize` when available (set by fitCameraToMap).
 */
export function zoomCamera(state, factor) {
  const maxFrustum = state.maxFrustumSize ?? ABSOLUTE_MAX_FRUSTUM;
  state.frustumSize = Math.max(MIN_FRUSTUM, Math.min(maxFrustum, state.frustumSize * factor));
}

/**
 * Reset to the fit-to-map view centered on origin.
 * Uses the stored mapRadius when available; otherwise falls back
 * to DEFAULT_FRUSTUM at origin.
 */
export function resetCamera(state) {
  if (state.mapRadius != null) {
    fitCameraToMap(state, state.mapRadius);
  } else {
    state.frustumSize = DEFAULT_FRUSTUM;
    state.targetX = 0;
    state.targetZ = 0;
  }
}

/**
 * Center the camera on a hex tile and reset to the fit-to-map zoom level.
 * @param {object} state - camera state
 * @param {number} q - hex column coordinate
 * @param {number} r - hex row coordinate
 */
export function centerOnHexWithFitCamera(state, q, r) {
  if (state.mapRadius != null) {
    fitCameraToMap(state, state.mapRadius);
  }
  state.targetX = hexCenter(q, r).x;
  state.targetZ = hexCenter(q, r).z;
}

/**
 * Center the camera on a hex tile and zoom to frame the champion's sight
 * radius. This gives the player a tight, context-rich view of their
 * immediate surroundings at turn start.
 * @param {object} state - camera state
 * @param {number} q - hex column coordinate
 * @param {number} r - hex row coordinate
 * @param {number} sight - champion's sight distance in hexes
 */
export function centerOnHexWithSightZoom(state, q, r, sight) {
  // World extent of the sight radius (diameter in world units)
  const sightExtent = Math.sqrt(3) * sight * 2;
  const sinPitch = Math.sin(state.pitch);
  const margin = 1.4; // a bit tighter than full-map margin
  const desiredWorld = sightExtent * margin;
  const desiredFrustum = sinPitch > 0.01
    ? desiredWorld * sinPitch
    : desiredWorld;

  state.frustumSize = Math.max(DEFAULT_FRUSTUM, Math.min(
    state.maxFrustumSize ?? ABSOLUTE_MAX_FRUSTUM,
    desiredFrustum
  ));
  state.targetX = hexCenter(q, r).x;
  state.targetZ = hexCenter(q, r).z;
}

/**
 * Center the camera on a hex tile at a fixed zoom percentage.
 * Zoom percentage is defined as 100 × 40 / frustumSize, so 400% = frustum 10.
 * Clamped within the current min/max frustum bounds.
 * @param {object} state - camera state
 * @param {number} q - hex column coordinate
 * @param {number} r - hex row coordinate
 * @param {number} zoomPercent - desired zoom level (e.g. 400 for 400%)
 */
export function centerOnHexWithFixedZoom(state, q, r, zoomPercent) {
  const desiredFrustum = (100 * 40) / zoomPercent;
  state.frustumSize = Math.max(MIN_FRUSTUM, Math.min(
    state.maxFrustumSize ?? ABSOLUTE_MAX_FRUSTUM,
    desiredFrustum
  ));
  state.targetX = hexCenter(q, r).x;
  state.targetZ = hexCenter(q, r).z;
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
