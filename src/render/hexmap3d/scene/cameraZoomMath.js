/**
 * Pure zoom, fit-to-map, and camera-reset logic.
 *
 * Zoom percentage is map-relative: 100% = fit the full map in the viewport.
 * `referenceFrustum` (set by fitCameraToMap) anchors the percentage so the
 * same 400% zoom means the same visual framing on every map size.
 */

import { setPanBounds, panCamera } from './cameraPanMath.js';

import { DEFAULT_FRUSTUM, ZOOM_MIN_FRUSTUM, ZOOM_MAX_FRUSTUM, SIGHT_ZOOM_MARGIN } from '../../../params/render/cameraParams.js';
import { SIGHT_RENDER_CAP } from '../../../params/game/championParams.js';

/**
 * Fit the camera to the sight-radius disc around a champion.
 *
 * The map can never be fully seen — the camera is locked to the champion and
 * max zoom-out is "just far enough" to frame the whole render-cap disc (the
 * champion's hex plus SIGHT_RENDER_CAP rings). This replaces the old
 * fit-to-map framing: `referenceFrustum` (the 100% zoom anchor) now means
 * "the full sight view", so the zoom percentage stays meaningful on maps of
 * any size.
 *
 * NOTE: the visible ground extent equals `frustumSize / sin(pitch)`
 * (the orthographic frustum is foreshortened at the isometric angle).
 * To show a desired world extent we multiply by sin(pitch).
 * @param {object} state - camera state
 * @param {number} radius - map radius in hexes (kept for pan bounds only)
 */
export function fitCameraToMap(state, radius) {
  // World extent (diameter) of the render-cap disc in hexes
  const sightExtent = Math.sqrt(3) * SIGHT_RENDER_CAP * 2;

  // At the default pitch (~51°), the visible ground-plane extent
  // is frustumSize / sin(pitch). Frame the disc with the tight sight margin.
  const margin = SIGHT_ZOOM_MARGIN;
  const sinPitch = Math.sin(state.pitch);
  const refWorldExtent = sightExtent * margin;
  const referenceFrustum = sinPitch > 0.01 ? refWorldExtent * sinPitch : refWorldExtent;

  state.mapRadius = radius;
  state.referenceFrustum = referenceFrustum;
  state.maxFrustumSize = Math.max(DEFAULT_FRUSTUM, Math.min(ZOOM_MAX_FRUSTUM, referenceFrustum));
  // Start at the reference (100% = full sight-disc view)
  state.frustumSize = Math.max(DEFAULT_FRUSTUM, Math.min(state.maxFrustumSize ?? ZOOM_MAX_FRUSTUM, referenceFrustum));
  setPanBounds(state, radius);
}

/**
 * Zoom: multiply frustum size by factor, clamped.
 * Uses the map-aware `maxFrustumSize` when available (set by fitCameraToMap).
 * @param {object} state - camera state
 * @param {number} factor - zoom multiplier (>1 zooms out, <1 zooms in)
 */
export function zoomCamera(state, factor) {
  const maxFrustum = state.maxFrustumSize ?? ZOOM_MAX_FRUSTUM;
  state.frustumSize = Math.max(ZOOM_MIN_FRUSTUM, Math.min(maxFrustum, state.frustumSize * factor));
  // Re-clamp camera target: zooming out tightens the zoom-dependent constraint,
  // so the current pan position may need to be pulled back toward startCenter.
  panCamera(state, 0, 0);
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
