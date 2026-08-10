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
 * Only what the descriptor record pipeline + editor tooling need: identity,
 * translation, scale, rotation about an arbitrary axis (Rodrigues), rotation
 * about Y, extracting the translation column, and recovering a rotation's
 * axis/angle. Pure functions, no mutation, no THREE.
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

/**
 * The inverse of mat4RotationAxisAngle: recover the { axis, angle } of a pure
 * rotation matrix (upper-left 3×3 orthonormal, det 1). `angle` is in [0, π];
 * `axis` is a unit vector (for θ = 0 it defaults to +Y; for θ = π the sign of
 * the recovered axis is arbitrary — R(axis, π) = R(−axis, π)). The geometry
 * editor uses it to fold composed rotations back into a node's
 * localAxis/localAngle when nesting or ungrouping parts.
 */
export function mat4ToAxisAngle(m) {
  const trace = m[0] + m[5] + m[10];
  const angle = Math.acos(Math.min(1, Math.max(-1, (trace - 1) / 2)));
  const s = 2 * Math.sin(angle);
  if (Math.abs(s) > 1e-6) {
    return {
      axis: { x: (m[6] - m[9]) / s, y: (m[8] - m[2]) / s, z: (m[1] - m[4]) / s },
      angle,
    };
  }
  if (angle < 1e-6) return { axis: { x: 0, y: 1, z: 0 }, angle: 0 };
  // θ ≈ π: R = 2uuᵀ − I. Recover u from the largest diagonal entry (u_k² =
  // (R[k][k] + 1) / 2), then the other components from the off-diagonals
  // (R[i][k] = 2·u_i·u_k for i ≠ k).
  const diag = [m[0], m[5], m[10]];
  let k = 0;
  for (let i = 1; i < 3; i++) if (diag[i] > diag[k]) k = i;
  const u = [0, 0, 0];
  u[k] = Math.sqrt(Math.max(0, (diag[k] + 1) / 2));
  for (let i = 0; i < 3; i++) {
    if (i === k) continue;
    u[i] = m[k * 4 + i] / (2 * u[k]);
  }
  const len = Math.hypot(u[0], u[1], u[2]) || 1;
  return { axis: { x: u[0] / len, y: u[1] / len, z: u[2] / len }, angle };
}
