import { PITCH_EPSILON, FALLBACK_MARGIN_FRACTION, PAN_MARGIN_CLAMP } from '../../../params/render/cameraParams.js';

/**
 * Pure pan and pan-bounds logic for the orthographic camera.
 *
 * Pan shifts the camera's target point in world-space XZ.
 * Pan bounds constrain the target to a rectangular region.
 */

/**
 * Pan: shift the target point by world-space deltas.
 * dx, dz are in the ground plane. Clamps to pan bounds if set.
 * @param {object} state - camera state
 * @param {number} dx - world-space X delta
 * @param {number} dz - world-space Z delta
 */
export function panCamera(state, dx, dz) {
  state.targetX += dx;
  state.targetZ += dz;

  // 1. Clamp to map-based pan bounds (if set)
  if (state.panBounds) {
    const { minX, maxX, minZ, maxZ } = state.panBounds;
    state.targetX = Math.max(minX, Math.min(maxX, state.targetX));
    state.targetZ = Math.max(minZ, Math.min(maxZ, state.targetZ));
  }

  // 2. Zoom-dependent constraint: the viewport at the current zoom must
  //    never extend beyond the viewport at maximum zoom-out from startCenter.
  //    At full zoom-out both viewports are equal → no panning allowed.
  //    At closer zoom the camera can pan within the max-zoom-out rectangle.
  if (state.startCenter && state.maxFrustumSize != null) {
    const halfPanX = (state.maxFrustumSize - state.frustumSize) * state.aspect / 2;
    const halfPanZ = (state.maxFrustumSize - state.frustumSize) / 2;
    if (halfPanX >= 0) {
      state.targetX = Math.max(
        state.startCenter.startX - halfPanX,
        Math.min(state.startCenter.startX + halfPanX, state.targetX)
      );
    }
    if (halfPanZ >= 0) {
      state.targetZ = Math.max(
        state.startCenter.startZ - halfPanZ,
        Math.min(state.startCenter.startZ + halfPanZ, state.targetZ)
      );
    }
  }
}

/**
 * Set the zoom-dependent pan constraint anchor to a world-space position.
 * The constraint takes effect on the next user-initiated pan (via panCamera)
 * or zoom (via zoomCamera). The current camera position is NOT snapped —
 * this allows animated camera pans to reach their target before the
 * constraint locks to the new anchor.
 * @param {object} state - camera state
 * @param {number} x - world-space X coordinate
 * @param {number} z - world-space Z coordinate
 */
export function setCameraStartCenter(state, x, z) {
  state.startCenter = { startX: x, startZ: z };
}

/**
 * Set pan bounds from a map radius, accounting for camera yaw and pitch.
 *
 * At max zoom-out, the rotated camera frustum on the ground extends beyond
 * the camera's center point. These bounds shrink the allowable center region
 * so the entire viewport stays within the map's axis-aligned extent.
 *
 * @param {object} state - camera state (must have maxFrustumSize, pitch, yaw, aspect)
 * @param {number} radius - map radius in hexes
 */
export function setPanBounds(state, radius) {
  // Map extent in world units (half-dimensions)
  const mapHalfW = Math.sqrt(3) * radius;
  const mapHalfH = 1.5 * radius;

  // How far the rotated frustum extends from center at max zoom-out
  let marginX = 0;
  let marginZ = 0;
  if (state.maxFrustumSize != null && state.pitch != null && state.yaw != null) {
    const halfW = (state.maxFrustumSize * state.aspect) / 2;
    const halfH = state.maxFrustumSize / 2;
    const sinPitch = Math.sin(state.pitch);
    const stretch = sinPitch > PITCH_EPSILON ? 1 / sinPitch : 1;
    const absCos = Math.abs(Math.cos(state.yaw));
    const absSin = Math.abs(Math.sin(state.yaw));
    marginX = halfW * absCos + halfH * absSin * stretch;
    marginZ = halfW * absSin + halfH * absCos * stretch;
  } else {
    // Fallback: 20% heuristic margin
    const fallback = Math.sqrt(3) * radius * FALLBACK_MARGIN_FRACTION;
    marginX = fallback;
    marginZ = fallback;
  }

  // Clamp margins so they don't exceed the map itself
  marginX = Math.min(marginX, mapHalfW * PAN_MARGIN_CLAMP);
  marginZ = Math.min(marginZ, mapHalfH * PAN_MARGIN_CLAMP);

  state.panBounds = {
    minX: -mapHalfW + marginX,
    maxX: mapHalfW - marginX,
    minZ: -mapHalfH + marginZ,
    maxZ: mapHalfH - marginZ,
  };
  // Clamp current position to new bounds
  panCamera(state, 0, 0);
}
