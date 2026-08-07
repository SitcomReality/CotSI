/**
 * Pure zoom and fit-to-sight-disc logic for the orthographic camera.
 *
 * Zoom percentage is anchored to the sight-disc view: 100% = the full
 * render-cap disc framed (the champion's hex plus SIGHT_RENDER_CAP rings).
 * `referenceFrustum` (set by fitCameraToMap) anchors the percentage so the
 * same 400% zoom means the same visual framing on every map size.
 */

import { panCamera } from './cameraPanMath.js';

import { DEFAULT_FRUSTUM, ZOOM_MIN_FRUSTUM, ZOOM_MAX_FRUSTUM, SIGHT_ZOOM_MARGIN } from '../../../params/render/cameraParams.js';
import { SIGHT_RENDER_CAP } from '../../../params/game/championParams.js';

/**
 * Fit the camera to the sight-radius disc around a champion.
 *
 * The map can never be fully seen — the camera is locked to the champion and
 * max zoom-out is "just far enough" to frame the whole render-cap disc (the
 * champion's hex plus SIGHT_RENDER_CAP rings). `referenceFrustum` (the 100%
 * zoom anchor) means "the full sight view", so the zoom percentage stays
 * meaningful on maps of any size. Deliberately independent of the map's size
 * and position: the camera behaves identically everywhere on the map.
 *
 * NOTE: the visible ground extent equals `frustumSize / sin(pitch)`
 * (the orthographic frustum is foreshortened at the isometric angle).
 * To show a desired world extent we multiply by sin(pitch).
 * @param {object} state - camera state
 */
export function fitCameraToMap(state) {
  // World extent (diameter) of the render-cap disc in hexes
  const sightExtent = Math.sqrt(3) * SIGHT_RENDER_CAP * 2;

  // At the default pitch (~51°), the visible ground-plane extent
  // is frustumSize / sin(pitch). Frame the disc with the tight sight margin.
  const margin = SIGHT_ZOOM_MARGIN;
  const sinPitch = Math.sin(state.pitch);
  const refWorldExtent = sightExtent * margin;
  const referenceFrustum = sinPitch > 0.01 ? refWorldExtent * sinPitch : refWorldExtent;

  state.referenceFrustum = referenceFrustum;
  state.maxFrustumSize = Math.max(DEFAULT_FRUSTUM, Math.min(ZOOM_MAX_FRUSTUM, referenceFrustum));
  // Start at the reference (100% = full sight-disc view)
  state.frustumSize = Math.max(DEFAULT_FRUSTUM, Math.min(state.maxFrustumSize ?? ZOOM_MAX_FRUSTUM, referenceFrustum));
}

/**
 * Zoom: multiply frustum size by factor, clamped.
 * Uses the sight-disc-aware `maxFrustumSize` when available (set by fitCameraToMap).
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
