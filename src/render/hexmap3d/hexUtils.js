// src/render/hexmap3d/hexUtils.js
// Shared hex geometry utilities used by terrain.js, fogOfWar.js, and 2D effects.

// World-space hex radius (maps from SVG's HEX_SIZE=30px to 3D units)
export const HEX_RADIUS = 1.0;

/**
 * Compute the center position of a hex in world space (XZ plane, Y is up).
 * Flat-top hex layout: x = sqrt(3) * (q + r/2), z = 1.5 * r
 */
export function hexCenter(q, r) {
  const x = Math.sqrt(3) * HEX_RADIUS * (q + r / 2);
  const z = 1.5 * HEX_RADIUS * r;
  return { x, z };
}

/**
 * Generate the 6 corner vertices of a pointy-top hex in the XZ plane.
 * Pointy-top: first corner at -30° offset from +x axis.
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