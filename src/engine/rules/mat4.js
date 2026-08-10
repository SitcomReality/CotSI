/**
 * mat4.js — Minimal pure 4×4 matrix helpers (column-major, THREE convention).
 *
 * Column-major storage: element index = column * 4 + row, matching
 * THREE.Matrix4.elements, so a composed matrix can be fed straight to
 * `matrix.fromArray()` on the render side. A matrix applied to a vertex
 * multiplies on the left (`M * v`), so in a product `multiply(A, B)` the
 * right-hand matrix B transforms the vertex first — the same convention as
 * `THREE.Matrix4.multiplyMatrices`.
 *
 * Only what the descriptor record pipeline needs: identity, translation,
 * scale, rotation about an arbitrary axis (Rodrigues), rotation about Y, and
 * extracting the translation column. Pure functions, no mutation, no THREE.
 */

/** A new identity matrix (column-major 16 numbers). */
export function mat4Identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/** Translation matrix for (x, y, z). */
export function mat4Translation(x, y, z) {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

/** Non-uniform scale matrix. */
export function mat4Scale(sx, sy, sz) {
  return [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1];
}

/** Rotation about the Y axis by `angle` radians. */
export function mat4RotationY(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}

/**
 * Rotation about an arbitrary axis through the origin (Rodrigues). The axis is
 * a direction — magnitude is ignored, normalized here (matching the render's
 * setFromAxisAngle(normalize()) convention).
 * @param {{x: number, y: number, z: number}} axis - direction (unnormalized ok)
 * @param {number} angle - radians
 * @returns {number[]} column-major 4×4 rotation matrix
 */
export function mat4RotationAxisAngle(axis, angle) {
  const len = Math.hypot(axis.x, axis.y, axis.z) || 1;
  const ax = axis.x / len;
  const ay = axis.y / len;
  const az = axis.z / len;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * ax * ax + c,     t * ay * ax + s * az,  t * az * ax - s * ay,  0,
    t * ax * ay - s * az, t * ay * ay + c,      t * az * ay + s * ax,  0,
    t * ax * az + s * ay, t * ay * az - s * ax,  t * az * az + c,      0,
    0,                    0,                     0,                     1,
  ];
}

/**
 * Matrix product A · B. Right-hand B applies first (THREE convention).
 * @param {number[]} a - column-major 4×4
 * @param {number[]} b - column-major 4×4
 * @returns {number[]} column-major 4×4
 */
export function mat4Multiply(a, b) {
  const out = new Array(16);
  for (let col = 0; col < 4; col++) {
    const b0 = b[col * 4];
    const b1 = b[col * 4 + 1];
    const b2 = b[col * 4 + 2];
    const b3 = b[col * 4 + 3];
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] = a[row] * b0 + a[4 + row] * b1 + a[8 + row] * b2 + a[12 + row] * b3;
    }
  }
  return out;
}

/** The translation column of a column-major matrix, as { x, y, z }. */
export function mat4TranslationOf(m) {
  return { x: m[12], y: m[13], z: m[14] };
}
