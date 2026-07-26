/**
 * Hex-tile centering strategies for the orthographic camera.
 *
 * Each function positions the camera target on a given hex tile at a
 * specific zoom level or strategy (fit-map, sight-radius, fixed percentage).
 */

import { hexCenter } from '../hexWorldSpace.js';
import { fitCameraToMap } from './cameraZoomMath.js';

import { ZOOM_MIN_FRUSTUM, ZOOM_MAX_FRUSTUM, SIGHT_ZOOM_MARGIN, DEFAULT_REFERENCE_FRUSTUM } from '../../../params/render/cameraParams.js';

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
  const margin = SIGHT_ZOOM_MARGIN;
  const desiredWorld = sightExtent * margin;
  const desiredFrustum = sinPitch > 0.01
    ? desiredWorld * sinPitch
    : desiredWorld;

  state.frustumSize = Math.max(ZOOM_MIN_FRUSTUM, Math.min(
    state.maxFrustumSize ?? ZOOM_MAX_FRUSTUM,
    desiredFrustum
  ));
  state.targetX = hexCenter(q, r).x;
  state.targetZ = hexCenter(q, r).z;
}

/**
 * Center the camera on a hex tile at a fixed zoom percentage.
 * Zoom percentage is map-relative: 400% = 4× closer than the full-map view.
 * Clamped within the current min/max frustum bounds.
 * Uses `state.referenceFrustum` (set by fitCameraToMap) as the 100% anchor;
 * falls back to DEFAULT_REFERENCE_FRUSTUM when no reference is available.
 * @param {object} state - camera state
 * @param {number} q - hex column coordinate
 * @param {number} r - hex row coordinate
 * @param {number} zoomPercent - desired zoom level (e.g. 400 for 400%)
 */
export function centerOnHexWithFixedZoom(state, q, r, zoomPercent) {
  const ref = state.referenceFrustum ?? DEFAULT_REFERENCE_FRUSTUM;
  const desiredFrustum = (100 * ref) / zoomPercent;
  state.frustumSize = Math.max(ZOOM_MIN_FRUSTUM, Math.min(
    state.maxFrustumSize ?? ZOOM_MAX_FRUSTUM,
    desiredFrustum
  ));
  state.targetX = hexCenter(q, r).x;
  state.targetZ = hexCenter(q, r).z;
}

/**
 * Center the camera on a hex tile's world position, preserving the current
 * zoom level.
 * @param {object} state - camera state
 * @param {number} q - hex column coordinate
 * @param {number} r - hex row coordinate
 */
export function centerCameraOnHex(state, q, r) {
  const { x, z } = hexCenter(q, r);
  state.targetX = x;
  state.targetZ = z;
}
