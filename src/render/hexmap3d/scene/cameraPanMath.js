/**
 * Pure pan and pan-constraint logic for the orthographic camera.
 *
 * Pan shifts the camera's target point in world-space XZ. The only constraint
 * is the zoom-dependent window around startCenter (the champion's position) —
 * deliberately not map-based, so the camera behaves identically at every
 * position on the map.
 */

/**
 * Pan: shift the target point by world-space deltas.
 * dx, dz are in the ground plane. Constrained to the zoom-dependent window
 * around startCenter if set.
 * @param {object} state - camera state
 * @param {number} dx - world-space X delta
 * @param {number} dz - world-space Z delta
 */
export function panCamera(state, dx, dz) {
  state.targetX += dx;
  state.targetZ += dz;

  // Zoom-dependent constraint: the viewport at the current zoom must never
  // extend beyond the viewport at maximum zoom-out from startCenter. At full
  // zoom-out both viewports are equal → no panning allowed. At closer zoom the
  // camera can pan within the max-zoom-out rectangle.
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
