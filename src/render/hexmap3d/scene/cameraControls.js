/**
 * Camera state and manipulation for the 3D orthographic view.
 *
 * The camera is orthographic, positioned at a fixed isometric angle
 * (~50° pitch, looking from south-west). Only pan (reposition target)
 * and zoom (adjust frustum size) are allowed. No tilt or rotation.
 *
 * Zoom percentage is map-relative: 100% = fit the full map in the viewport.
 * `referenceFrustum` (set by fitCameraToMap) anchors the percentage so the
 * same 400% zoom means the same visual framing on every map size.
 */

import { getClock } from '../../../shared/clockScheduler.js';
import { resetFogMaskCameraHash } from '../../overlays/fogMaskGenerator.js';
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
    referenceFrustum: null, // set by fitCameraToMap — anchors zoom percentage
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
 * Zoom percentage is map-relative: 400% = 4× closer than the full-map view.
 * Clamped within the current min/max frustum bounds.
 * Uses `state.referenceFrustum` (set by fitCameraToMap) as the 100% anchor;
 * falls back to hardcoded 40 when no reference is available.
 * @param {object} state - camera state
 * @param {number} q - hex column coordinate
 * @param {number} r - hex row coordinate
 * @param {number} zoomPercent - desired zoom level (e.g. 400 for 400%)
 */
export function centerOnHexWithFixedZoom(state, q, r, zoomPercent) {
  const ref = state.referenceFrustum ?? 40;
  const desiredFrustum = (100 * ref) / zoomPercent;
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

/** Currently active camera pan animation stop function, if any. */
let _panStopFn = null;

/**
 * Smoothly animate the camera to center on a hex position.
 * Uses an onTick callback for per-frame interpolation with cubic ease-out.
 * Preserves the current zoom level — only pans.
 *
 * If called while a previous pan animation is still running, the old one
 * is cancelled and the camera jumps to its final position immediately.
 *
 * @param {object} state - camera state
 * @param {function} applyFn - function to call each frame to sync the
 *                             Three.js camera (e.g. `ctx.applyCamera`)
 * @param {number} q - hex column coordinate
 * @param {number} r - hex row coordinate
 * @param {number} [duration=200] - animation duration in milliseconds
 */
export function animateCenterOnHex(state, applyFn, q, r, duration = 200) {
  // Cancel any in-flight animation and snap to its target first
  if (_panStopFn) {
    _panStopFn();
    _panStopFn = null;
  }

  const { x: toX, z: toZ } = hexCenter(q, r);
  const fromX = state.targetX;
  const fromZ = state.targetZ;
  const startTime = performance.now();

  _panStopFn = getClock().onTick((timestamp) => {
    const elapsed = timestamp - startTime;
    const t = Math.min(elapsed / duration, 1);
    // Cubic ease-out: 1 - (1 - t)³
    const eased = 1 - Math.pow(1 - t, 3);

    state.targetX = fromX + (toX - fromX) * eased;
    state.targetZ = fromZ + (toZ - fromZ) * eased;
    applyFn();

    if (t >= 1) {
      // Snap to exact final position to avoid floating-point drift
      state.targetX = toX;
      state.targetZ = toZ;
      applyFn();
      // Invalidate fog mask camera hash so the overlay regenerates masks
      // from the exact final camera position on the next frame.
      resetFogMaskCameraHash();
      _panStopFn();
      _panStopFn = null;
    }
  });
}

/**
 * Cancel any in-flight camera pan animation and snap to its current target.
 */
export function cancelCameraPan() {
  if (_panStopFn) {
    _panStopFn();
    _panStopFn = null;
  }
}
