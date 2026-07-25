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
 * Any existing constraint is replaced; the current camera position is
 * immediately clamped to the new constraint.
 * @param {object} state - camera state
 * @param {number} x - world-space X coordinate
 * @param {number} z - world-space Z coordinate
 */
export function setCameraStartCenter(state, x, z) {
  state.startCenter = { startX: x, startZ: z };
  // Enforce the new constraint immediately
  panCamera(state, 0, 0);
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
