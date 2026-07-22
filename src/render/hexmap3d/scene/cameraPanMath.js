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
