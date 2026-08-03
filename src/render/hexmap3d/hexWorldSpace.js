// src/render/hexmap3d/hexWorldSpace.js
// Shared hex→world-space geometry used by the terrain meshes, the 3D scene, and overlays.

// World-space hex radius (maps from SVG's HEX_SIZE=30px to 3D units)
export const HEX_RADIUS = 1.0;

/**
 * Compute the center position of a hex in world space (XZ plane, Y is up).
 * Pointy-top hex layout: x = sqrt(3) * (q + r/2), z = 1.5 * r
 */
export function hexCenter(q, r) {
  const x = Math.sqrt(3) * HEX_RADIUS * (q + r / 2);
  const z = 1.5 * HEX_RADIUS * r;
  return { x, z };
}

/**
 * Same as hexCenter but passes y through for 3D callers.
 */
export function hexCenter3D(q, r, y) {
  const { x, z } = hexCenter(q, r);
  return { x, y, z };
}

/**
 * Generate the 6 corner vertices of a pointy-top hex in the XZ plane.
 * Corners start at -30° offset from +x axis (top and bottom points).
 *
 * NOTE: The -30° offset (-π/6) is the **hex corner phase** — it rotates the
 * hexagon so that points face top/bottom. This is independent of the **camera
 * yaw** (CAMERA_YAW = +π/6 in cameraState.js), which rotates the 3D viewport.
 * They happen to share the same magnitude (30°) but serve different purposes
 * and may change independently.
 *
 * @param {number} cx - center x
 * @param {number} cz - center z
 * @param {number} [radius=HEX_RADIUS]
 * @returns {{ x: number, z: number }[]}
 */
export function hexCornersXZ(cx, cz, radius = HEX_RADIUS) {
  const verts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // -30°, 30°, 90°, ...
    verts.push({
      x: cx + radius * Math.cos(angle),
      z: cz + radius * Math.sin(angle),
    });
  }
  return verts;
}