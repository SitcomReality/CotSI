/**
 * Pure zoom, fit-to-map, and camera-reset logic.
 *
 * Zoom percentage is map-relative: 100% = fit the full map in the viewport.
 * `referenceFrustum` (set by fitCameraToMap) anchors the percentage so the
 * same 400% zoom means the same visual framing on every map size.
 */

import { setPanBounds } from './cameraPanMath.js';

const DEFAULT_FRUSTUM = 6;
const MIN_FRUSTUM = 5;
const ABSOLUTE_MAX_FRUSTUM = 15; // hard ceiling: 3× MIN_FRUSTUM for an intimate close-up view

/**
 * Auto-fit the camera frustum to show the entire map.
 * Call on first init after the map radius is known.
 * Stores `mapRadius`, `maxFrustumSize`, and `referenceFrustum` on state so
 * zoomCamera clamps dynamically and the zoom display is map-relative.
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
  const refWorldExtent = mapExtent * margin;
  const referenceFrustum = sinPitch > 0.01 ? refWorldExtent * sinPitch : refWorldExtent;

  // Max zoom: generous margin so the user can zoom well out past the fit view.
  const maxMargin = 3.5;
  const maxWorldExtent = mapExtent * maxMargin;
  const maxDesired = sinPitch > 0.01 ? maxWorldExtent * sinPitch : maxWorldExtent;

  state.mapRadius = radius;
  state.referenceFrustum = referenceFrustum;
  state.maxFrustumSize = Math.max(DEFAULT_FRUSTUM, Math.min(ABSOLUTE_MAX_FRUSTUM, maxDesired));
  // Start at the reference (100% = full map view)
  state.frustumSize = Math.max(DEFAULT_FRUSTUM, Math.min(state.maxFrustumSize, referenceFrustum));
  state.targetX = 0;
  state.targetZ = 0;
  setPanBounds(state, radius);
}

/**
 * Zoom: multiply frustum size by factor, clamped.
 * Uses the map-aware `maxFrustumSize` when available (set by fitCameraToMap).
 * @param {object} state - camera state
 * @param {number} factor - zoom multiplier (>1 zooms out, <1 zooms in)
 */
export function zoomCamera(state, factor) {
  const maxFrustum = state.maxFrustumSize ?? ABSOLUTE_MAX_FRUSTUM;
  state.frustumSize = Math.max(MIN_FRUSTUM, Math.min(maxFrustum, state.frustumSize * factor));
}

/**
 * Reset to the fit-to-map view centered on origin.
 * Uses the stored mapRadius when available; otherwise falls back
 * to DEFAULT_FRUSTUM at origin.
 * @param {object} state - camera state
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
